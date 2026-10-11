import { describe, expect, test } from "vitest";
import type {
  SkillDetailView,
  SkillMechanicsSpec,
  SkillPet,
  TimingModel,
} from "$lib/types/skills";
import { skillFacts } from "./skill-facts";

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
) {
  const spec: SkillMechanicsSpec = {
    damageContexts: [],
    healContexts: [],
    buffContexts: [],
    debuffContexts: [],
    timingContexts: models.map((model) => ({ model, casters: [] })),
  };
  return skillFacts(skill(overrides), pets, spec, []);
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
  test("melee resistance takes precedence over all elemental flags", () => {
    expect(
      facts({
        is_melee_debuff: true,
        is_poison_debuff: true,
        is_fire_debuff: true,
      }).debuffResistance,
    ).toBe("Defense");
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
    ).toEqual({ stat: "Defense", avoidance: "block" });
    expect(
      facts({ skill_type: "target_damage", damage_type: "Unknown" })
        .damageMechanics,
    ).toBeNull();
    expect(
      facts({ skill_type: "target_heal", damage_type: "Fire" }).damageMechanics,
    ).toBeNull();
  });
});
