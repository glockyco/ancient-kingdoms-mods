import { describe, expect, test } from "vitest";
import { load } from "./+page.server";

describe("Adventuring quest objectives", () => {
  test("loads every delivery item and amount alongside kill targets", async () => {
    const { quests } = await load();
    expect(
      quests.find((quest) => quest.id === "2_gather_bellflowers")?.objectives,
    ).toEqual([
      {
        type: "gather",
        target_id: "bellflower",
        target_name: "Bellflower",
        amount: 30,
      },
    ]);
    const deliveries = quests.filter(
      (quest) => quest.display_type === "Deliver",
    );
    expect(deliveries.length).toBeGreaterThan(0);
    expect(deliveries.every((quest) => quest.objectives.length > 0)).toBe(true);
    expect(
      quests.some((quest) =>
        quest.objectives.some((objective) => objective.type === "kill"),
      ),
    ).toBe(true);
  });
});
