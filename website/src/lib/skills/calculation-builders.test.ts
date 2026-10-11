import { describe, expect, test } from "vitest";
import type { Calculation } from "$lib/types/calculation";
import type { DamageFormulaKind, SkillDetailView } from "$lib/types/skills";
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
function damage(
  kind: DamageFormulaKind,
  label: string,
  overrides: Partial<SkillDetailView> = {},
): Calculation {
  return damageCalculation(
    skill(overrides),
    { formula: kind, casterLabels: [label] },
    label,
  );
}

describe("skill damage calculations", () => {
  test.each([
    ["normal", "Warrior (player)", { damage: 201 }, 302],
    ["magic_spell", "Wizard (player)", { magicDamage: 201 }, 302],
    ["ranger_melee", "Ranger (player)", { damage: 201, bowDamage: 30 }, 256],
    ["rogue_melee", "Rogue (player)", { damage: 201, offhandDamage: 31 }, 278],
    ["rogue_melee_merc", "Rogue mercenary", { damage: 201 }, 302],
    [
      "ranged_player",
      "Ranger (player)",
      { damage: 201, dexterity: 3, meleeDamage: 30 },
      262,
    ],
    [
      "ranged_player_frontal",
      "Ranger (player)",
      { damage: 201, dexterity: 3 },
      206,
    ],
    ["ranged_merc", "Ranger mercenary", { damage: 201, dexterity: 3 }, 308],
    [
      "poison_rogue",
      "Rogue (player)",
      { damage: 201, dexterity: 3, offhandDamage: 31 },
      290,
    ],
    ["magic_weapon", "Cleric (player)", { damage: 201, magicDamage: 100 }, 452],
    [
      "magic_weapon_ranger",
      "Ranger (player)",
      { damage: 201, magicDamage: 100, bowDamage: 30 },
      406,
    ],
  ] as [DamageFormulaKind, string, Record<string, number>, number][])(
    "evaluates %s using character-window stats and nearest-even rounding",
    (kind, label, values, expected) => {
      const calculation = damage(
        kind,
        label,
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
    const calculation = damage("rogue_melee", "Rogue (player)", {
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
      resultNumbers(damage("magic_spell", "Ranger (player)"), {
        magicDamage: 201,
        bowDamage: 30,
      })[0],
    ).toBe(256);
    expect(
      resultNumbers(
        damage("magic_spell", "Ranger (player)", {
          skill_type: "target_projectile",
        }),
        { magicDamage: 201 },
      )[0],
    ).toBe(302);
  });
  test("scrolls ignore character values and a zero multiplier is not applied", () => {
    expect(
      resultNumbers(
        damage("magic_spell", "Wizard (player)", {
          is_scroll: true,
          damage: { base_value: 201, bonus_per_level: 0 },
        }),
      )[0],
    ).toBe(302);
    expect(
      resultNumbers(
        damage("normal", "Warrior (player)", {
          damage_percent: { base_value: 0, bonus_per_level: 0 },
          damage: { base_value: 1, bonus_per_level: 0 },
        }),
        { damage: 201 },
      )[0],
    ).toBe(202);
  });
  test("monster damage has no calculator, mercenary values are not remembered", () => {
    expect(damage("monster_magic", "Monster or NPC").inputs).toBeUndefined();
    expect(resultNumbers(damage("monster_magic", "Monster or NPC"))[0]).toBe(
      300,
    );
    expect(
      damage("normal", "Warrior mercenary").inputs?.every(
        (input) => !input.remember,
      ),
    ).toBe(true);
  });
  test("Rage burn doubles Rage, Mana Burn triples Mana", () => {
    expect(
      resultNumbers(damage("manaburn", "Warrior (player)"), {
        resource: 101,
      })[0],
    ).toBe(202);
    expect(
      resultNumbers(
        damage("manaburn", "Wizard (player)", {
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
  test("aggro rounds crowd-control terms and only direct handlers add maximum Health", () => {
    const aggro = skill({
      aggro: { base_value: 5, bonus_per_level: 0 },
      stun_chance: { base_value: 0.25, bonus_per_level: 0 },
      stun_time: { base_value: 1, bonus_per_level: 0 },
      fear_chance: { base_value: 0.35, bonus_per_level: 0 },
      fear_time: { base_value: 1, bonus_per_level: 0 },
    });
    expect(
      resultNumbers(aggroCalculation(aggro), {
        maxHealth: 100,
        hitDamage: 10,
      })[0],
    ).toBe(121);
    expect(
      resultNumbers(
        aggroCalculation({ ...aggro, skill_type: "target_projectile" }),
        { hitDamage: 10 },
      )[0],
    ).toBe(21);
  });
});

test("shared player calculations stay separate from mercenary values and weapon deductions", () => {
  const labels = [
    "Cleric (player)",
    "Wizard (player)",
    "Ranger (player)",
    "Rogue (player)",
    "Cleric mercenary",
  ];
  const magic = skill({ damage_type: "Magic", is_spell: true });
  const results = calculationCasters(labels, magic).map(
    (label) =>
      resultNumbers(
        damageCalculation(
          magic,
          { formula: "magic_spell", casterLabels: [label] },
          label,
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
    resultNumbers(aggroCalculation(aggro), {
      rank: 2,
      maxHealth: 2000,
      hitDamage: 10,
    })[0],
  ).toBe(10);
});

test("NPC magic weapon skills combine the NPC's own physical and magical stats without an editor", () => {
  const attack = damage("monster_magic", "Monster or NPC", {
    damage_type: "Magic",
    is_spell: false,
    required_weapon_category: "Weapon",
  });
  expect(attack.inputs).toBeUndefined();
  expect(resultNumbers(attack)[0]).toBe(600);
});
