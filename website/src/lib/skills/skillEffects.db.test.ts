import { describe, expect, test } from "vitest";
import { query } from "$lib/db.server";
import { formatSkillEffect } from "$lib/utils/formatSkillEffect";
import { skillEffectInputs, skillEffectSummaries } from "./skillEffects.server";

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
    expect(summary("enrage")).toContain("−50% Hit Points,");
  });

  test("state a rank formula from its rank-1 value and subtract the weapon Archer Shot loses", () => {
    const archerShot = summary("archer_shot");
    expect(archerShot).toContain("1 + 4 × (rank − 1)");
    expect(archerShot).toContain("− main-hand Base Damage");
  });

  test("note how the caster's attribute scales a heal, a buff and a damage over time", () => {
    expect(summary("healing")).toContain("0.4% more per Wisdom");
    expect(summary("fortitude")).toContain("+2 per Wisdom");
    expect(summary("venom_of_the_grave")).toContain("per Intelligence");
  });

  test("note no attribute where the caster contributes none", () => {
    // A companion's debuff and a scroll's add no attribute bonus.
    expect(summary("rotting_touch")).not.toContain(" per ");
    expect(summary("witherbind")).not.toContain(" per ");
  });

  test("give a song one song power note", () => {
    expect(summary("bulwark_chant").match(/per Charisma/g)).toHaveLength(1);
  });

  test("keep a mercenary's area heal off players", () => {
    expect(summary("light_of_the_heavens")).toContain("not players");
  });
});
