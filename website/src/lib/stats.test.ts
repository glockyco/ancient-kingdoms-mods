import { describe, expect, test } from "vitest";
import { STATS, STAT_IDS } from "$lib/generated/stat-vocabulary";
import {
  formatStat,
  formatStatField,
  statField,
  statFieldName,
  statName,
} from "./stats";

describe("formatStat", () => {
  test("shows a fraction as a percentage with at most two decimals", () => {
    expect(formatStat("critical_chance", 0.05)).toBe("5%");
    expect(formatStat("critical_chance", 0.05833)).toBe("5.83%");
  });

  test("shows a whole-number stat with thousands separators", () => {
    expect(formatStat("health", 12500)).toBe("12,500");
  });

  test("shows a rate with at most two decimals", () => {
    expect(formatStat("health_regen", 2.5)).toBe("2.5");
    expect(formatStat("health_regen", 3)).toBe("3");
  });

  test("signs a bonus and leaves a total unsigned", () => {
    expect(formatStat("armor_class", 40, { signed: true })).toBe("+40");
    expect(formatStat("armor_class", 40)).toBe("40");
    expect(formatStat("haste", -0.1, { signed: true })).toBe("−10%");
    expect(formatStat("armor_class", 0, { signed: true })).toBe("0");
  });
});

describe("formatStatField", () => {
  test("shows a percent modifier as a percentage even for a whole-number stat", () => {
    const field = statField("skill", "damage_percent_bonus");
    expect(STATS[field.stat].format).toBe("integer");
    expect(formatStatField(field, 0.1, { signed: true })).toBe("+10%");
  });

  test("shows a flat modifier in its stat's format", () => {
    expect(formatStatField(statField("item", "critical_chance"), 0.05)).toBe(
      "5%",
    );
  });
});

describe("statName", () => {
  test("uses the item tooltip name in an item list when the game has one", () => {
    const id = STAT_IDS.find(
      (stat) =>
        STATS[stat].itemName && STATS[stat].itemName !== STATS[stat].name,
    );
    expect(id).toBeDefined();
    expect(statName(id!, "item")).toBe(STATS[id!].itemName);
    expect(statName(id!)).toBe(STATS[id!].name);
  });

  test("keeps the window name in an item list when the game has no item label", () => {
    const id = STAT_IDS.find((stat) => STATS[stat].itemName === null);
    expect(id).toBeDefined();
    expect(statName(id!, "item")).toBe(STATS[id!].name);
  });
});

describe("statFieldName", () => {
  test("names a percent modifier after its stat", () => {
    expect(statFieldName(statField("skill", "damage_percent_bonus"))).toBe(
      `${statName("attack_power")} %`,
    );
  });

  test("names a percent of the maximum per second after the stat and its pool", () => {
    expect(
      statFieldName(statField("skill", "health_percent_per_second_bonus")),
    ).toBe(`${statName("health_regen")}, % of ${statName("health")}`);
  });

  test("uses the weapon name for a weapon's item damage only", () => {
    const damage = statField("item", "damage");
    expect(statFieldName(damage, "item", { weapon: true })).toBe(
      STATS.attack_power.weaponItemName,
    );
    expect(statFieldName(damage, "item")).toBe(
      statName("attack_power", "item"),
    );
  });
});

describe("statField", () => {
  test("refuses a field the catalogue declares as not a stat", () => {
    expect(() => statField("item", "max_durability")).toThrow(
      'does not map item field "max_durability"',
    );
  });
});
