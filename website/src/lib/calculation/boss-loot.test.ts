import { describe, expect, it } from "vitest";
import { calculateBossLootChance, type BossLootDrop } from "./boss-loot";

function equipment(item_id: string, probability: number): BossLootDrop {
  return {
    item_id,
    item_name: item_id,
    probability,
    counts_as_equipment: true,
    requires_quest: false,
  };
}

describe("boss loot per-kill probability", () => {
  it("includes baseline top-ups and weighted exclusion after initial successes", () => {
    const drops = [
      equipment("a", 0.1),
      equipment("b", 0.2),
      equipment("c", 0.3),
    ];
    expect(calculateBossLootChance(drops, "a")).toBeCloseTo(0.184, 12);
    expect(
      calculateBossLootChance(drops, "a", { fatecharm: true }),
    ).toBeCloseTo(0.4135, 12);
  });

  it("includes the eighth eligible item in a seven-equal-plus-one-rare pool", () => {
    const drops = [
      ...Array.from({ length: 7 }, (_, index) =>
        equipment(`equal-${index}`, 0.1),
      ),
      equipment("rare", 0.05),
      { ...equipment("material", 0.35), counts_as_equipment: false },
    ];
    expect(calculateBossLootChance(drops, "equal-0")).toBeCloseTo(
      0.160584274,
      12,
    );
    expect(
      calculateBossLootChance(drops, "equal-0", { fatecharm: true }),
    ).toBeCloseTo(0.2708553614945055, 12);
  });

  it("exhausts the eligible pool instead of promising two distinct items", () => {
    const drops = [equipment("a", 0.1), equipment("b", 0.3)];
    expect(calculateBossLootChance(drops, "a")).toBeCloseTo(0.2575, 12);
    expect(
      calculateBossLootChance(drops, "a", { fatecharm: true }),
    ).toBeCloseTo(1, 12);
    expect(calculateBossLootChance([equipment("a", 0)], "a")).toBe(0);
  });

  it("uses duplicate template rows as both weights and per-name caps", () => {
    const drops = [
      equipment("a", 0.1),
      equipment("a", 0.1),
      equipment("b", 0.3),
    ];
    expect(calculateBossLootChance(drops, "a")).toBeCloseTo(0.4168, 12);
    const repeatedCompetitor = [
      equipment("a", 0.1),
      equipment("b", 0.2),
      equipment("b", 0.2),
    ];
    // B can fill both equipment slots. Its weight remains 0.4 after one copy.
    expect(
      calculateBossLootChance(repeatedCompetitor, "a", { fatecharm: true }),
    ).toBeCloseTo(0.36496, 12);
  });

  it("does not top up non-equipment, augments or quality-zero items", () => {
    const drops = [
      equipment("a", 0.1),
      { ...equipment("augment", 0.9), counts_as_equipment: false },
    ];
    expect(calculateBossLootChance(drops, "a")).toBeCloseTo(1, 12);
    expect(calculateBossLootChance(drops, "augment")).toBeCloseTo(0.9, 12);
  });

  it("honors quest gates and the 100-attempt limit", () => {
    const drops = [
      equipment("a", 0.1),
      { ...equipment("quest", 0.9), requires_quest: true },
    ];
    expect(calculateBossLootChance(drops, "a")).toBeCloseTo(1 - 0.9 ** 101, 12);
    expect(calculateBossLootChance(drops, "quest")).toBe(0);
    const options = { neededQuestItemIds: new Set(["quest"]) };
    expect(calculateBossLootChance(drops, "a", options)).toBeCloseTo(1, 12);
    expect(calculateBossLootChance(drops, "quest", options)).toBeCloseTo(
      0.981,
      12,
    );
  });

  it("counts random equipment awards but never selects random containers for top-ups", () => {
    const random: BossLootDrop = {
      item_id: "random",
      item_name: "random",
      probability: 0.8,
      counts_as_equipment: false,
      requires_quest: false,
      random_items: [{ item_id: "other", counts_as_equipment: true }],
    };
    const drops = [equipment("a", 0.1), random];
    expect(calculateBossLootChance(drops, "a")).toBeCloseTo(0.28, 12);
    expect(
      calculateBossLootChance(drops, "a", { fatecharm: true }),
    ).toBeCloseTo(1, 12);
    expect(calculateBossLootChance(drops, "other")).toBeCloseTo(0.8, 12);
    expect(calculateBossLootChance(drops, "random")).toBe(0);
    expect(
      calculateBossLootChance([{ ...random, random_items: [] }], "other"),
    ).toBe(0);
  });

  it("preserves repeated random-pool outcomes and applies quest gating first", () => {
    const random: BossLootDrop = {
      ...equipment("random", 0.6),
      counts_as_equipment: false,
      random_items: [
        { item_id: "a", counts_as_equipment: true },
        { item_id: "a", counts_as_equipment: true },
        { item_id: "b", counts_as_equipment: false },
      ],
    };
    expect(calculateBossLootChance([random], "a")).toBeCloseTo(0.4, 12);
    const questRandom = { ...random, requires_quest: true };
    const options = { neededQuestItemIds: new Set(["random"]) };
    expect(calculateBossLootChance([questRandom], "a", options)).toBe(0);
    expect(
      calculateBossLootChance([questRandom], "random", options),
    ).toBeCloseTo(0.6, 12);
  });
});
