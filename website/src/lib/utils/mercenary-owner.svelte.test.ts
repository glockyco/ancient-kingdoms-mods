import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mercenaryOwner,
  restoreMercenaryOwner,
  setMercenaryOwner,
} from "./mercenary-owner.svelte";

let storage: Map<string, string>;
beforeEach(() => {
  storage = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("shared mercenary owner storage", () => {
  it("migrates the legacy record without overwriting newer calculation values", () => {
    storage.set(
      "ak.mercenaryOwner",
      JSON.stringify({ level: 31, veteran: 17, charisma: 70 }),
    );
    storage.set("calculation:charisma", "100");
    restoreMercenaryOwner();
    expect({ ...mercenaryOwner }).toEqual({
      level: 31,
      veteran: 17,
      charisma: 100,
    });
    expect(storage.get("calculation:level")).toBe("31");
    expect(storage.get("calculation:veteran")).toBe("17");
    expect(storage.has("ak.mercenaryOwner")).toBe(false);
  });
  it("writes only the changed raw number and rereads values on the next mount", () => {
    restoreMercenaryOwner();
    storage.set("calculation:charisma", "70");
    setMercenaryOwner("level", 31);
    expect(storage.get("calculation:level")).toBe("31");
    expect(storage.get("calculation:charisma")).toBe("70");
    restoreMercenaryOwner();
    expect(mercenaryOwner.charisma).toBe(70);
    storage.delete("calculation:charisma");
    restoreMercenaryOwner();
    expect(mercenaryOwner.charisma).toBe(0);
  });
  it("bounds and rounds owner controls without rewriting a shared stat on read", () => {
    storage.set("calculation:level", "30.5");
    storage.set("calculation:veteran", "-1");
    storage.set("calculation:charisma", "500");
    restoreMercenaryOwner();
    expect({ ...mercenaryOwner }).toEqual({
      level: 31,
      veteran: 0,
      charisma: 200,
    });
    expect(storage.get("calculation:charisma")).toBe("500");
  });
  it("removes malformed legacy data and ignores nonfinite shared data", () => {
    storage.set("ak.mercenaryOwner", "invalid");
    storage.set("calculation:level", "NaN");
    restoreMercenaryOwner();
    expect(mercenaryOwner.level).toBe(50);
    expect(storage.has("ak.mercenaryOwner")).toBe(false);
  });
});
