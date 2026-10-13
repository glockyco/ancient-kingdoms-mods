import { describe, expect, test } from "vitest";
import { getSkillCategoryKey } from "./skill-category";

const skill = {
  base_skill: false,
  is_veteran: false,
  tier: 0,
  class_skill_position: 17,
};

describe("shared skill categories", () => {
  test("mastery follows the class's tiered progression but precedes utility", () => {
    expect(getSkillCategoryKey(skill, 15)).toBe("Mastery");
    expect(getSkillCategoryKey(skill, 17)).toBe("Core");
    expect(
      getSkillCategoryKey({ ...skill, class_skill_position: 18 }, 15),
    ).toBe("Utility");
  });
  test("base, veteran and tiered skills retain their categories", () => {
    expect(getSkillCategoryKey({ ...skill, base_skill: true }, 15)).toBe(
      "Base",
    );
    expect(getSkillCategoryKey({ ...skill, is_veteran: true }, 15)).toBe(
      "Veteran",
    );
    expect(
      getSkillCategoryKey({ ...skill, tier: 3, class_skill_position: 15 }, 15),
    ).toBe("Tier 3");
  });
});
