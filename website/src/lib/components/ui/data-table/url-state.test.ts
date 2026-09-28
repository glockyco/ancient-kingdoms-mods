import { describe, expect, it } from "vitest";
import { FILTERED_LISTS, listHref } from "$lib/search/lists";
import { parseTableUrlState, serializeTableUrlState } from "./url-state";

describe("table URL filters", () => {
  it("opens every search list link as a filter on its own table", () => {
    for (const { filter } of FILTERED_LISTS) {
      const url = new URL(listHref(filter), "https://example.org");
      const [key] = [...url.searchParams.keys()];
      const [urlKey, column] = key.split(".");
      const restored = parseTableUrlState(url.searchParams, urlKey);
      expect(restored.hasUrlState).toBe(true);
      expect(restored.filters).toEqual([{ id: column, value: [filter.value] }]);
      const query = serializeTableUrlState(
        url.searchParams,
        urlKey,
        {
          search: "",
          filters: restored.filters,
          visibility: {},
          pagination: { pageIndex: 0, pageSize: 10 },
          sorting: [],
        },
        {},
        [],
      );
      expect(
        parseTableUrlState(new URLSearchParams(query), urlKey).filters,
      ).toEqual(restored.filters);
    }
  });

  it("round-trips decimal and negative bounds, facets, stat modes, and table state", () => {
    const state = {
      search: "iron sword",
      filters: [
        { id: "weight", value: [-1.25, 2.5] },
        { id: "minimum", value: [0.5, null] },
        { id: "maximum", value: [null, -0.75] },
        { id: "micro", value: [-1e-7, 2e-7] },
        { id: "slot", value: ["Chest", "WeaponSword"] },
        { id: "stats", value: { stats: ["str", "dex"], mode: "any" } },
      ],
      visibility: { icon: false, optional: true },
      pagination: { pageIndex: 2, pageSize: 10 },
      sorting: [{ id: "name", desc: true }],
    };
    const query = serializeTableUrlState(
      new URLSearchParams("other=keep&items.old=discard"),
      "items",
      state,
      { optional: false },
      [],
    );
    const params = new URLSearchParams(query);
    expect(params.get("other")).toBe("keep");
    expect(params.has("items.old")).toBe(false);
    const restored = parseTableUrlState(params, "items");
    expect(restored).toEqual({
      hasUrlState: true,
      search: state.search,
      filters: state.filters,
      visibility: state.visibility,
      page: 2,
      sorting: state.sorting,
    });
    expect(parseTableUrlState(params, "other").hasUrlState).toBe(false);
  });
});
