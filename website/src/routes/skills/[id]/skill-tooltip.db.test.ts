import { describe, expect, it } from "vitest";
import { query } from "$lib/db.server";
import type { SkillDetailView } from "$lib/types/skills";
import { _fillSkillTooltip, load } from "./+page.server";

async function loadSkill(id: string) {
  return await load({ params: { id } } as Parameters<typeof load>[0]);
}

describe("skill game tooltips", () => {
  it("fills every exported skill template without exposing tokens", async () => {
    const ids = query<{ id: string }>(
      "SELECT id FROM skills WHERE tooltip_template IS NOT NULL AND tooltip_template != ''",
    );
    expect(ids.length).toBeGreaterThan(100);
    for (const { id } of ids) {
      const data = await loadSkill(id);
      if (!data) throw new Error(`Missing skill ${id}`);
      expect(data.gameTooltip, id).not.toMatch(/\{[^{}]+\}/);
      expect(data.gameTooltip, id).not.toContain("%%");
      if (data.skill.tooltip_template?.includes("{NAME}")) {
        expect(data.gameTooltip, id).toContain(data.skill.name);
      }
    }
  });

  it("drops unavailable lines rather than displaying an unresolved token", () => {
    expect(
      _fillSkillTooltip({
        name: "Example",
        tooltip_template: "{NAME}\nMissing {UNKNOWN}\nKnown description",
        duration_base: 0,
        fear_resist_chance_bonus_cap: 0,
        bard_song_duration_bonus_per_level: 0,
        food_and_drink_buff_duration_bonus_per_level: 0,
      } as SkillDetailView),
    ).toBe("Example\nKnown description");
  });
});
