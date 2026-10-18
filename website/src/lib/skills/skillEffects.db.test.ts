import { describe, expect, test } from "vitest";
import { query } from "$lib/db.server";
import { formatSkillEffect } from "$lib/utils/formatSkillEffect";
import { skillEffectInputs, skillEffectSummaries } from "./skillEffects.server";
import {
  SKILL_DETAIL_COLUMNS,
  SKILL_DETAIL_JOINS,
  skillCastersFromRow,
} from "./skillDetail";

function summary(id: string): string {
  const [effect] = skillEffectSummaries([id]);
  return effect;
}

function playerClasses(id: string): string[] {
  const [row] = query<{ player_classes: string | null }>(
    "SELECT player_classes FROM skills WHERE id = ?",
    [id],
  );
  return JSON.parse(row?.player_classes ?? "[]") as string[];
}

describe("skill effect summaries", () => {
  test("preserve every configured non-Bandages potion caster rank", () => {
    const potions = query<{ skill_id: string; rank: number }>(
      `SELECT DISTINCT potion_buff_id AS skill_id, potion_buff_level AS rank
       FROM items WHERE potion_buff_id IS NOT NULL
         AND coalesce(cooldown_category, '') != 'Bandages'`,
    );
    expect(potions.length).toBeGreaterThan(0);
    const ids = [...new Set(potions.map((potion) => potion.skill_id))];
    const rows = query<Record<string, unknown>>(
      `SELECT ${SKILL_DETAIL_COLUMNS} FROM skills s ${SKILL_DETAIL_JOINS}
       WHERE s.id IN (${ids.map(() => "?").join(",")})`,
      ids,
    );
    expect(rows.length).toBe(ids.length);
    for (const row of rows) {
      expect(
        skillCastersFromRow(row).potionBuffLevels.sort((a, b) => a - b),
        String(row.id),
      ).toEqual(
        potions
          .filter((potion) => potion.skill_id === row.id)
          .map((potion) => potion.rank)
          .sort((a, b) => a - b),
      );
    }
  });

  test("resolve a skill only monsters cast at their fixed rank", () => {
    expect(
      query<{ runtime_level: number }>(
        "SELECT DISTINCT runtime_level FROM monster_skills WHERE skill_id = 'ant_attack'",
      ),
    ).toEqual([{ runtime_level: 0 }]);

    const listed = summary("ant_attack");
    const [atRuntimeLevel] = skillEffectInputs([
      { id: "ant_attack", runtimeLevel: 0 },
    ]);
    expect(listed).toBe(formatSkillEffect(atRuntimeLevel));
    expect(listed).toContain("0.9% stun");
    expect(listed).not.toContain("rank");
  });

  test("keep the rank formula of a skill players also cast", () => {
    expect(playerClasses("dragons_breath")).toContain("wizard");
    expect(
      query<{ runtime_level: number }>(
        "SELECT runtime_level FROM monster_skills WHERE skill_id = 'dragons_breath'",
      ).some((usage) => usage.runtime_level === 0),
    ).toBe(true);
    expect(summary("dragons_breath")).toContain("rank");
  });

  test("keep the maximum-health cost of a player buff", () => {
    expect(playerClasses("enrage")).toContain("warrior");
    expect(summary("enrage")).toContain("−50%");
  });

  test("state a rank formula from its rank-1 value and subtract the weapon Archer Shot loses", () => {
    const archerShot = summary("archer_shot");
    expect(archerShot).toContain("1 + 4 × (rank − 1)");
    expect(archerShot).toContain("− main-hand Base Damage");
  });

  test("keep a mercenary's area heal off players", () => {
    expect(summary("light_of_the_heavens")).toContain("not players");
  });
});
