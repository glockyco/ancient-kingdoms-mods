import { describe, expect, it } from "vitest";
import type { TableUrlState } from "./url-state";
import {
  isDefaultPaginationState,
  listPageNumber,
  listPageUrl,
  tablePageUrl,
} from "./crawlable-pagination";

const initialSorting = [
  { id: "level", desc: true },
  { id: "name", desc: false },
];

function state(changes: Partial<TableUrlState> = {}): TableUrlState {
  return {
    search: "",
    filters: [],
    visibility: {},
    sorting: initialSorting.map((sort) => ({ ...sort })),
    pagination: { pageIndex: 1, pageSize: 20 },
    ...changes,
  };
}

describe("crawlable pagination policy", () => {
  it("uses links at any default page, even with a column visibility preference", () => {
    expect(isDefaultPaginationState(state(), initialSorting, 20)).toBe(true);
    expect(
      isDefaultPaginationState(
        state({ visibility: { name: false } }),
        initialSorting,
        20,
      ),
    ).toBe(true);
    expect(
      isDefaultPaginationState(
        state({ pagination: { pageIndex: 42, pageSize: 20 } }),
        initialSorting,
        20,
      ),
    ).toBe(true);
  });

  it.each([
    state({ search: "sword" }),
    state({ filters: [{ id: "quality", value: ["4"] }] }),
    state({ filters: [{ id: "level", value: [null, 10] }] }),
    state({ filters: [{ id: "level", value: [0, null] }] }),
    state({
      filters: [{ id: "stats", value: { stats: ["health"], mode: "all" } }],
    }),
    state({ sorting: [{ id: "name", desc: false }] }),
    state({ sorting: [...initialSorting].reverse() }),
    state({ sorting: [{ id: "level", desc: false }, initialSorting[1]] }),
    state({ sorting: [] }),
    state({ pagination: { pageIndex: 1, pageSize: 50 } }),
  ])("keeps nondefault state on button pagination: %j", (nondefault) => {
    expect(isDefaultPaginationState(nondefault, initialSorting, 20)).toBe(
      false,
    );
  });

  it("treats neutral filter values as the default view", () => {
    expect(
      isDefaultPaginationState(
        state({
          filters: [
            { id: "quality", value: [] },
            { id: "level", value: [null, null] },
            { id: "stats", value: { stats: [], mode: "any" } },
          ],
        }),
        initialSorting,
        20,
      ),
    ).toBe(true);
  });
});

describe("static list page URLs", () => {
  it("uses the base for page one and /page/N without a trailing slash after it", () => {
    for (const base of ["/items", "/items/"]) {
      expect(listPageUrl(base, 1)).toBe("/items");
      expect(listPageUrl(base, 2)).toBe("/items/page/2");
      expect(listPageUrl(base, 123)).toBe("/items/page/123");
    }
    expect(listPageUrl("/gather-items", 2)).toBe("/gather-items/page/2");
  });

  it("reads only canonical page numbers beneath the matching base", () => {
    expect(listPageNumber("/items", "/items/")).toBe(1);
    expect(listPageNumber("/items/", "/items/page/2/")).toBe(2);
    expect(listPageNumber("/items", "/items/page/10")).toBe(10);
    expect(listPageNumber("/items", "/items/page/123/")).toBe(123);
    for (const path of [
      "/monsters/page/2/",
      "/items/page/1/",
      "/items/page/02/",
      "/items/page/-2/",
      "/items/page/2/more/",
      "/items/page/2.5/",
      "/items/example/",
    ]) {
      expect(listPageNumber("/items", path)).toBe(1);
    }
  });
});

describe("list query-state transitions", () => {
  const crawlable = { basePath: "/items", page: 2, total: 100, pageSize: 20 };
  const defaults = { sorting: initialSorting, visibility: {}, pageSize: 20 };
  const current = new URL(
    "https://example.test/items/page/2?ref=guide&items.page=9",
  );

  it("stores default page identity only in the path", () => {
    expect(tablePageUrl(current, "items", state(), defaults, crawlable)).toBe(
      "/items/page/2?ref=guide",
    );
    expect(
      tablePageUrl(
        current,
        "items",
        state({ pagination: { pageIndex: 0, pageSize: 20 } }),
        defaults,
        crawlable,
      ),
    ).toBe("/items?ref=guide");
  });

  it("returns search and filtered pages to the base while preserving unrelated parameters", () => {
    expect(
      tablePageUrl(
        current,
        "items",
        state({ search: "sword" }),
        defaults,
        crawlable,
      ),
    ).toBe("/items?ref=guide&items.search=sword&items.page=2");
    expect(
      tablePageUrl(
        current,
        "items",
        state({ filters: [{ id: "quality", value: ["4"] }] }),
        defaults,
        crawlable,
      ),
    ).toBe("/items?ref=guide&items.quality=4&items.page=2");
  });

  it("returns restored defaults to the numbered path", () => {
    expect(
      tablePageUrl(
        new URL(
          "https://example.test/items?ref=guide&items.search=sword&items.page=2",
        ),
        "items",
        state(),
        defaults,
        crawlable,
      ),
    ).toBe("/items/page/2?ref=guide");
  });

  it("leaves detail-table pagination on its existing pathname and query protocol", () => {
    expect(
      tablePageUrl(
        new URL("https://example.test/monsters/example?ref=guide"),
        "drops",
        state(),
        defaults,
      ),
    ).toBe("/monsters/example?ref=guide&drops.page=2");
  });
});
