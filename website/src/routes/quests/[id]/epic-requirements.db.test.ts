import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { load } from "./+page.server";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import type { QuestDetailPageData } from "$lib/types/quests";
import { getItemUsages } from "$lib/server/item-usages";

async function loadQuest(id: string): Promise<QuestDetailPageData> {
  return (await load({ params: { id } } as Parameters<
    typeof load
  >[0])) as QuestDetailPageData;
}

describe("published epic quest completion requirements", () => {
  it("loads books read before completion", async () => {
    const data = await loadQuest("13_valoraths_empty_chairs");
    expect(data.quest.book_requirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          item_id: "the_fall_of_valorath",
          withheld: 0,
        }),
      ]),
    );
  });

  it("loads the cooking threshold alongside the supper ingredients", async () => {
    const data = await loadQuest("12_the_supper_before_the_ruins");
    expect(data.quest.profession_requirements).toEqual([
      { profession_id: "cooking", name: "Cooking", minimum_percent: 60 },
    ]);
    expect([
      ...data.gatherInventoryItems,
      ...data.requiredItems,
      ...data.gatherItems,
    ]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "zesty_sabretooth_steak", amount: 2 }),
      ]),
    );
  });

  it.each([
    [
      "the_fall_of_valorath",
      [
        "10_the_empires_curse",
        "12_a_brothers_legacy",
        "12_an_empires_epitaph",
        "13_valoraths_empty_chairs",
      ],
    ],
    ["chains_of_shadows", ["8_a_name_in_chains", "8_the_captives_voice"]],
  ])("lists quests requiring %s to be read", async (itemId, questIds) => {
    const db = new Database(DB_SOURCE_PATH, { readonly: true });
    try {
      const usages = await getItemUsages(db, itemId);
      expect(
        usages.quests
          .filter((quest) => quest.purpose === "read")
          .map((quest) => quest.quest_id)
          .sort(),
      ).toEqual([...questIds].sort());
    } finally {
      db.close();
    }
  });
});
