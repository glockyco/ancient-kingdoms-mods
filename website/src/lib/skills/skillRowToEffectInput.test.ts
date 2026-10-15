import { describe, expect, it } from "vitest";
import { skillRowToEffectInput } from "./skillRowToEffectInput";

/** The class and derived caster columns of a skill with no special users. */
const derived = {
  player_classes: null,
  mercenary_types: "[]",
  npc_caster_only: 0,
  potion_buff_levels: "[]",
};

describe("skillRowToEffectInput", () => {
  it("coerces integer boolean columns to booleans", () => {
    const out = skillRowToEffectInput({
      ...derived,
      id: "enrage",
      skill_type: "passive",
      is_enrage: 1,
      is_assassination_skill: 0,
    });
    expect(out.is_enrage).toBe(true);
    expect(out.is_assassination_skill).toBe(false);
  });

  it("renames pet_prefab_name to pet_name and passes LinearValue columns through", () => {
    const out = skillRowToEffectInput({
      ...derived,
      id: "summon_wolf",
      skill_type: "summon",
      pet_prefab_name: "Wolf",
      damage: { base_value: 10, bonus_per_level: 2 },
    });
    expect(out.pet_name).toBe("Wolf");
    expect(out.damage).toEqual({ base_value: 10, bonus_per_level: 2 });
  });

  it("resolves a skill only monsters and NPCs cast at their fixed rank", () => {
    const row = {
      ...derived,
      id: "claw",
      skill_type: "target_damage",
      damage_type: "Physical",
      npc_caster_only: 1,
      stun_chance: '{"base_value": 0.01, "bonus_per_level": 0.01}',
    };
    expect(
      skillRowToEffectInput({ ...row, learn_default: 0 }).stun_chance,
    ).toEqual({ base_value: 0, bonus_per_level: 0 });
    expect(
      skillRowToEffectInput({ ...row, learn_default: 1 }).stun_chance,
    ).toEqual({ base_value: 0.01, bonus_per_level: 0 });
  });

  it("refuses a row that lacks the derived caster columns", () => {
    expect(() =>
      skillRowToEffectInput({ id: "claw", skill_type: "target_damage" }),
    ).toThrow(/npc_caster_only/);
  });
});
