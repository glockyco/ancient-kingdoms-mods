import { describe, expect, it } from "vitest";
import { mysticSparkMana } from "./character";

describe("Mystic Spark Mana gain", () => {
  it("caps eligible damage before rounding downward", () => {
    expect(mysticSparkMana(200, 150).example!({}).result).toMatch(/^52 Mana/);
    expect(mysticSparkMana(200, 10).example!({}).result).toMatch(/^3 Mana/);
    expect(mysticSparkMana(100, 200).example!({}).result).toMatch(/^35 Mana/);
  });
});
