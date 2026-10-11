import { describe, expect, test } from "vitest";
import { query } from "$lib/db.server";
import { getAllClasses, getClassSkills } from "$lib/queries/classes.server";
import { getPetById } from "$lib/queries/pets.server";
import { formatSkillEffect } from "$lib/utils/formatSkillEffect";
import { skillRowToEffectInput } from "./skillRowToEffectInput";
import { SKILLS_LIST_QUERY } from "./skillsListQuery";

const listEffects: Record<string, string> = Object.fromEntries(
  query<{ id: string }>(SKILLS_LIST_QUERY).map((row) => [
    row.id,
    formatSkillEffect(skillRowToEffectInput(row)),
  ]),
);

describe("skill effect projections", () => {
  test("every class effect matches the skills list", () => {
    const classes = getAllClasses();
    expect(classes.length).toBeGreaterThan(0);
    for (const cls of classes) {
      const skills = getClassSkills(cls.id);
      expect(skills.length).toBeGreaterThan(0);
      for (const row of skills) {
        expect(
          formatSkillEffect(skillRowToEffectInput(row)),
          `${cls.id}/${row.id}`,
        ).toBe(listEffects[row.id]);
      }
    }
  });

  test.each(["bard_mercenary", "ancient_mummy"])(
    "%s effects match the skills list",
    (petId) => {
      const pet = getPetById(petId);
      expect(pet).not.toBeNull();
      expect(pet!.skills.length).toBeGreaterThan(0);
      for (const row of pet!.skills) {
        expect(
          formatSkillEffect(skillRowToEffectInput(row)),
          `${petId}/${row.id}`,
        ).toBe(listEffects[row.id]);
      }
    },
  );
});
