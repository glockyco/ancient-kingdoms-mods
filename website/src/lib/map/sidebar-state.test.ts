import { describe, expect, test } from "vitest";

import {
  MAP_SIDEBAR_COLLAPSED_KEY,
  readStoredSidebarCollapsed,
  writeStoredSidebarCollapsed,
} from "./sidebar-state";

describe("map sidebar persisted state", () => {
  test("reads collapsed state from storage", () => {
    expect(readStoredSidebarCollapsed({ getItem: () => "true" })).toBe(true);
    expect(readStoredSidebarCollapsed({ getItem: () => "false" })).toBe(false);
    expect(readStoredSidebarCollapsed({ getItem: () => null })).toBe(false);
  });

  test("persists collapsed state with the shared key", () => {
    const writes: Array<[string, string]> = [];

    writeStoredSidebarCollapsed(
      {
        setItem: (key: string, value: string) => writes.push([key, value]),
      },
      true,
    );

    expect(writes).toEqual([[MAP_SIDEBAR_COLLAPSED_KEY, "true"]]);
  });
});
