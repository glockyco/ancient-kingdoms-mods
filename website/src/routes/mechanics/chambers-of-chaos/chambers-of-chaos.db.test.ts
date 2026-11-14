import { describe, expect, test } from "vitest";
import { load } from "./+page.server";
import type { PageData } from "./$types";

// The load function reads no request state.
const data = await (load as unknown as () => Promise<PageData>)();

describe("Chambers of Chaos page data", () => {
  test("loads the keeper, pool, groups, chain, price and captures", () => {
    expect(data.keeper.id).toBe("mordrath");
    expect(data.monsters).toHaveLength(9);
    expect(data.groups).toHaveLength(7);
    expect(data.groups.filter((group) => group.support === null)).toHaveLength(
      1,
    );
    expect(data.families).toHaveLength(12);
    for (const family of data.families) {
      expect(family.tiers.map((tier) => tier.quality)).toEqual([1, 2, 3, 4]);
      expect(family.tiers[3].name).toBe(`Legendary ${family.name}`);
    }
    expect(data.catalyst.vendors).toHaveLength(5);
    expect(data.catalyst.price).toBe(10);
    expect(data.captures.map((capture) => capture.kind).sort()).toEqual([
      "illustration_2",
      "illustration_3",
      "shot",
    ]);
  });

  test("never names the excluded items or carries challenge content", () => {
    const text = JSON.stringify(data, (_key, value) =>
      value instanceof Map || value instanceof Set ? [...value] : value,
    );
    for (const name of ["Seal of Chaos", "Chaos Token", "Torn Page"])
      expect(text).not.toContain(name);
    expect(text).not.toMatch(/seal_of_chaos|chaos_token|torn_page/);
  });
});
