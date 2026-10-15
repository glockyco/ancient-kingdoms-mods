import { describe, expect, it } from "vitest";
import { query } from "$lib/db.server";
import type { SkillDetailView } from "$lib/types/skills";
import {
  _fillSkillTooltip,
  load,
  type SkillDetailPageData,
} from "./+page.server";

async function loadSkill(id: string): Promise<SkillDetailPageData> {
  return (await load({
    params: { id },
  } as Parameters<typeof load>[0])) as SkillDetailPageData;
}

describe("skill effect categories", () => {
  it("loads every other skill sharing a category without including itself", async () => {
    const data = await loadSkill("ossuary_bulwark");
    expect(data.categorySkills.map((skill) => skill.id)).toEqual([
      "frenzy_of_the_dead",
      "undead_frenzy",
    ]);
    expect((await loadSkill("archer_shot")).categorySkills).toEqual([]);
    const food = await loadSkill("bread");
    expect(food.categorySkills.length).toBeGreaterThan(20);
    expect(food.categorySkills.some((skill) => skill.id === "bread")).toBe(
      false,
    );
  });
});

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
  it("loads granting scroll cooldowns rather than unused skill timers", async () => {
    const data = await loadSkill("dispel");
    if (!data) throw new Error("Missing dispel");
    expect(data.scrollItems.map((item) => [item.id, item.cooldown])).toEqual([
      ["scroll_of_dispel_magic", 30],
    ]);
  });
  it("loads familiar skill caps from the summoned familiar", async () => {
    const data = await loadSkill("invoke_arcane_familiar");
    if (!data) throw new Error("Missing invoke_arcane_familiar");
    expect(
      data.familiarSkills.map((skill) => [skill.id, skill.max_level]),
    ).toEqual([["arcane_familiar_buff", 10]]);
  });
  it("shares mastery categories with class progression and restricts granting weapon casters", async () => {
    const song = await loadSkill("grand_symphony");
    if (!song) throw new Error("Missing grand_symphony");
    expect(song.skillCategories).toEqual(["Mastery"]);
    for (const [id, expected] of [
      ["blazefury", ["ranger"]],
      ["frostbite", ["cleric", "warrior"]],
    ] as const) {
      const data = await loadSkill(id);
      if (!data) throw new Error(`Missing ${id}`);
      const classes = data.mechanicsSpec.damageContexts.flatMap((context) =>
        context.casters.flatMap((caster) =>
          caster.kind === "player" ? [caster.classId] : [],
        ),
      );
      expect(classes.sort()).toEqual(expected);
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
