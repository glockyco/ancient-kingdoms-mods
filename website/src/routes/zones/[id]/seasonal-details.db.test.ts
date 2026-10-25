import { describe, expect, it } from "vitest";
import { query } from "$lib/db.server";
import type { Season } from "$lib/data/seasonal-events";
import { load as monsterLoader } from "../../monsters/[id]/+page.server";
import { load as npcLoader } from "../../npcs/[id]/+page.server";
import { load as questLoader } from "../../quests/[id]/+page.server";
import {
  load as skillLoader,
  type SkillDetailPageData,
} from "../../skills/[id]/+page.server";
import { load as zoneLoader } from "./+page.server";
import type { MonsterDetailData } from "$lib/types/monsters";
import type { NpcDetailPageData } from "$lib/types/npcs";
import type { QuestDetailPageData } from "$lib/types/quests";
import type { ZoneDetailData } from "$lib/types/zones";

const loadMonster = monsterLoader as (
  event: Parameters<typeof monsterLoader>[0],
) => Promise<MonsterDetailData>;
const loadNpc = npcLoader as (
  event: Parameters<typeof npcLoader>[0],
) => Promise<NpcDetailPageData>;
const loadQuest = questLoader as (
  event: Parameters<typeof questLoader>[0],
) => Promise<QuestDetailPageData>;
const loadSkill = skillLoader as (
  event: Parameters<typeof skillLoader>[0],
) => Promise<SkillDetailPageData>;
const loadZone = zoneLoader as (
  event: Parameters<typeof zoneLoader>[0],
) => Promise<ZoneDetailData>;

const event = (id: string) => ({ params: { id } });

describe("seasonal detail pages", () => {
  it.each(["witch", "pumpkin_head"])(
    "labels %s and its metadata",
    async (id) => {
      const data = await loadMonster(
        event(id) as Parameters<typeof loadMonster>[0],
      );
      expect(data.monster.season).toBe("halloween");
      expect(data.monster.spawn_time_start).toBe(20);
      expect(data.monster.spawn_time_end).toBe(8);
      expect(data.description).toContain("only during Halloween");
    },
  );

  it("keeps seasonal merchant offers separate by season with item-currency prices", async () => {
    const data = await loadNpc(
      event("adventurer_argosh") as Parameters<typeof loadNpc>[0],
    );
    expect(data.seasonalStock.map((group) => group.season)).toEqual([
      "halloween",
      "christmas",
    ]);
    for (const group of data.seasonalStock) {
      const skyflares = group.items.filter(
        (item) => item.item_id === "pack_10_skyflares",
      );
      expect(skyflares).toHaveLength(1);
      expect(skyflares[0]).toMatchObject({
        price: 1,
        currency_item_id: "festival_token",
      });
    }
    expect(
      data.itemsSold.some((item) => item.item_id === "pack_10_skyflares"),
    ).toBe(false);
  });

  it("loads Santa and the completion-only quest at Grimnir", async () => {
    const santa = await loadNpc(
      event("santa_claus") as Parameters<typeof loadNpc>[0],
    );
    expect(santa.npc.season).toBe("christmas");
    expect(santa.spawns.map((spawn) => spawn.zone_id)).toEqual(["everfrost"]);
    expect(santa.description).toContain("only during the Winter Festival");
    expect(santa.questsOffered).toHaveLength(3);
    for (const quest of santa.questsOffered) {
      expect(quest.seasons).toEqual(["christmas"]);
      const data = await loadQuest(
        event(quest.id) as Parameters<typeof loadQuest>[0],
      );
      expect(data.seasons).toEqual(["christmas"]);
      expect(data.npcSeasons.santa_claus).toBe("christmas");
      expect(data.description).toContain(
        "Accept only during the Winter Festival",
      );
      expect(data.description).toContain("Repeatable 8 hours after completion");
    }
    const grimnir = await loadNpc(
      event("grimnir_stonehammer") as Parameters<typeof loadNpc>[0],
    );
    expect(grimnir.npc.season).toBeNull();
    expect(grimnir.questsCompletedHere).toContainEqual(
      expect.objectContaining({
        name: "A Wish for the Winter Heart",
        seasons: ["christmas"],
      }),
    );
  });

  it("loads the hidden turn-ins of all 23 NPCs with completion-only quest roles", async () => {
    const npcs = query<{
      npc_id: string;
    }>(`SELECT DISTINCT m.npc_id FROM npc_quest_memberships m
      WHERE m.role = 'complete' AND NOT EXISTS (
        SELECT 1 FROM npc_quest_memberships offered WHERE offered.npc_id = m.npc_id AND offered.quest_id = m.quest_id AND offered.role = 'offer'
      )`);
    expect(npcs).toHaveLength(23);
    for (const npc of npcs) {
      const data = await loadNpc(
        event(npc.npc_id) as Parameters<typeof loadNpc>[0],
      );
      expect(
        data.questsCompletedHere.some(
          (completed) =>
            !data.questsOffered.some((offered) => offered.id === completed.id),
        ),
      ).toBe(true);
    }
  });

  it("identifies buff grants by the seasons table", async () => {
    const seasons = query<{ id: Season; buff_skill_id: string }>(
      "SELECT id, buff_skill_id FROM seasons ORDER BY id",
    );
    expect(seasons).toHaveLength(2);
    for (const season of seasons) {
      const data = await loadSkill(
        event(season.buff_skill_id) as Parameters<typeof loadSkill>[0],
      );
      expect(data.season).toBe(season.id);
      expect(data.learningRanks).toEqual([]);
      expect(data.description).toContain(
        {
          halloween: "Granted to every online player during Halloween.",
          christmas:
            "Granted to every online player during the Winter Festival.",
        }[season.id],
      );
      expect(data.effectSummary).toContain("cooking");
      expect(data.effectSummary).toContain("scribing & augmentation");
      expect(data.effectSummary).not.toMatch(/3605|1h|60m/);
    }
  });

  it.each(["the_lone-lands", "everfrost"])(
    "retains seasonal actors in %s",
    async (id) => {
      const data = await loadZone(event(id) as Parameters<typeof loadZone>[0]);
      expect(
        data.monsters
          .filter((monster) => monster.season)
          .map((monster) => monster.id)
          .sort(),
      ).toEqual(["pumpkin_head", "witch"]);
      expect(
        data.monsters
          .filter((monster) => monster.season)
          .every(
            (monster) =>
              monster.spawn_count > 0 && monster.level_max >= monster.level_min,
          ),
      ).toBe(true);
      if (id === "the_lone-lands") expect(data.zone.level_median).toBe(19);
      else
        expect(data.npcs.find((npc) => npc.id === "santa_claus")?.season).toBe(
          "christmas",
        );
    },
  );
});
