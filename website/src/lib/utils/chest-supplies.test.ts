import { describe, expect, it } from "vitest";
import { supplyChances, type SupplyItem } from "./chest-supplies";

const MANA = ["cleric", "ranger", "wizard", "druid", "necromancer"];
const RAGE = ["warrior", "rogue"];
const potions = (level: number, prefix: string): SupplyItem[] => [
  {
    pool: "potion",
    item_id: `${prefix}healing`,
    level_required: level,
    class_ids: [],
  },
  {
    pool: "potion",
    item_id: `${prefix}mana`,
    level_required: level,
    class_ids: MANA,
  },
  {
    pool: "potion",
    item_id: `${prefix}rage`,
    level_required: level,
    class_ids: RAGE,
  },
];
const ITEMS: SupplyItem[] = [
  ...potions(1, "minor_"),
  ...potions(20, "greater_"),
  ...Array.from({ length: 6 }, (_, i) => ({
    pool: "utility_potion" as const,
    item_id: `elixir_${i}`,
    level_required: 20,
    class_ids: [],
  })),
  { pool: "scroll", item_id: "gate_scroll", level_required: 0, class_ids: [] },
  ...Array.from({ length: 4 }, (_, i) => ({
    pool: "scroll" as const,
    item_id: `scroll_${i}`,
    level_required: 30,
    class_ids: [],
  })),
];
const chanceOf = (level: number, classId: string) =>
  new Map(
    supplyChances(ITEMS, 0.12, 0.03, level, classId).map((c) => [
      c.item_id,
      c.chance,
    ]),
  );

// Expected shares match 200,000 calls of WorldChestSupplies.Roll in the 0.10.6.0 game.
describe("chest supply chances", () => {
  it("gives the whole potion chance to potions before any utility potion is usable", () => {
    const chances = chanceOf(5, "warrior");
    expect(chances.get("minor_healing")).toBeCloseTo(0.06);
    expect(chances.get("minor_rage")).toBeCloseTo(0.06);
    expect(chances.has("minor_mana")).toBe(false);
    expect(chances.get("gate_scroll")).toBeCloseTo(0.03);
  });
  it("splits a third of the potion chance across the top utility tier", () => {
    const chances = chanceOf(25, "cleric");
    expect(chances.get("greater_healing")).toBeCloseTo(0.04);
    expect(chances.get("greater_mana")).toBeCloseTo(0.04);
    expect(chances.has("minor_healing")).toBe(false);
    expect(chances.get("elixir_0")).toBeCloseTo(0.04 / 6);
  });
  it("gives a class without its resource potion the whole potion share", () => {
    expect(chanceOf(25, "bard").get("greater_healing")).toBeCloseTo(0.08);
  });
  it("chooses among every usable scroll", () => {
    expect(chanceOf(35, "bard").get("gate_scroll")).toBeCloseTo(0.006);
  });
});
