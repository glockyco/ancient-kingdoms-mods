import { describe, expect, test } from "vitest";
import type {
  SkillDetailView,
  SkillMechanicsSpec,
  SkillPet,
  SkillItemSource,
  TimingModel,
} from "$lib/types/skills";
import { skillFacts, weaponProcClasses } from "./skill-facts";

function skill(overrides: Partial<SkillDetailView> = {}): SkillDetailView {
  return {
    id: "test",
    player_classes: [],
    channel_pulses: 0,
    max_level: 5,
    required_skill_points: 1,
    ...overrides,
  } as SkillDetailView;
}
function facts(
  overrides: Partial<SkillDetailView> = {},
  pets: SkillPet[] = [],
  models: TimingModel[] = [],
  usedByMonster = false,
  items: SkillItemSource[] = [],
) {
  const spec: SkillMechanicsSpec = {
    damageContexts: [],
    healContexts: [],
    buffContexts: [],
    debuffContexts: [],
    timingContexts: models.map((model) => ({ model, casters: [] })),
  };
  return skillFacts(skill(overrides), pets, spec, items, usedByMonster);
}
function pet(overrides: Partial<SkillPet> = {}): SkillPet {
  return {
    id: "pet",
    name: "Pet",
    is_mercenary: false,
    is_familiar: false,
    type_monster: null,
    ...overrides,
  };
}

describe("skill page facts", () => {
  test("zero-valued exported damage is not actual damage, while nonzero threat retains its card", () => {
    const zero = { base_value: 0, bonus_per_level: 0 };
    const result = facts({ damage: zero, damage_percent: zero, aggro: zero });
    expect(result.hasDamage).toBe(false);
    expect(result.hasActualDamage).toBe(false);
    const threat = facts({
      damage: zero,
      damage_percent: zero,
      aggro: { base_value: 100, bonus_per_level: 0 },
    });
    expect(threat.hasDamage).toBe(true);
    expect(threat.hasActualDamage).toBe(false);
    expect(
      facts({ damage: { base_value: 0, bonus_per_level: 1 } }).hasActualDamage,
    ).toBe(true);
  });
  test("all zero-valued exported bonus groups stay absent and nonzero values remain visible", () => {
    const fields = [
      "health_max_bonus",
      "health_max_percent_bonus",
      "mana_max_bonus",
      "mana_max_percent_bonus",
      "energy_max_bonus",
      "defense_bonus",
      "ward_bonus",
      "magic_resist_bonus",
      "damage_bonus",
      "damage_percent_bonus",
      "magic_damage_bonus",
      "magic_damage_percent_bonus",
      "haste_bonus",
      "spell_haste_bonus",
      "speed_bonus",
      "critical_chance_bonus",
      "critical_resist_bonus",
      "accuracy_bonus",
      "block_chance_bonus",
      "fear_resist_chance_bonus",
      "damage_shield",
      "cooldown_reduction_percent",
      "heal_on_hit_percent",
      "healing_per_second_bonus",
      "health_percent_per_second_bonus",
      "mana_per_second_bonus",
      "mana_percent_per_second_bonus",
      "energy_per_second_bonus",
      "energy_percent_per_second_bonus",
      "poison_resist_bonus",
      "fire_resist_bonus",
      "cold_resist_bonus",
      "disease_resist_bonus",
      "strength_bonus",
      "intelligence_bonus",
      "dexterity_bonus",
      "constitution_bonus",
      "wisdom_bonus",
      "charisma_bonus",
    ];
    const zero = { base_value: 0, bonus_per_level: 0 };
    const bonuses = {
      ...Object.fromEntries(fields.map((field) => [field, zero])),
      is_invisibility: false,
      is_mana_shield: false,
      is_blindness: false,
      is_enrage: false,
      is_permanent: false,
      is_only_for_magic_classes: false,
    } as Partial<SkillDetailView>;
    expect(facts(bonuses).hasAnyBonuses).toBe(false);
    expect(facts(bonuses).hasBuffEffects).toBe(false);
    for (const field of fields) {
      const result = facts({
        ...bonuses,
        [field]: { base_value: 0, bonus_per_level: -1 },
      });
      expect(result.hasAnyBonuses, field).toBe(true);
      expect(result.hasBuffEffects, field).toBe(true);
    }
    expect(facts({ ...bonuses, is_mana_shield: true }).hasBuffEffects).toBe(
      true,
    );
  });
  test("a cleanse spell shows none of its authored buff fields, which the game never applies", () => {
    const resist = { base_value: 100, bonus_per_level: 50 };
    const flags = {
      is_invisibility: false,
      is_mana_shield: false,
      is_blindness: false,
      is_enrage: false,
      is_permanent: false,
      is_only_for_magic_classes: false,
    };
    const remedy = facts({
      ...flags,
      skill_type: "target_buff",
      is_cleanse: true,
      magic_resist_bonus: resist,
      poison_resist_bonus: resist,
      mana_percent_per_second_bonus: { base_value: 0.05, bonus_per_level: 0 },
    });
    expect(remedy.hasAnyBonuses).toBe(false);
    expect(remedy.hasBuffEffects).toBe(false);
    expect(remedy.hasAttributeScaledBonuses).toBe(false);
    expect(
      facts({ skill_type: "target_buff", magic_resist_bonus: resist })
        .hasBuffEffects,
    ).toBe(true);
  });
  test("scroll-only skills exclude every learned, pet, monster, or non-scroll path", () => {
    const scroll = { item_id: "scroll", item_name: "Scroll", type: "scroll" };
    expect(facts({}, [], [], false, [scroll]).scrollOnly).toBe(true);
    expect(
      facts({ player_classes: ["cleric"] }, [], [], false, [scroll]).scrollOnly,
    ).toBe(false);
    expect(facts({}, [pet()], [], false, [scroll]).scrollOnly).toBe(false);
    expect(facts({}, [], [], true, [scroll]).scrollOnly).toBe(false);
    expect(
      facts({}, [], [], false, [scroll, { ...scroll, type: "weapon_proc" }])
        .scrollOnly,
    ).toBe(false);
    expect(facts().scrollOnly).toBe(false);
  });
  test("tiered player skills show requirements even without another restriction", () => {
    expect(facts({ player_classes: ["bard"], tier: 1 }).hasRequirements).toBe(
      true,
    );
    expect(facts({ tier: 1 }).hasRequirements).toBe(false);
    expect(facts({ player_classes: ["bard"], tier: 0 }).hasRequirements).toBe(
      false,
    );
  });
  test("weapon procs use the union of equippable classes, with bows restricted to Rangers", () => {
    expect(
      weaponProcClasses([
        { classes: ["warrior", "cleric"], weaponCategory: "WeaponSword2H" },
      ]),
    ).toEqual(["warrior", "cleric"]);
    expect(
      weaponProcClasses([{ classes: null, weaponCategory: "Bow" }]),
    ).toEqual(["ranger"]);
    expect(
      weaponProcClasses([
        { classes: ["warrior", "ranger"], weaponCategory: "WeaponSword" },
        { classes: ["ranger", "bard"], weaponCategory: "WeaponDagger" },
      ]),
    ).toEqual(["warrior", "ranger", "bard"]);
    expect(weaponProcClasses([])).toEqual([]);
    expect(
      weaponProcClasses([{ classes: ["all"], weaponCategory: "Bow" }]),
    ).toEqual(["ranger"]);
    expect(weaponProcClasses([{ classes: [], weaponCategory: "Bow" }])).toEqual(
      ["ranger"],
    );
  });
  test("monster usage is independent of pet and timing contexts", () => {
    expect(facts().usedByMonster).toBe(false);
    expect(facts({}, [], [], true).usedByMonster).toBe(true);
    expect(facts({}, [pet()]).usedByMonster).toBe(false);
  });
  test("melee resistance takes precedence over all elemental flags", () => {
    expect(
      facts({
        is_melee_debuff: true,
        is_poison_debuff: true,
        is_fire_debuff: true,
      }).debuffResistance,
    ).toBe("Armor Class");
    expect(
      facts({ is_poison_debuff: true, is_fire_debuff: true }).debuffResistance,
    ).toBe("Poison Resist");
    expect(
      facts({ is_fire_debuff: true, is_magic_debuff: true }).debuffResistance,
    ).toBe("Fire Resist");
    expect(facts().debuffResistance).toBeNull();
  });
  test("aggro alone is displayed but does not have actual damage", () => {
    const result = facts({ aggro: { base_value: 100, bonus_per_level: 0 } });
    expect(result.hasDamage).toBeTruthy();
    expect(result.hasActualDamage).toBe(false);
    expect(facts({ is_manaburn_skill: true }).hasActualDamage).toBe(true);
  });
  test("veteran loss needs both veteran status and more than one required point", () => {
    expect(
      facts({ is_veteran: true, required_skill_points: 1 }).losesVeteranPoints,
    ).toBe(false);
    expect(
      facts({ is_veteran: false, required_skill_points: 2 }).losesVeteranPoints,
    ).toBe(false);
    expect(
      facts({ is_veteran: true, required_skill_points: 2 }).losesVeteranPoints,
    ).toBe(true);
  });
  test("spell haste requires a castable player or mercenary spell, excluding scrolls and channels", () => {
    const spell = {
      is_spell: true,
      cast_time: { base_value: 1, bonus_per_level: 0 },
    };
    expect(facts({ ...spell, player_classes: ["wizard"] }).shortensCast).toBe(
      true,
    );
    expect(facts(spell, [pet({ is_mercenary: true })]).shortensCast).toBe(true);
    expect(facts(spell, [pet({ skill_index: 0 })]).shortensCast).toBe(false);
    expect(
      facts({ ...spell, player_classes: ["wizard"], is_scroll: true })
        .shortensCast,
    ).toBe(false);
    expect(
      facts({ ...spell, player_classes: ["wizard"], channel_pulses: 2 })
        .shortensCast,
    ).toBe(false);
  });
  test("cooldown haste casters come from timing models, not usage flags alone", () => {
    expect(
      facts({}, [pet({ is_mercenary: true })], ["merc_auto"])
        .hasteCooldownCasters,
    ).toBe("mercenaries");
    expect(
      facts({}, [pet({ skill_index: 0 })], ["companion_auto"])
        .hasteCooldownCasters,
    ).toBe("companions");
    expect(facts({}, [pet({ skill_index: 1 })]).hasteCooldownCasters).toBe("");
    expect(
      facts({}, [], ["player_spell", "merc_spell"]).hasteCooldownCasters,
    ).toBe("");
    expect(
      facts({}, [], ["monster", "companion_auto", "merc_auto", "merc_auto"])
        .hasteCooldownCasters,
    ).toBe("mercenaries, companions, and monsters and NPCs");
  });
  test("damage type omission means physical, but unknown types and non-damage skills have no mapping", () => {
    expect(
      facts({ skill_type: "target_damage", damage_type: null }).damageMechanics,
    ).toEqual({ stat: "Armor Class", avoidance: "block" });
    expect(
      facts({ skill_type: "target_damage", damage_type: "Unknown" })
        .damageMechanics,
    ).toBeNull();
    expect(
      facts({ skill_type: "target_heal", damage_type: "Fire" }).damageMechanics,
    ).toBeNull();
  });
});
