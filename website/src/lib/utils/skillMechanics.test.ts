import { describe, expect, test } from "vitest";
import type { Caster, SkillDetailView, SkillPet } from "$lib/types/skills";
import { computeMechanicsSpec } from "./skillMechanics";

const player = (classId: string): Caster => ({ kind: "player", classId });
const mercenary = (className: string): Caster => ({
  kind: "mercenary",
  className,
});

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
        casters: [player("bard")],
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
      { casters: [player("bard")], bonusAttrKind: "cha" },
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
        casters: [player("warrior")],
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
      { casters: [player("bard")], formula: "bard_final_cadence" },
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
        casters: [mercenary("Bard")],
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
      { casters: [mercenary("Bard")], formula: "bard_final_cadence_merc" },
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
        casters: [player("ranger"), player("necromancer")],
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
        casters: [player("ranger"), mercenary("Ranger")],
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
    { casters: [{ kind: "monster" }], bonusKind: "none", canCrit: true },
  ]);
});

describe("effect caster dispatch", () => {
  test("cleanses have no debuff scaling even when exported with debuff flags and bonuses", () => {
    expect(
      computeMechanicsSpec(
        bardSkill({
          skill_type: "target_debuff",
          is_cleanse: true,
          magic_resist_bonus: { base_value: 50, bonus_per_level: 50 },
        }),
        [],
        false,
      ).debuffContexts,
    ).toEqual([]);
  });

  test("only area relics use character level; target relics use each class's buff attribute", () => {
    const relic = bardSkill({
      is_bard_song: false,
      scales_with_charisma: false,
      is_relic: true,
      player_classes: [],
    });
    expect(
      computeMechanicsSpec(relic, [], false).buffContexts[0].bonusAttrSource,
    ).toBe("player_level");
    const targeted = computeMechanicsSpec(
      { ...relic, skill_type: "target_buff" },
      [],
      false,
    );
    expect(
      targeted.buffContexts.map((context) => context.bonusAttrSource),
    ).toEqual(["player_wis", "player_ranger_wis"]);
    expect(
      targeted.buffContexts.flatMap((context) => context.casters),
    ).toContainEqual(player("ranger"));
  });

  test("scroll heals include every player class, including the Ranger bonus", () => {
    const spec = computeMechanicsSpec(
      bardSkill({
        skill_type: "target_heal",
        is_scroll: true,
        is_mercenary_skill: true,
        player_classes: [],
        can_heal_others: true,
      }),
      [],
      false,
    );
    expect(spec.healContexts.map((context) => context.bonusKind)).toEqual([
      "player_other",
      "player_ranger",
    ]);
    expect(spec.healContexts.every((context) => context.canCrit)).toBe(true);
  });

  test("unscaled debuff casters only appear beside a player or mercenary comparison", () => {
    const debuff = bardSkill({
      skill_type: "target_debuff",
      is_bard_song: false,
      scales_with_charisma: false,
      player_classes: [],
      defense_bonus: { base_value: -50, bonus_per_level: 0 },
    });
    expect(computeMechanicsSpec(debuff, [], true).debuffContexts).toEqual([]);
    expect(
      computeMechanicsSpec(debuff, [bardMercenary], true).debuffContexts,
    ).toEqual([
      { casters: [mercenary("Bard")], bonusAttrKind: "int" },
      { casters: [{ kind: "monster" }], bonusAttrKind: "none" },
    ]);
  });

  test("a companion pet scales a Charisma debuff with its own Charisma, a monster does not", () => {
    const debuff = bardSkill({
      skill_type: "target_debuff",
      is_bard_song: false,
      scales_with_charisma: true,
      player_classes: [],
      defense_bonus: { base_value: -50, bonus_per_level: 0 },
    });
    const companion = { ...bardMercenary, is_mercenary: false };
    expect(
      computeMechanicsSpec(debuff, [companion], true).debuffContexts,
    ).toEqual([
      { casters: [{ kind: "companion" }], bonusAttrKind: "cha" },
      { casters: [{ kind: "monster" }], bonusAttrKind: "none" },
    ]);
  });

  test("scroll-only damage skills have a player context and procs respect equipment class restrictions", () => {
    const attack = bardSkill({
      skill_type: "target_projectile",
      is_bard_song: false,
      player_classes: [],
      damage_type: "Fire",
    });
    expect(
      computeMechanicsSpec({ ...attack, is_scroll: true }, [], false)
        .damageContexts,
    ).toEqual([{ casters: [{ kind: "any_player" }], formula: "magic_spell" }]);
    expect(
      computeMechanicsSpec(attack, [], false, true, ["ranger"]).damageContexts,
    ).toEqual([{ casters: [player("ranger")], formula: "magic_spell" }]);
    expect(
      computeMechanicsSpec(attack, [], false, true, []).damageContexts,
    ).toEqual([]);
  });
});
