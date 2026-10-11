import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  forget,
  loadRemembered,
  rememberedValue,
} from "$lib/calculation/remembered.svelte";
import { mercenaryOwner, setMercenaryOwner } from "./mercenary-owner.svelte";

let storage: Map<string, string>;
beforeEach(() => {
  storage = new Map();
  vi.stubGlobal("localStorage", {
    get length() {
      return storage.size;
    },
    key: (index: number) => [...storage.keys()][index] ?? null,
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  for (const key of ["level", "veteran", "charisma"]) forget(key);
});
afterEach(() => vi.unstubAllGlobals());

describe("mercenary owner values", () => {
  it("bounds and rounds stored values without rewriting them", () => {
    storage.set("calculation:level", "30.5");
    storage.set("calculation:veteran", "-1");
    storage.set("calculation:charisma", "500");
    loadRemembered();
    expect({ ...mercenaryOwner }).toEqual({
      level: 31,
      veteran: 0,
      charisma: 200,
    });
    expect(storage.get("calculation:charisma")).toBe("500");
  });

  it("shares a set value with every calculation that reads the key", () => {
    setMercenaryOwner("charisma", 70.4);
    expect(rememberedValue("charisma")).toBe(70);
    expect(storage.get("calculation:charisma")).toBe("70");
  });

  it("falls back to defaults for missing or nonfinite stored values", () => {
    storage.set("calculation:level", "NaN");
    loadRemembered();
    expect(mercenaryOwner.level).toBe(50);
    expect(mercenaryOwner.charisma).toBe(0);
  });

  it("drops a value that another page removed from storage", () => {
    storage.set("calculation:charisma", "70");
    loadRemembered();
    storage.delete("calculation:charisma");
    loadRemembered();
    expect(mercenaryOwner.charisma).toBe(0);
  });
});
