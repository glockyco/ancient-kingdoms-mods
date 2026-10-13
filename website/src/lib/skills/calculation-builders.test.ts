import { describe, expect, test } from "vitest";
import type { Calculation } from "$lib/types/calculation";
import type {
  Caster,
  DamageFormulaKind,
  SkillDetailView,
} from "$lib/types/skills";
import {
  damageCalculation,
  cadenceCalculation,
  charmDamageCalculation,
  calculationCasters,
} from "./damage-calculations";
import {
  aggroCalculation,
  effectScalingCalculation,
  healingCalculation,
} from "./effect-calculations";

function skill(overrides: Partial<SkillDetailView> = {}): SkillDetailView {
  return {
    id: "test_skill",
    player_classes: ["warrior"],
    max_level: 20,
    skill_type: "target_damage",
    damage: { base_value: 0, bonus_per_level: 0 },
    damage_percent: { base_value: 1.5, bonus_per_level: 0 },
    cast_time: { base_value: 1, bonus_per_level: 0 },
    cooldown: { base_value: 2, bonus_per_level: 0 },
    ...overrides,
  } as SkillDetailView;
}
function resultNumbers(
  calculation: Calculation,
  overrides: Record<string, number> = {},
): number[] {
  const values = Object.fromEntries(
    (calculation.inputs ?? []).map((input) => [input.key, input.value]),
  );
  const result = calculation.example!({ ...values, ...overrides }).result;
  return Array.from(result.matchAll(/-?\d+(?:,\d{3})*(?:\.\d+)?/g), (match) =>
    Number(match[0].replaceAll(",", "")),
  );
}
const player = (classId: string): Caster => ({ kind: "player", classId });
const mercenary = (className: string): Caster => ({
  kind: "mercenary",
  className,
});
const monster: Caster = { kind: "monster" };

function damage(
  kind: DamageFormulaKind,
  caster: Caster,
  overrides: Partial<SkillDetailView> = {},
): Calculation {
  return damageCalculation(
    skill(overrides),
    { formula: kind, casters: [caster] },
    [caster],
  );
}

describe("skill damage calculations", () => {
  test.each([
    ["normal", player("warrior"), { damage: 201 }, 302],
    ["magic_spell", player("wizard"), { magicDamage: 201 }, 302],
    ["ranger_melee", player("ranger"), { damage: 201, bowDamage: 30 }, 256],
    ["rogue_melee", player("rogue"), { damage: 201, offhandDamage: 31 }, 278],
    ["rogue_melee_merc", mercenary("Rogue"), { damage: 201 }, 302],
    [
      "ranged_player",
      player("ranger"),
      { damage: 201, dexterity: 3, meleeDamage: 30 },
      262,
    ],
    [
      "ranged_player_frontal",
      player("ranger"),
      { damage: 201, dexterity: 3 },
      206,
    ],
    ["ranged_merc", mercenary("Ranger"), { damage: 201, dexterity: 3 }, 308],
    [
      "poison_rogue",
      player("rogue"),
      { damage: 201, dexterity: 3, offhandDamage: 31 },
      290,
    ],
    ["magic_weapon", player("cleric"), { damage: 201, magicDamage: 100 }, 452],
    [
      "magic_weapon_ranger",
      player("ranger"),
      { damage: 201, magicDamage: 100, bowDamage: 30 },
      406,
    ],
  ] as [DamageFormulaKind, Caster, Record<string, number>, number][])(
    "evaluates %s using character-window stats and nearest-even rounding",
    (kind, caster, values, expected) => {
      const calculation = damage(
        kind,
        caster,
        kind === "ranged_player_frontal"
          ? {
              skill_type: "frontal_projectiles",
              damage: { base_value: 1, bonus_per_level: 0 },
            }
          : kind === "ranged_player" || kind === "ranged_merc"
            ? { skill_type: "target_projectile" }
            : {},
      );
      expect(resultNumbers(calculation, values)[0]).toBe(expected);
    },
  );
  test("the ordinary auto-attack calculator exposes only the physical handler's inputs", () => {
    const calculation = damage("rogue_melee", player("rogue"), {
      followup_default_attack: true,
    });
    expect(calculation.inputs?.map((input) => input.key)).toEqual([
      "rank",
      "damage",
      "offhandDamage",
    ]);
    expect(
      resultNumbers(calculation, { damage: 201, offhandDamage: 31 })[0],
    ).toBe(278);
  });
  test("subtracts the Ranger's bow from elemental targeted skills, but not target projectiles", () => {
    expect(
      resultNumbers(damage("magic_spell", player("ranger")), {
        magicDamage: 201,
        bowDamage: 30,
      })[0],
    ).toBe(256);
    expect(
      resultNumbers(
        damage("magic_spell", player("ranger"), {
          skill_type: "target_projectile",
        }),
        { magicDamage: 201 },
      )[0],
    ).toBe(302);
  });
  test("scrolls ignore character values and a zero multiplier is not applied", () => {
    expect(
      resultNumbers(
        damage("magic_spell", player("wizard"), {
          is_scroll: true,
          damage: { base_value: 201, bonus_per_level: 0 },
        }),
      )[0],
    ).toBe(302);
    expect(
      resultNumbers(
        damage("normal", player("warrior"), {
          damage_percent: { base_value: 0, bonus_per_level: 0 },
          damage: { base_value: 1, bonus_per_level: 0 },
        }),
        { damage: 201 },
      )[0],
    ).toBe(202);
  });
  test("monster damage has no calculator, mercenary values are not remembered", () => {
    expect(damage("monster_magic", monster).inputs).toBeUndefined();
    expect(resultNumbers(damage("monster_magic", monster))[0]).toBe(300);
    expect(
      damage("normal", mercenary("Warrior")).inputs?.every(
        (input) => !input.remember,
      ),
    ).toBe(true);
  });
  test("Rage burn doubles Rage, Mana Burn triples Mana", () => {
    expect(
      resultNumbers(damage("manaburn", player("warrior")), {
        resource: 101,
      })[0],
    ).toBe(202);
    expect(
      resultNumbers(
        damage("manaburn", player("wizard"), {
          skill_type: "target_projectile",
        }),
        { resource: 101 },
      )[0],
    ).toBe(303);
  });
  test("Final Cadence rounds Charisma scaling before Melody, including half-even", () => {
    const cadence = skill({
      damage: { base_value: 4, bonus_per_level: 0 },
      heals_health: { base_value: 12, bonus_per_level: 0 },
    });
    expect(
      resultNumbers(cadenceCalculation(cadence, false), {
        charisma: 375,
        songs: 4,
      }),
    ).toEqual([7, 18]);
    expect(
      resultNumbers(cadenceCalculation(cadence, true), { charisma: 375 }),
    ).toEqual([6, 16]);
  });
  test("charm caps the charmed monster's damage at 100%", () => {
    expect(
      resultNumbers(
        charmDamageCalculation(
          skill({
            charmed_damage_percent: { base_value: 0.5, bonus_per_level: 0 },
          }),
        ),
        { charisma: 3000 },
      )[0],
    ).toBe(100);
  });
  test("a player's channeled skill splits its damage over the pulses, giving the leftover to the first pulses", () => {
    const channel = damage("normal", player("necromancer"), {
      channel_pulses: 3,
    });
    // 201 × 150% = 302 rounded, split as 100 per pulse with 2 left over.
    expect(resultNumbers(channel, { damage: 201 })).toEqual([101, 101, 100]);
    expect(resultNumbers(channel, { damage: 200 })).toEqual([100, 100, 100]);
    // Monsters cast the same skill as one hit.
    expect(
      resultNumbers(damage("monster_melee", monster, { channel_pulses: 3 })),
    ).toEqual([300]);
  });
  test("monster skill amounts use their runtime rank, including rank zero", () => {
    const fields = {
      damage: { base_value: 20, bonus_per_level: 5 },
      damage_percent: { base_value: 1.4, bonus_per_level: 0.25 },
      max_level: 10,
    };
    expect(
      resultNumbers(
        damage("monster_magic", monster, {
          ...fields,
          learn_default: false,
        }),
      )[0],
    ).toBe(247);
    expect(
      resultNumbers(
        damage("monster_magic", monster, {
          ...fields,
          learn_default: true,
        }),
      )[0],
    ).toBe(308);
  });
  test("single-rank damage, cadence and charm omit rank controls and evaluate rank one", () => {
    const single = skill({
      max_level: 1,
      damage: { base_value: 4, bonus_per_level: 2 },
      heals_health: { base_value: 12, bonus_per_level: 3 },
      charmed_damage_percent: { base_value: 0.45, bonus_per_level: 0.05 },
    });
    const hit = damage("normal", player("warrior"), single);
    const cadence = cadenceCalculation(single, false);
    const charm = charmDamageCalculation(single);
    for (const calculation of [hit, cadence, charm])
      expect(calculation.inputs?.some((input) => input.key === "rank")).toBe(
        false,
      );
    expect(resultNumbers(hit, { damage: 200 })).toEqual([306]);
    expect(resultNumbers(cadence, { charisma: 0, songs: 0 })).toEqual([4, 12]);
    expect(resultNumbers(charm, { charisma: 0 })).toEqual([45]);
  });
  test("mercenary damage and cadence default to the Mercenary Skill Rank example", () => {
    const hit = damage("normal", mercenary("Warrior"), { max_level: 30 });
    const cadence = cadenceCalculation(
      skill({
        max_level: 30,
        heals_health: { base_value: 12, bonus_per_level: 3 },
      }),
      true,
    );
    for (const calculation of [hit, cadence])
      expect(
        calculation.inputs?.find((input) => input.key === "rank")?.value,
      ).toBe(12);
    expect(
      damage("normal", mercenary("Warrior"), { max_level: 5 }).inputs?.find(
        (input) => input.key === "rank",
      )?.value,
    ).toBe(5);
  });
});

describe("healing and effect calculations", () => {
  test("healing adds a separately rounded Wisdom amount", () => {
    const heal = skill({ heals_health: { base_value: 5, bonus_per_level: 0 } });
    expect(
      resultNumbers(healingCalculation(heal, "player_other"), {
        wisdom: 125,
      })[0],
    ).toBe(7);
    expect(
      resultNumbers(healingCalculation(heal, "player_ranger"), {
        wisdom: 125,
      })[0],
    ).toBe(13);
    expect(
      resultNumbers(
        healingCalculation({ ...heal, is_scroll: true }, "player_other"),
      )[0],
    ).toBe(5);
    expect(
      healingCalculation(heal, "merc").inputs?.every(
        (input) => !input.remember,
      ),
    ).toBe(true);
  });
  test("Leadership rounds half the attribute sum before adding both damage bonuses", () => {
    const leadership = skill({
      id: "leadership",
      damage_bonus: { base_value: 3, bonus_per_level: 0 },
      magic_damage_bonus: { base_value: 5, bonus_per_level: 0 },
    });
    expect(
      resultNumbers(
        effectScalingCalculation(leadership, "player_wis_con_cha_half"),
        { wisdom: 1, constitution: 1, charisma: 3 },
      ),
    ).toEqual([5, 7]);
  });
  test("buffs round attribute additions separately, melee Defense debuffs use 50%", () => {
    expect(
      resultNumbers(
        effectScalingCalculation(
          skill({ defense_bonus: { base_value: 3, bonus_per_level: 0 } }),
          "player_wis",
        ),
        { wisdom: 10 },
      )[0],
    ).toBe(5);
    expect(
      resultNumbers(
        effectScalingCalculation(
          skill({
            defense_bonus: { base_value: -3, bonus_per_level: 0 },
            is_melee_debuff: true,
          }),
          "str",
          true,
        ),
        { strength: 7 },
      )[0],
    ).toBe(7);
  });
  test("short healing buffs round only the extra heal and long buffs add 30% of the attribute", () => {
    const buff = skill({
      healing_per_second_bonus: { base_value: 5, bonus_per_level: 0 },
      duration_base: 30,
    });
    expect(
      resultNumbers(effectScalingCalculation(buff, "player_wis"), {
        wisdom: 125,
      })[0],
    ).toBe(7);
    expect(
      resultNumbers(
        effectScalingCalculation({ ...buff, duration_base: 60 }, "player_wis"),
        { wisdom: 5 },
      )[0],
    ).toBe(7);
  });
  test("song integer and flat DoT bonuses round separately", () => {
    expect(
      resultNumbers(
        effectScalingCalculation(
          skill({
            scales_with_charisma: true,
            defense_bonus: { base_value: 5, bonus_per_level: 0 },
          }),
          "player_cha",
        ),
        { charisma: 500 },
      )[0],
    ).toBe(8);
    expect(
      resultNumbers(
        effectScalingCalculation(
          skill({
            scales_with_charisma: true,
            healing_per_second_bonus: { base_value: -3, bonus_per_level: 0 },
            damage_over_time_bonus_per_charisma_point: 0.5,
          }),
          "cha",
          true,
        ),
        { charisma: 5 },
      )[0],
    ).toBe(5);
  });
  test("aggro rounds crowd-control terms, adds a stated example hit, and only direct handlers add maximum Health", () => {
    const aggro = skill({
      aggro: { base_value: 5, bonus_per_level: 0 },
      stun_chance: { base_value: 0.25, bonus_per_level: 0 },
      stun_time: { base_value: 1, bonus_per_level: 0 },
      fear_chance: { base_value: 0.35, bonus_per_level: 0 },
      fear_time: { base_value: 1, bonus_per_level: 0 },
    });
    const calculation = aggroCalculation(aggro);
    expect(calculation.inputs?.map((input) => input.key)).not.toContain(
      "hitDamage",
    );
    expect(resultNumbers(calculation, { maxHealth: 100 })[0]).toBe(311);
    expect(
      resultNumbers(
        aggroCalculation({ ...aggro, skill_type: "target_projectile" }),
      )[0],
    ).toBe(211);
  });
  test("all-zero damage fields do not create a hit-damage input or threat term", () => {
    const calculation = aggroCalculation(
      skill({
        damage: { base_value: 0, bonus_per_level: 0 },
        damage_percent: { base_value: 0, bonus_per_level: 0 },
        aggro: { base_value: 3000, bonus_per_level: 0 },
      }),
      "mercenary",
    );
    expect(calculation.inputs?.map((input) => input.key)).toEqual([
      "rank",
      "maxHealth",
    ]);
    expect(resultNumbers(calculation, { maxHealth: 1000 })).toEqual([4000]);
  });
  test("player pet-restoration scrolls retain Wisdom, ordinary scrolls and mercenary casts do not", () => {
    const restore = skill({
      skill_type: "target_heal",
      is_scroll: true,
      is_mercenary_skill: true,
      heals_health: { base_value: 1000, bonus_per_level: 1000 },
    });
    expect(
      resultNumbers(healingCalculation(restore, "player_other"), {
        rank: 1,
        wisdom: 125,
      }),
    ).toEqual([1500]);
    expect(
      resultNumbers(healingCalculation(restore, "player_ranger"), {
        rank: 1,
        wisdom: 125,
      }),
    ).toEqual([2500]);
    expect(
      resultNumbers(healingCalculation(restore, "merc"), {
        rank: 1,
        wisdom: 125,
      }),
    ).toEqual([1000]);
    expect(
      resultNumbers(
        healingCalculation(
          { ...restore, skill_type: "area_heal" },
          "player_other",
        ),
        { rank: 1, wisdom: 125 },
      ),
    ).toEqual([1000]);
  });

  test("a flat buff drain does not request or use an attribute", () => {
    const drain = effectScalingCalculation(
      skill({
        healing_per_second_bonus: { base_value: -5, bonus_per_level: 0 },
      }),
      "player_ranger_wis",
    );
    expect(drain.inputs?.map((input) => input.key)).toEqual(["rank"]);
    expect(resultNumbers(drain, { wisdom: 500 })).toEqual([5]);
    expect(resultNumbers(drain, { wisdom: 0 })).toEqual([5]);
  });

  test("additive Charisma damage has one attribute input and retains its uncapped per-point contribution", () => {
    const calculation = effectScalingCalculation(
      skill({
        scales_with_charisma: true,
        healing_per_second_bonus: { base_value: -20, bonus_per_level: 0 },
        damage_over_time_bonus_per_charisma_point: 0.75,
      }),
      "cha",
      true,
    );
    expect(calculation.inputs?.map((input) => input.key)).toEqual([
      "rank",
      "charisma",
    ]);
    expect(resultNumbers(calculation, { charisma: 3000 })).toEqual([2270]);
  });

  test("song percentage debuffs report reduction magnitudes without changing their Charisma scaling", () => {
    const calculation = effectScalingCalculation(
      skill({
        scales_with_charisma: true,
        accuracy_bonus: { base_value: -0.03, bonus_per_level: 0 },
        critical_chance_bonus: { base_value: -0.01, bonus_per_level: 0 },
      }),
      "cha",
      true,
    );
    expect(resultNumbers(calculation, { charisma: 100 })).toEqual([3.3, 1.1]);
  });

  test("threat rank inputs omit fixed ranks and align mercenary defaults with the rank example", () => {
    const threat = skill({
      max_level: 30,
      damage: null,
      damage_percent: null,
      aggro: { base_value: 10, bonus_per_level: 1 },
    });
    expect(
      aggroCalculation(threat, "mercenary").inputs?.find(
        (input) => input.key === "rank",
      )?.value,
    ).toBe(12);
    const fixed = aggroCalculation({ ...threat, max_level: 1 }, "player");
    expect(fixed.inputs?.map((input) => input.key)).toEqual(["maxHealth"]);
    expect(resultNumbers(fixed, { maxHealth: 100 })).toEqual([110]);
  });
});

test("shared player calculations stay separate from mercenary values and weapon deductions", () => {
  const casters = [
    player("cleric"),
    player("wizard"),
    player("ranger"),
    player("rogue"),
    mercenary("Cleric"),
  ];
  const magic = skill({ damage_type: "Magic", is_spell: true });
  const results = calculationCasters(casters, magic).map(
    (group) =>
      resultNumbers(
        damageCalculation(
          magic,
          { formula: "magic_spell", casters: group },
          group,
        ),
        { magicDamage: 201, bowDamage: 30, offhandDamage: 31 },
      )[0],
  );
  expect(results).toEqual([302, 256, 278, 302]);
});

test("combined restoration scales Health with Wisdom but keeps the resource amount separate", () => {
  const restore = skill({
    heals_health: { base_value: 5, bonus_per_level: 0 },
    heals_mana: { base_value: 3, bonus_per_level: 0 },
  });
  expect(
    resultNumbers(healingCalculation(restore, "player_other"), { wisdom: 125 }),
  ).toEqual([7, 3]);
});

test("Charisma-scaled song damage uses the positive damage magnitude after rounding", () => {
  const song = skill({
    scales_with_charisma: true,
    healing_per_second_bonus: { base_value: -5, bonus_per_level: 0 },
    damage_over_time_bonus_per_charisma_point: 0,
  });
  expect(
    resultNumbers(effectScalingCalculation(song, "cha", true), {
      charisma: 500,
    }),
  ).toEqual([8]);
});

test("a non-positive listed aggro amount adds zero maximum Health", () => {
  const aggro = skill({ aggro: { base_value: 1, bonus_per_level: -1 } });
  expect(
    resultNumbers(aggroCalculation(aggro), { rank: 2, maxHealth: 2000 })[0],
  ).toBe(200);
});

test("NPC magic weapon skills combine the NPC's own physical and magical stats without an editor", () => {
  const attack = damage("monster_magic", monster, {
    damage_type: "Magic",
    is_spell: false,
    required_weapon_category: "Weapon",
  });
  expect(attack.inputs).toBeUndefined();
  expect(resultNumbers(attack)[0]).toBe(600);
});
