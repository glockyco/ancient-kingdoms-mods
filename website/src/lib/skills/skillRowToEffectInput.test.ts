import { describe, expect, it } from "vitest";
import { skillRowToEffectInput } from "./skillRowToEffectInput";

describe("skillRowToEffectInput", () => {
  it("coerces integer boolean columns to booleans", () => {
    const out = skillRowToEffectInput({
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
      id: "summon_wolf",
      skill_type: "summon",
      pet_prefab_name: "Wolf",
      damage: { base_value: 10, bonus_per_level: 2 },
    });
    expect(out.pet_name).toBe("Wolf");
    expect(out.damage).toEqual({ base_value: 10, bonus_per_level: 2 });
  });
});
