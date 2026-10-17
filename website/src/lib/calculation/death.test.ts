import { describe, expect, it } from "vitest";
import { deathRecovery } from "./death";

describe("death recovery", () => {
  it("rounds recovered XP halves to even and caps Mana independently", () => {
    const result = deathRecovery().example!({
      lostXp: 101,
      maxHealth: 2000,
      maxMana: 100,
    }).result;
    expect(result).toContain("50 XP");
    expect(result).toContain("76 XP");
    expect(result).toContain("1,200 Hit Points");
    expect(result).toContain("100 Mana");
    expect(
      deathRecovery().example!({ lostXp: 103, maxHealth: 2000, maxMana: 500 })
        .result,
    ).toContain("52 XP");
  });
});
