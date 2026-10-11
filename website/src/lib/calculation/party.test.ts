import { describe, expect, it } from "vitest";
import { partyGold } from "./party";

describe("party gold sharing", () => {
  it("rounds fractional shares upward, including exact halves", () => {
    expect(partyGold().example!({ gold: 101, members: 2 }).result).toMatch(
      /^51 /,
    );
    expect(partyGold().example!({ gold: 100, members: 3 }).result).toMatch(
      /^34 /,
    );
    expect(partyGold().example!({ gold: 100, members: 1 }).result).toMatch(
      /^100 /,
    );
  });
});
