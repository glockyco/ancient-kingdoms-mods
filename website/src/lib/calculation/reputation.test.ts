import { describe, expect, it } from "vitest";
import { reputationExample, npcReputation } from "./reputation";

describe("reputation calculations", () => {
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
    expect(reputationExample().example!({}).result).toContain("+31,400");
  });
  it("applies boss and elite rank multipliers independently to gains and losses", () => {
    const boss = reputationExample(56, 800_000).example!({});
    expect(boss.result.match(/\d[\d,]*/g)).toEqual(["9,120", "112"]);
    const elite = reputationExample(56, 800_000, false, true).example!({});
    expect(elite.result.match(/\d[\d,]*/g)).toEqual(["4,560", "56"]);
  });
});

it("uses the Notable multiplier only for positive NPC reputation", () => {
  expect(npcReputation().example!({}).result).toContain("+5,400");
  expect(npcReputation().example!({}).result).toContain("−300");
  expect(npcReputation(1, false).example!({}).result).toContain("+1.5");
});
