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
  it("lists distinct NPC casters with their real NPC-only mechanics context", async () => {
    const data = await loadSkill("npc_attack");
    const expected = query<{ id: string; name: string }>(
      `SELECT DISTINCT n.id, n.name FROM npc_skills ns
       JOIN npcs n ON n.id = ns.npc_id
       WHERE ns.skill_id = ? ORDER BY n.name, n.id`,
      ["npc_attack"],
    );
    expect(expected.length).toBeGreaterThan(0);
    expect(data.usedByNpcs).toEqual(expected);
    expect(data.usedByMonsters).toEqual([]);
    expect(data.learningRanks).toEqual([]);
    expect(data.mechanicsSpec.damageContexts).toContainEqual({
      casters: [{ kind: "monster" }],
      formula: "monster_melee",
    });
  });
});

describe("skill game tooltips", () => {
  const definitions = query<{
    id: string;
    max_level: number;
    learn_default: number;
    player_classes: string | null;
    level_requirement: string;
    skill_point_cost: string;
  }>(
    "SELECT id,max_level,learn_default,player_classes,level_requirement,skill_point_cost FROM skills WHERE tooltip_template IS NOT NULL AND tooltip_template != ''",
  );
  it.each(definitions)(
    "loads $id with resolved tooltip tokens and correct learning ranks",
    async (definition) => {
      const { id } = definition;
      const data = await loadSkill(id);
      if (!data) throw new Error(`Missing skill ${id}`);
      expect(data.gameTooltip, id).not.toMatch(/\{[^{}]+\}/);
      expect(data.gameTooltip, id).not.toContain("%%");
      if (data.skill.tooltip_template?.includes("{NAME}")) {
        expect(data.gameTooltip, id).toContain(data.skill.name);
      }
      const firstRank = definition.learn_default ? 2 : 1;
      const classes: string[] = JSON.parse(definition.player_classes ?? "[]");
      const level: { base_value: number; bonus_per_level: number } = JSON.parse(
        definition.level_requirement,
      );
      const cost: { base_value: number; bonus_per_level: number } = JSON.parse(
        definition.skill_point_cost,
      );
      const ranks = classes.length
        ? Math.max(0, definition.max_level - firstRank + 1)
        : 0;
      expect(data.learningRanks, id).toEqual(
        Array.from({ length: ranks }, (_, index) => {
          const rank = firstRank + index;
          return {
            rank,
            requiredLevel:
              level.base_value + level.bonus_per_level * (rank - 1),
            pointCost: cost.base_value + cost.bonus_per_level * (rank - 1),
          };
        }),
      );
      if (data.learningRanks.length > 0) {
        expect(data.skill.level_required).toBe(
          data.learningRanks[0].requiredLevel,
        );
        expect(data.skill.required_skill_points).toBe(
          data.learningRanks[0].pointCost,
        );
      }
    },
  );
  it("loads granting scroll cooldowns rather than unused skill timers", async () => {
    const data = await loadSkill("dispel");
    if (!data) throw new Error("Missing dispel");
    expect(data.scrollItems.map((item) => [item.id, item.cooldown])).toEqual([
      ["scroll_of_dispel_magic", 30],
    ]);
  });
  it.each([
    ["skyflare", 0],
    ["dispel", 1],
  ] as const)(
    "loads the granting scroll cast time for %s",
    async (id, expectedCastTime) => {
      const data = await loadSkill(id);
      expect(data.scrollItems.length).toBeGreaterThan(0);
      expect(data.scrollCastTime).toBe(expectedCastTime);
    },
  );
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

  it("fills resource, cadence and percentage aliases when their base tokens are absent", () => {
    expect(
      _fillSkillTooltip({
        name: "Example",
        tooltip_template:
          "{MANACOSTS}/{ENERGYCOSTS}/{CADENCEDAMAGE}/{CADENCEHEAL}/{LIFETAPHEALINGBONUS}/{DOTEXECUTEBONUS}",
        mana_cost: { base_value: 2, bonus_per_level: 0 },
        energy_cost: { base_value: 3, bonus_per_level: 0 },
        damage: { base_value: 10, bonus_per_level: 0 },
        heals_health: { base_value: 15, bonus_per_level: 0 },
        lifetap_healing_percent_bonus: { base_value: 0.5, bonus_per_level: 0 },
        damage_over_time_execute_bonus: { base_value: 0.3, bonus_per_level: 0 },
        duration_base: 0,
        fear_resist_chance_bonus_cap: 0,
        bard_song_duration_bonus_per_level: 0,
        food_and_drink_buff_duration_bonus_per_level: 0,
      } as SkillDetailView),
    ).toBe("2/3/10/15/50/30");
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
