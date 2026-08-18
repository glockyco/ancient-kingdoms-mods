import { describe, expect, test } from "vitest";
import { query } from "$lib/db.server";
import { formatSkillEffect } from "$lib/utils/formatSkillEffect";
import { skillRowToEffectInput } from "$lib/skills/skillRowToEffectInput";
import { SKILLS_LIST_QUERY } from "$lib/skills/skillsListQuery";
import { MONSTER_ABILITIES_QUERY } from "$lib/skills/monsterAbilitiesQuery";

/**
 * The monster and skills-list projections carry the same intrinsic effect data.
 * Monster rendering then resolves those formulas at the level assigned by
 * MonsterSkills; the skills list keeps its general skill-level presentation.
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

  test("project the same intrinsic effects as the skills list", () => {
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

  test("show the Ant Attack formula and its runtime result", () => {
    const intrinsic = query<{ id: string }>(SKILLS_LIST_QUERY).find(
      (row) => row.id === "ant_attack",
    );
    expect(intrinsic).toBeDefined();
    expect(formatSkillEffect(skillRowToEffectInput(intrinsic))).toBe(
      "2 physical dmg, 0.7% + 0.3% × skill lvl stun (1s)",
    );

    const antAttack = query<{ id: string; runtime_level: number }>(
      MONSTER_ABILITIES_QUERY,
      ["giant_ant"],
    ).find((row) => row.id === "ant_attack");

    expect(antAttack).toBeDefined();
    expect(antAttack?.runtime_level).toBe(0);
    expect(
      formatSkillEffect(
        skillRowToEffectInput(antAttack, antAttack?.runtime_level),
      ),
    ).toContain("0.7% stun");
  });

  test("keep one exact formula for player and level-zero monster use", () => {
    const dragonBreath = query<{
      id: string;
      player_classes: string;
    }>(SKILLS_LIST_QUERY).find((row) => row.id === "dragons_breath");

    expect(dragonBreath).toBeDefined();
    expect(JSON.parse(dragonBreath?.player_classes ?? "[]")).toContain(
      "wizard",
    );
    expect(
      query<{ runtime_level: number }>(
        "SELECT runtime_level FROM monster_skills WHERE skill_id = ?",
        ["dragons_breath"],
      ).some((usage) => usage.runtime_level === 0),
    ).toBe(true);
    expect(formatSkillEffect(skillRowToEffectInput(dragonBreath))).toBe(
      "115% + 25% × skill lvl fire weapon dmg",
    );
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
