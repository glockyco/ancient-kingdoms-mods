import { describe, expect, it } from "vitest";
import { createListPagination } from "./list-pagination";

describe("data-derived list routes", () => {
  it("generates only pages two through the current final page", async () => {
    let total = 41;
    const pagination = createListPagination(
      "/items",
      20,
      (page) => ({ total, requested: page }),
      (data) => data.total,
    );
    expect(await pagination.entries()).toEqual([{ page: "2" }, { page: "3" }]);
    expect(await pagination.load({ params: { page: "2" } })).toEqual({
      total: 41,
      requested: 2,
      crawlable: { basePath: "/items", page: 2, total: 41, pageSize: 20 },
    });
    total = 20;
    expect(await pagination.entries()).toEqual([]);
    await expect(
      pagination.load({ params: { page: "2" } }),
    ).rejects.toMatchObject({ status: 404 });
    total = 0;
    expect(await pagination.entries()).toEqual([]);
    expect((await pagination.load({ params: {} })).crawlable.page).toBe(1);
  });

  it.each(["0", "1", "02", "-2", "2.5", "2x", "9007199254740992", "4"])(
    "rejects noncanonical or out-of-range numbered path %s",
    async (page) => {
      const pagination = createListPagination(
        "/items",
        20,
        () => 41,
        (count) => count,
      );
      await expect(pagination.load({ params: { page } })).rejects.toMatchObject(
        { status: 404 },
      );
    },
  );
});
