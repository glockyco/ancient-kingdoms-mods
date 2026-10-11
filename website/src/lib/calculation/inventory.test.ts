import { describe, expect, it } from "vitest";
import { evaluateRepair, merchantPrice, repairCost } from "./inventory";

describe("merchant calculations", () => {
  it("rounds the repair base to even and the discount upward separately", () => {
    expect(evaluateRepair(10, 50, 100, 0)).toMatchObject({ base: 2, total: 2 });
    expect(evaluateRepair(14, 50, 100, 0)).toMatchObject({ base: 4, total: 4 });
    expect(evaluateRepair(1000, 30, 100, 100)).toMatchObject({
      base: 350,
      saving: 70,
      total: 280,
    });
  });
  it("caps repair discounts at 50%, not the purchase cap", () => {
    expect(evaluateRepair(1000, 0, 100, 300).total).toBe(250);
    expect(
      repairCost().example!({
        itemValue: 0,
        durability: 0,
        maximumDurability: 100,
        charisma: 0,
      }).result,
    ).toContain("1 gold");
  });
  it("rounds durability value before applying a sale bonus", () => {
    expect(
      merchantPrice(true).example!({
        itemValue: 5,
        durability: 50,
        maximumDurability: 100,
        charisma: 0,
      }).result,
    ).toContain("2 gold");
    expect(
      merchantPrice(true).example!({
        itemValue: 7,
        durability: 50,
        maximumDurability: 100,
        charisma: 0,
      }).result,
    ).toContain("4 gold");
  });
  it("preserves one-gold items and the minimum purchase price", () => {
    expect(
      merchantPrice(true).example!({
        itemValue: 1,
        durability: 0,
        maximumDurability: 100,
        charisma: 100,
      }).result,
    ).toContain("1 gold");
    expect(
      merchantPrice(false).example!({ itemValue: 1000, charisma: 200 }).result,
    ).toContain("750 gold");
  });
});
