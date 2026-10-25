import { describe, expect, test } from "vitest";
import {
  altarVeteranLevelBonus,
  altarRewardTier,
  formatAltarRequirement,
  type AltarRewardTier,
} from "./altar";

describe("altarVeteranLevelBonus", () => {
  test("rounds a half level to the nearest even level, like Mathf.RoundToInt", () => {
    expect(altarVeteranLevelBonus(20)).toBe(0);
    expect(altarVeteranLevelBonus(60)).toBe(2);
    expect(altarVeteranLevelBonus(100)).toBe(2);
  });

  test("rounds past a half level up", () => {
    expect(altarVeteranLevelBonus(30)).toBe(1);
  });
});

const thresholds = {
  magic_reward_threshold: 40,
  epic_reward_threshold: 50,
  legendary_reward_threshold: 150,
};

describe("altarRewardTier", () => {
  test.each<[number, number, AltarRewardTier]>([
    [39, 0, "common"],
    [40, 0, "magic"],
    [49, 0, "magic"],
    [50, 0, "epic"],
    [50, 99, "epic"],
    [50, 100, "legendary"],
  ])("level %i with %i veteran points receives %s", (level, veteran, tier) => {
    expect(altarRewardTier(level, veteran, thresholds)).toBe(tier);
  });

  test("uses exported thresholds rather than fixed tiers", () => {
    const changed = {
      magic_reward_threshold: 20,
      epic_reward_threshold: 70,
      legendary_reward_threshold: 90,
    };
    expect(altarRewardTier(19, 0, changed)).toBe("common");
    expect(altarRewardTier(20, 0, changed)).toBe("magic");
    expect(altarRewardTier(50, 19, changed)).toBe("magic");
    expect(altarRewardTier(50, 20, changed)).toBe("epic");
    expect(altarRewardTier(50, 39, changed)).toBe("epic");
    expect(altarRewardTier(50, 40, changed)).toBe("legendary");
  });
});

describe("formatAltarRequirement", () => {
  test.each<[AltarRewardTier, string]>([
    ["common", "Below level 40"],
    ["magic", "Level 40 - 49"],
    ["epic", "Level 50, 0 - 99 veteran points"],
    ["legendary", "Level 50, 100 or more veteran points"],
  ])("formats %s", (tier, text) => {
    expect(formatAltarRequirement(tier, thresholds, 50)).toBe(text);
  });

  test("covers a tier crossing the level cap without implying early veteran points", () => {
    const changed = {
      magic_reward_threshold: 20,
      epic_reward_threshold: 70,
      legendary_reward_threshold: 90,
    };
    expect(formatAltarRequirement("magic", changed, 50)).toBe(
      "Level 20 - 49, or level 50 with 0 - 19 veteran points",
    );
    expect(formatAltarRequirement("epic", changed, 50)).toBe(
      "Level 50, 20 - 39 veteran points",
    );
    expect(formatAltarRequirement("legendary", changed, 50)).toBe(
      "Level 50, 40 or more veteran points",
    );
    expect(formatAltarRequirement("legendary", thresholds, 200)).toBe(
      "Level 150 - 199, or level 200 with 0 or more veteran points",
    );
  });

  test("common ranges have no lower level bound", () => {
    expect(formatAltarRequirement("common", thresholds, 50)).toBe(
      "Below level 40",
    );
    expect(
      formatAltarRequirement(
        "common",
        { ...thresholds, magic_reward_threshold: 70 },
        50,
      ),
    ).toBe("Below level 50, or level 50 with 0 - 19 veteran points");
  });

  test("missing fields fail with their names", () => {
    expect(() =>
      altarRewardTier(40, 0, { ...thresholds, magic_reward_threshold: null }),
    ).toThrow("magic_reward_threshold");
    expect(() =>
      formatAltarRequirement(
        "epic",
        thresholds,
        undefined as unknown as number,
      ),
    ).toThrow("progression_rules.max_level");
  });
});
