import { describe, expect, it } from "vitest";
import { mercenaryPrice, mercenaryRank } from "./mercenaries";
import { TOTAL_VETERAN_POINTS_NOTE } from "./inputs";

describe("mercenary calculations", () => {
  it("rounds fractional base prices before discounting", () => {
    expect(
      mercenaryPrice().example!({ level: 11, veteran: 1, charisma: 0 }).result,
    ).toContain("35 gold");
    expect(
      mercenaryPrice().example!({ level: 12, veteran: 0, charisma: 0 }).result,
    ).toContain("21 gold");
    // Level 20's base is 45, so the upward-rounded 14% discount removes 7.
    expect(
      mercenaryPrice().example!({ level: 20, veteran: 0, charisma: 70 }).result,
    ).toContain("38 gold");
  });
  it("matches float32 discount edges in both price displays", () => {
    expect(
      mercenaryPrice().example!({ level: 10, veteran: 2, charisma: 70 }).result,
    ).toContain("43 gold");
    expect(
      mercenaryPrice(true).example!({ level: 18, veteran: 3, charisma: 70 })
        .result,
    ).toContain("43 gold");
  });
  it("rounds level and veteran rank contributions down independently", () => {
    expect(
      mercenaryRank(30).example!({ level: 29, veteran: 19 }).result,
    ).toContain("6");
    expect(
      mercenaryRank(5).example!({ level: 50, veteran: 200 }).result,
    ).toContain("5");
    expect(
      mercenaryRank(5, true).example!({ level: 1, veteran: 0 }).result,
    ).toContain("1");
  });
  it("uses the unspent-plus-ranks total for prices and rank contributions", () => {
    const total = 8 + 51;
    expect(
      mercenaryPrice().example!({ level: 50, veteran: total, charisma: 0 })
        .result,
    ).toContain("1\u202F305 gold");
    expect(
      mercenaryPrice(true).example!({ level: 50, veteran: total, charisma: 0 })
        .result,
    ).toContain("890 gold");
    expect(
      mercenaryRank(30).example!({ level: 50, veteran: total }).result,
    ).toContain("15");
    expect(mercenaryRank().note).toBe(TOTAL_VETERAN_POINTS_NOTE);
    expect(
      mercenaryPrice().inputs!.find((input) => input.key === "veteran")
        ?.remember,
    ).toBe(true);
  });
});
