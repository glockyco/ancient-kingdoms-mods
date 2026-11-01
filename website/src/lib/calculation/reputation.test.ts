import { describe, expect, it } from "vitest";
import { reputationExample, npcReputation } from "./reputation";

describe("reputation calculations", () => {
  it("raises a gain with Honesty at rank 0 and rank 5", () => {
    const gain = (rank: number) =>
      npcReputation().example!({ honestyRank: rank }).result;
    expect(gain(-1)).toMatch(/^\+5\u202f?400 /);
    expect(gain(0)).toMatch(/^\+5\u202f?535 /);
    expect(gain(5)).toMatch(/^\+6\u202f?750 /);
  });
  it("rounds a gain raised by Honesty half to even and leaves losses alone", () => {
    const result = reputationExample(10, 20000, false).example!({
      honestyRank: 0,
    }).result;
    expect(result).toBe(
      "+20 reputation with each faction it raises, −7.5 with each faction it lowers",
    );
  });
  it("rounds the Hit Points contribution to even before adding level", () => {
    expect(reputationExample(10, 5000, false).example!({}).result).toContain(
      "+12",
    );
    expect(reputationExample(10, 7000, false).example!({}).result).toContain(
      "+14",
    );
  });
  it("keeps fractional normal-monster losses", () => {
    expect(reputationExample(1, 2000, false).example!({}).result).toContain(
      "−0.75",
    );
    expect(reputationExample().example!({}).result).toContain("+31\u202F400");
  });
  it("applies boss and elite rank multipliers independently to gains and losses", () => {
    const boss = reputationExample(56, 800_000).example!({});
    expect(boss.result.match(/\d[\d\u202F]*/g)).toEqual(["9\u202F120", "112"]);
    const elite = reputationExample(56, 800_000, false, true).example!({});
    expect(elite.result.match(/\d[\d\u202F]*/g)).toEqual(["4\u202F560", "56"]);
  });
});

it("uses the Notable multiplier only for positive NPC reputation", () => {
  expect(npcReputation().example!({}).result).toContain("+5\u202F400");
  expect(npcReputation().example!({}).result).toContain("−300");
  expect(npcReputation(1, false).example!({}).result).toContain("+1.5");
});
