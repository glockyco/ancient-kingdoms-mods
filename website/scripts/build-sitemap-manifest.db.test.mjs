import { readdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { test, expect } from "vitest";
import { computeHashes } from "./build-sitemap-manifest.mjs";
import { gatheringResourcePageIds } from "./gathering-resource-ids.mjs";

const SITE_URL = "https://ancient-kingdoms.compendiums.org";
const EXCLUDED_ROUTES = {
  "/sitemap.xml": "XML sitemap endpoint, not a page to index.",
  "/gather-items/ancient_fishing_spot":
    "Aggregate alias canonicalizes to its first suffixed fishing-spot variant.",
  "/gather-items/calm_fishing_spot":
    "Aggregate alias canonicalizes to its first suffixed fishing-spot variant.",
  "/gather-items/deep_fishing_spot":
    "Aggregate alias canonicalizes to its first suffixed fishing-spot variant.",
  "/gather-items/rough_fishing_spot":
    "Aggregate alias canonicalizes to its first suffixed fishing-spot variant.",
};

function staticRoutes(directory = "src/routes", segments = []) {
  const routes = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!entry.name.startsWith("[")) {
        routes.push(
          ...staticRoutes(join(directory, entry.name), [
            ...segments,
            entry.name,
          ]),
        );
      }
      continue;
    }
    if (entry.name === "+page.svelte" || entry.name === "+server.ts") {
      routes.push(`/${segments.join("/")}`);
    }
  }
  return routes;
}

test("every fixed-path route has a sitemap URL or a stated exclusion", () => {
  const routes = new Set(staticRoutes());
  expect(routes.delete("/sitemap.xml")).toBe(true);
  const { hashes, bareUrls } = computeHashes();
  const sitemapUrls = new Set([...Object.keys(hashes), ...bareUrls]);
  for (const [route, reason] of Object.entries(EXCLUDED_ROUTES)) {
    expect(reason).toBeTruthy();
    expect(sitemapUrls.has(`${SITE_URL}${route}`)).toBe(false);
  }
  expect(
    [...routes].filter((route) => !sitemapUrls.has(`${SITE_URL}${route}`)),
  ).toEqual([]);
}, 30000);

test("noncanonical aggregate fishing aliases stay out of the sitemap", () => {
  const db = new Database("data/compendium.db", { readonly: true });
  let resources;
  try {
    resources = db
      .prepare("SELECT id, is_fishing_spot FROM gathering_resources")
      .all();
  } finally {
    db.close();
  }
  const ids = gatheringResourcePageIds(resources);
  const aggregateIds = ids.filter(
    (id) => !resources.some((resource) => resource.id === id),
  );
  expect(aggregateIds.sort()).toEqual([
    "ancient_fishing_spot",
    "calm_fishing_spot",
    "deep_fishing_spot",
    "rough_fishing_spot",
  ]);
  const { hashes } = computeHashes();
  expect(
    Object.keys(EXCLUDED_ROUTES)
      .filter((route) => route.startsWith("/gather-items/"))
      .sort(),
  ).toEqual(aggregateIds.map((id) => `/gather-items/${id}`));
  for (const id of aggregateIds) {
    expect(hashes[`${SITE_URL}/gather-items/${id}`]).toBeUndefined();
    const variants = resources.filter(
      (resource) =>
        resource.is_fishing_spot && resource.id.startsWith(`${id}_`),
    );
    expect(variants.length).toBeGreaterThan(0);
    for (const variant of variants) {
      expect(hashes[`${SITE_URL}/gather-items/${variant.id}`]).toMatch(
        /^[0-9a-f]{64}$/,
      );
    }
  }
}, 30000);
