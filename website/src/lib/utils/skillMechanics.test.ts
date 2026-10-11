import { describe, expect, test } from "vitest";
import type { SkillDetailView, SkillPet } from "$lib/types/skills";
import { computeMechanicsSpec } from "./skillMechanics";

function bardSkill(overrides: Partial<SkillDetailView>): SkillDetailView {
  return {
    id: "bard_skill",
    player_classes: ["bard"],
    skill_type: "area_buff",
    is_bard_song: true,
    scales_with_charisma: true,
    is_bard_final_cadence: false,
    is_spell: true,
    is_manaburn_skill: false,
    is_melee_debuff: false,
    is_poison_debuff: false,
    is_disease_debuff: false,
    is_mercenary_skill: false,
    is_pet_skill: false,
    is_relic: false,
    followup_default_attack: false,
    ...overrides,
  } as SkillDetailView;
}

const bardMercenary: SkillPet = {
  id: "bard_mercenary",
  name: "Bard Mercenary",
  is_mercenary: true,
  is_familiar: false,
  type_monster: "Bard",
};

describe("Bard mechanics contexts", () => {
  test("uses Charisma for scaled buff songs", () => {
    const spec = computeMechanicsSpec(
      bardSkill({
        accuracy_bonus: { base_value: 0.02, bonus_per_level: 0.02 },
      }),
      [],
      false,
    );

    expect(spec.buffContexts).toEqual([
      {
        casterLabels: ["Bard (player)"],
        bonusAttrSource: "player_cha",
        isAreaBuff: true,
      },
    ]);
  });

  test("does not claim Charisma scaling for song speed", () => {
    const spec = computeMechanicsSpec(
      bardSkill({ speed_bonus: { base_value: 1, bonus_per_level: 0 } }),
      [],
      false,
    );

    expect(spec.buffContexts).toEqual([]);
  });

  test("does not scale fields that bypass Charisma in Buff", () => {
    const spec = computeMechanicsSpec(
      bardSkill({
        mana_max_percent_bonus: { base_value: 0.1, bonus_per_level: 0 },
        heal_on_hit_percent: { base_value: 0.1, bonus_per_level: 0 },
        damage_shield: { base_value: 10, bonus_per_level: 0 },
      }),
      [],
      false,
    );

    expect(spec.buffContexts).toEqual([]);
  });

  test("detects percentage-only debuff song scaling", () => {
    const spec = computeMechanicsSpec(
      bardSkill({
        skill_type: "area_debuff",
        damage_percent_bonus: { base_value: -0.02, bonus_per_level: -0.02 },
      }),
      [],
      false,
    );

    expect(spec.debuffContexts).toEqual([
      { casterLabels: ["Bard (player)"], bonusAttrKind: "cha" },
    ]);
  });

  test("uses Charisma in Leadership's mercenary buff attribute", () => {
    const spec = computeMechanicsSpec(
      bardSkill({
        id: "leadership",
        player_classes: ["warrior"],
        is_bard_song: false,
        scales_with_charisma: false,
        is_mercenary_skill: true,
        damage_bonus: { base_value: 30, bonus_per_level: 30 },
      }),
      [],
      false,
    );

    expect(spec.buffContexts).toEqual([
      {
        casterLabels: ["Warrior (player)"],
        bonusAttrSource: "player_wis_con_cha_half",
        isAreaBuff: true,
      },
    ]);
  });

  test("uses the custom Final Cadence damage formula", () => {
    const spec = computeMechanicsSpec(
      bardSkill({
        id: "final_cadence",
        skill_type: "area_damage",
        is_bard_song: false,
        scales_with_charisma: false,
        is_bard_final_cadence: true,
        damage_type: "Magic",
        damage: { base_value: 3000, bonus_per_level: 0 },
      }),
      [],
      false,
    );

    expect(spec.damageContexts).toEqual([
      { casterLabels: ["Bard (player)"], formula: "bard_final_cadence" },
    ]);
  });

  test("uses the mercenary's Charisma for Bard mercenary songs", () => {
    const spec = computeMechanicsSpec(
      bardSkill({
        id: "mercenary_anthem_of_focus",
        player_classes: [],
        is_mercenary_skill: true,
        accuracy_bonus: { base_value: 0.01, bonus_per_level: 0.005 },
      }),
      [bardMercenary],
      false,
    );

    expect(spec.buffContexts).toEqual([
      {
        casterLabels: ["Bard mercenary"],
        bonusAttrSource: "merc_cha",
        isAreaBuff: true,
      },
    ]);
  });

  test("uses the Final Cadence formula for a Bard mercenary", () => {
    const spec = computeMechanicsSpec(
      bardSkill({
        id: "mercenary_final_cadence",
        player_classes: [],
        skill_type: "area_damage",
        is_bard_song: false,
        scales_with_charisma: false,
        is_bard_final_cadence: true,
        is_mercenary_skill: true,
        damage_type: "Magic",
        damage: { base_value: 150, bonus_per_level: 150 },
      }),
      [bardMercenary],
      false,
    );

    expect(spec.damageContexts).toEqual([
      { casterLabels: ["Bard mercenary"], formula: "bard_final_cadence_merc" },
    ]);
  });
});

describe("Intelligence and combat-pet mechanics", () => {
  test("selects Intelligence for targeted, area and mercenary buffs with Ranger tripling only on targeted buffs", () => {
    const skill = bardSkill({
      is_bard_song: false,
      scales_with_charisma: false,
      scales_with_intelligence: true,
      player_classes: ["ranger", "necromancer"],
      skill_type: "target_buff",
    });
    expect(
      computeMechanicsSpec(skill, [bardMercenary], false).buffContexts.map(
        (c) => c.bonusAttrSource,
      ),
    ).toEqual(["player_ranger_int", "player_int", "merc_int"]);
    expect(
      computeMechanicsSpec({ ...skill, skill_type: "area_buff" }, [], false)
        .buffContexts,
    ).toEqual([
      {
        casterLabels: ["Ranger (player)", "Necromancer (player)"],
        bonusAttrSource: "player_int",
        isAreaBuff: true,
      },
    ]);
  });

  test("selects Intelligence for flagged poison/disease, preserving melee and Charisma priority", () => {
    const skill = bardSkill({
      skill_type: "target_debuff",
      is_bard_song: false,
      scales_with_charisma: false,
      is_disease_debuff: true,
      poison_disease_scales_with_intelligence: true,
      healing_per_second_bonus: { base_value: -10, bonus_per_level: 0 },
    });
    expect(
      computeMechanicsSpec(skill, [], false).debuffContexts[0].bonusAttrKind,
    ).toBe("int");
    expect(
      computeMechanicsSpec(
        { ...skill, poison_disease_scales_with_intelligence: false },
        [],
        false,
      ).debuffContexts[0].bonusAttrKind,
    ).toBe("dex");
    expect(
      computeMechanicsSpec({ ...skill, is_melee_debuff: true }, [], false)
        .debuffContexts[0].bonusAttrKind,
    ).toBe("str");
    expect(
      computeMechanicsSpec({ ...skill, scales_with_charisma: true }, [], false)
        .debuffContexts[0].bonusAttrKind,
    ).toBe("cha");
  });

  test("does not apply generic Wisdom healing to Death Bloom", () => {
    expect(
      computeMechanicsSpec(
        bardSkill({
          skill_type: "target_heal",
          is_necromancer_death_bloom: true,
        }),
        [],
        false,
      ).healContexts,
    ).toEqual([]);
  });

  test("haste reduces combat-pet skill 0 cooldown, not familiar or secondary-skill cooldown", () => {
    const skill = bardSkill({
      skill_type: "target_damage",
      is_spell: false,
      player_classes: [],
    });
    const pet = { ...bardMercenary, is_mercenary: false, skill_index: 0 };
    expect(
      computeMechanicsSpec(skill, [pet], false).timingContexts[0].model,
    ).toBe("companion_auto");
    expect(
      computeMechanicsSpec(
        { ...skill, followup_default_attack: true },
        [{ ...pet, is_familiar: true }],
        false,
      ).timingContexts[0].model,
    ).toBe("companion");
    expect(
      computeMechanicsSpec(
        { ...skill, followup_default_attack: true },
        [{ ...pet, skill_index: 1 }],
        false,
      ).timingContexts[0].model,
    ).toBe("companion");
  });

  test("monster spell cooldowns are flat while non-spells use haste", () => {
    const skill = bardSkill({
      followup_default_attack: true,
      player_classes: [],
    });
    expect(computeMechanicsSpec(skill, [], true).timingContexts[0].model).toBe(
      "monster_spell",
    );
    expect(
      computeMechanicsSpec({ ...skill, is_spell: false }, [], true)
        .timingContexts[0].model,
    ).toBe("monster");
  });
});

describe("damage handler dispatch", () => {
  test("elemental bow projectiles use Magic Damage before the ranged branch", () => {
    const spec = computeMechanicsSpec(
      bardSkill({
        skill_type: "target_projectile",
        damage_type: "Magic",
        required_weapon_category: "Bow",
        player_classes: ["ranger"],
      }),
      [{ ...bardMercenary, type_monster: "Ranger" }],
      false,
    );
    expect(spec.damageContexts).toEqual([
      {
        casterLabels: ["Ranger (player)", "Ranger mercenary"],
        formula: "magic_spell",
      },
    ]);
  });
  test("Poison area and frontal damage do not give Rogue mercenaries a poison bonus", () => {
    const pet = { ...bardMercenary, type_monster: "Rogue" };
    expect(
      computeMechanicsSpec(
        bardSkill({
          skill_type: "area_damage",
          damage_type: "Poison",
          player_classes: ["rogue"],
        }),
        [pet],
        true,
      ).damageContexts.map((context) => context.formula),
    ).toEqual(["normal", "monster_melee"]);
    expect(
      computeMechanicsSpec(
        bardSkill({
          skill_type: "frontal_damage",
          damage_type: "Poison",
          player_classes: ["rogue"],
        }),
        [pet],
        true,
      ).damageContexts.map((context) => context.formula),
    ).toEqual(["poison_rogue", "normal", "monster_melee"]);
  });
  test("frontal projectiles give a player Ranger priority, but mercenary elemental shots stay magical", () => {
    expect(
      computeMechanicsSpec(
        bardSkill({
          skill_type: "frontal_projectiles",
          damage_type: "Magic",
          player_classes: ["ranger"],
        }),
        [{ ...bardMercenary, type_monster: "Ranger" }],
        true,
      ).damageContexts.map((context) => context.formula),
    ).toEqual(["ranged_player_frontal", "magic_spell", "monster_magic"]);
  });
  test("Rogue frontal attacks do not use the single-target off-hand deduction", () => {
    expect(
      computeMechanicsSpec(
        bardSkill({
          skill_type: "frontal_damage",
          damage_type: "Physical",
          player_classes: ["rogue"],
        }),
        [],
        false,
      ).damageContexts[0].formula,
    ).toBe("normal");
  });
  test("non-spell elemental monsters use Magic Damage, Poison depends on the handler", () => {
    expect(
      computeMechanicsSpec(
        bardSkill({
          skill_type: "target_damage",
          damage_type: "Fire",
          is_spell: false,
          player_classes: [],
        }),
        [],
        true,
      ).damageContexts[0].formula,
    ).toBe("monster_magic");
    expect(
      computeMechanicsSpec(
        bardSkill({
          skill_type: "target_damage",
          damage_type: "Poison",
          player_classes: [],
        }),
        [],
        true,
      ).damageContexts[0].formula,
    ).toBe("monster_magic");
  });
  test("only the matching player resource-burn handlers consume a resource", () => {
    expect(
      computeMechanicsSpec(
        bardSkill({
          skill_type: "target_projectile",
          is_manaburn_skill: true,
          player_classes: ["wizard"],
        }),
        [bardMercenary],
        false,
      ).damageContexts.map((context) => context.formula),
    ).toEqual(["manaburn", "normal"]);
  });
});

test("area healing rolls for critical healing without can_heal_others", () => {
  const spec = computeMechanicsSpec(
    bardSkill({ skill_type: "area_heal", can_heal_others: false }),
    [],
    false,
  );
  expect(spec.healContexts[0].canCrit).toBe(true);
});

test("monster healing follows the same critical gate without receiving a Wisdom bonus", () => {
  const spec = computeMechanicsSpec(
    bardSkill({
      skill_type: "area_heal",
      can_heal_others: false,
      player_classes: [],
    }),
    [],
    true,
  );
  expect(spec.healContexts).toEqual([
    { casterLabels: ["Monster or NPC"], bonusKind: "none", canCrit: true },
  ]);
});
