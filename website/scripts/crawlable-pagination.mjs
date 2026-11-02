import assert from "node:assert/strict";
import { parse } from "node-html-parser";

/** The entry link of each table row, in the order the page shows them. */
export function rowLinks(html) {
  return parse(html)
    .querySelectorAll("tbody tr")
    .map((row) =>
      row.querySelector(".identifier-cell a[href]")?.getAttribute("href"),
    )
    .filter(Boolean);
}

/**
 * Walk a list from its first page through the next-page links. Every page must
 * show rows that no other page shows in the same order, name itself as
 * canonical and be in the sitemap, and the sitemap must have no numbered page
 * that the walk didn't reach.
 */
export async function checkListPages({ fetchPage, basePath, origin, sitemap }) {
  const pages = [];
  const shown = new Map();
  for (let page = 1, path = basePath; path; page++) {
    const html = await fetchPage(path);
    const document = parse(html);
    const rows = rowLinks(html);
    assert.ok(rows.length > 0, `${path} shows no table rows`);
    const key = rows.join("\n");
    assert.ok(!shown.has(key), `${path} repeats the rows of ${shown.get(key)}`);
    shown.set(key, path);
    assert.equal(
      document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
      `${origin}${path}`,
      `${path} must name itself as canonical`,
    );
    assert.ok(sitemap.has(`${origin}${path}`), `${path} is not in the sitemap`);
    pages.push({ path, rows });
    const next = `${basePath}/page/${page + 1}`;
    path = document.querySelector(`a[href="${next}"]`) ? next : null;
  }
  assert.ok(
    !sitemap.has(`${origin}${basePath}/page/${pages.length + 1}`),
    `The sitemap lists ${basePath}/page/${pages.length + 1}, which no page links to`,
  );
  const size = pages[0].rows.length;
  for (const { path, rows } of pages.slice(0, -1)) {
    assert.equal(
      rows.length,
      size,
      `${path} shows ${rows.length} rows, not ${size}`,
    );
  }
  return pages;
}
