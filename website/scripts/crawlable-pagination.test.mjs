import { expect, test } from "vitest";
import { checkListPages } from "./crawlable-pagination.mjs";

const origin = "https://example.test";

function page(canonical, rows, next) {
  return `<html><head><link rel="canonical" href="${origin}${canonical}"></head><body>
    <table><tbody>${rows.map((row) => `<tr><td class="identifier-cell"><a href="/items/${row}">${row}</a></td></tr>`).join("")}</tbody></table>
    ${next ? `<nav><a href="${next}">Next</a></nav>` : ""}</body></html>`;
}

// Five entries at two per page.
const site = {
  "/items": page("/items", ["a", "b"], "/items/page/2"),
  "/items/page/2": page("/items/page/2", ["c", "d"], "/items/page/3"),
  "/items/page/3": page("/items/page/3", ["e"], null),
};
const sitemap = new Set(Object.keys(site).map((path) => `${origin}${path}`));

const check = (pages) =>
  checkListPages({
    fetchPage: async (path) => pages[path],
    basePath: "/items",
    origin,
    sitemap,
  });

test("accepts pages that each show their own rows", async () => {
  const pages = await check(site);
  expect(pages.map(({ rows }) => rows)).toEqual([
    ["/items/a", "/items/b"],
    ["/items/c", "/items/d"],
    ["/items/e"],
  ]);
});

test("rejects a numbered page that shows the first page's rows", async () => {
  await expect(
    check({
      ...site,
      "/items/page/2": page("/items/page/2", ["a", "b"], "/items/page/3"),
    }),
  ).rejects.toThrow("repeats the rows of /items");
});

test("rejects a numbered page that names the first page as canonical", async () => {
  await expect(
    check({
      ...site,
      "/items/page/2": page("/items", ["c", "d"], "/items/page/3"),
    }),
  ).rejects.toThrow("must name itself as canonical");
});

test("rejects a sitemap page that no page links to", async () => {
  await expect(
    check({ ...site, "/items/page/2": page("/items/page/2", ["c", "d"]) }),
  ).rejects.toThrow("which no page links to");
});
