import { describe, expect, it } from "vitest";
import { evaluateRepair, merchantPrice, repairCost } from "./inventory";

describe("merchant calculations", () => {
  it("rounds the repair base to even and the discount upward separately", () => {
    expect(evaluateRepair(10, 0.5, 0)).toMatchObject({ base: 2, total: 2 });
    expect(evaluateRepair(14, 0.5, 0)).toMatchObject({ base: 4, total: 4 });
    expect(evaluateRepair(1000, 0.3, 100)).toMatchObject({
      base: 350,
      saving: 70,
      total: 280,
    });
  });
  it("caps repair discounts at 50%, not the purchase cap", () => {
    expect(evaluateRepair(1000, 0, 300).total).toBe(250);
    expect(
      repairCost().example!({
        itemValue: 0,
        durability: 0,
        charisma: 0,
      }).result,
    ).toContain("1 gold");
  });
  it("rounds durability value before applying a sale bonus", () => {
    expect(
      merchantPrice(true).example!({
        itemValue: 5,
        durability: 0.5,
        charisma: 0,
      }).result,
    ).toContain("2 gold");
    expect(
      merchantPrice(true).example!({
        itemValue: 7,
        durability: 0.5,
        charisma: 0,
      }).result,
    ).toContain("4 gold");
  });
  it("preserves one-gold items and the minimum purchase price", () => {
    expect(
      merchantPrice(true).example!({
        itemValue: 1,
        durability: 0,
        charisma: 100,
      }).result,
    ).toContain("1 gold");
    expect(
      merchantPrice(false).example!({ itemValue: 1000, charisma: 200 }).result,
    ).toContain("750 gold");
  });
  it("uses the tooltip percentage for damaged and intact repair estimates", () => {
    expect(evaluateRepair(1000, 0.3, 100).total).toBe(280);
    expect(evaluateRepair(1000, 1, 100).missing).toBe(0);
    expect(
      merchantPrice(true).example!({
        itemValue: 1000,
        durability: 0.3,
        charisma: 100,
      }).result,
    ).toContain("360 gold");
  });
});
