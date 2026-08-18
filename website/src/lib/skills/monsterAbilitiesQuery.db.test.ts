import { describe, expect, test } from "vitest";
import { query } from "$lib/db.server";
import { formatSkillEffect } from "$lib/utils/formatSkillEffect";
import { skillRowToEffectInput } from "$lib/skills/skillRowToEffectInput";
import { SKILLS_LIST_QUERY } from "$lib/skills/skillsListQuery";
import { MONSTER_ABILITIES_QUERY } from "$lib/skills/monsterAbilitiesQuery";

/**
 * A monster ability and the same row on `/skills` must produce the same effect
 * text. Both projections are built from `SKILL_EFFECT_COLUMNS`; this proves no
 * page drops a stat the formatter reads. Enrage is the case that motivated it:
 * the monster ability table showed only its damage bonus while the skill page
 * also showed the maximum-health cost, because the monster projection omitted
 * `health_max_percent_bonus`.
 */
describe("monster ability effects", () => {
  const listEffects: Record<string, string> = Object.fromEntries(
    query<{ id: string }>(SKILLS_LIST_QUERY).map((row) => [
      row.id,
      formatSkillEffect(skillRowToEffectInput(row)),
    ]),
  );

  const monsterIds = query<{ monster_id: string }>(
    "SELECT DISTINCT monster_id FROM monster_skills",
  ).map((row) => row.monster_id);

  test("render identically to the same skill on the skills list", () => {
    expect(monsterIds.length).toBeGreaterThan(0);

    const mismatches: string[] = [];
    let compared = 0;
    for (const monsterId of monsterIds) {
      for (const row of query<{ id: string }>(MONSTER_ABILITIES_QUERY, [
        monsterId,
      ])) {
        const expected = listEffects[row.id];
        if (expected === undefined) continue;
        compared++;
        const actual = formatSkillEffect(skillRowToEffectInput(row));
        if (actual !== expected) {
          mismatches.push(`${monsterId}/${row.id}: ${actual} != ${expected}`);
        }
      }
    }

    expect(compared).toBeGreaterThan(0);
    expect(mismatches).toEqual([]);
  });

  test("keep the maximum-health cost of a shared buff", () => {
    const enrage = query<{ id: string }>(MONSTER_ABILITIES_QUERY, [
      "overseer_garok",
    ]).find((row) => row.id === "enrage");

    expect(enrage).toBeDefined();
    expect(formatSkillEffect(skillRowToEffectInput(enrage))).toBe(
      "-50% max hp, +33% phys dmg, 30s",
    );
  });
});
