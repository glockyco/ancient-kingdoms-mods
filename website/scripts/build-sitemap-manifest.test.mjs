import { readdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { test, expect } from "vitest";
import {
  canonicalJson,
  computeHashes,
  hashRow,
  mergeManifests,
} from "./build-sitemap-manifest.mjs";
import { gatheringResourcePageIds } from "./gathering-resource-ids.mjs";

function makeNext(hashedEntries = {}, bareUrls = []) {
  return { hashes: hashedEntries, bareUrls };
}

test("canonicalJson sorts keys deterministically", () => {
  expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
  expect(canonicalJson({ a: { y: 1, x: 2 } })).toBe(
    canonicalJson({ a: { x: 2, y: 1 } }),
  );
});

test("hashRow is stable across runs", () => {
  const a = hashRow({ id: "x", name: "Foo" });
  const b = hashRow({ name: "Foo", id: "x" });
  expect(a).toBe(b);
  expect(a).toMatch(/^[0-9a-f]{64}$/);
});

test("mergeManifests keeps lastmod when hash unchanged", () => {
  const prev = {
    entries: {
      "https://example.com/a": { hash: "h1", lastmod: "2026-01-01" },
    },
  };
  const next = makeNext({ "https://example.com/a": "h1" });
  const merged = mergeManifests(prev, next, "2026-05-14");
  expect(merged.entries["https://example.com/a"]).toEqual({
    hash: "h1",
    lastmod: "2026-01-01",
  });
});

test("mergeManifests bumps lastmod when hash changes", () => {
  const prev = {
    entries: {
      "https://example.com/a": { hash: "h1", lastmod: "2026-01-01" },
    },
  };
  const next = makeNext({ "https://example.com/a": "h2" });
  const merged = mergeManifests(prev, next, "2026-05-14");
  expect(merged.entries["https://example.com/a"]).toEqual({
    hash: "h2",
    lastmod: "2026-05-14",
  });
});

test("mergeManifests adds new hashed URLs with today's lastmod", () => {
  const prev = { entries: {} };
  const next = makeNext({ "https://example.com/new": "h1" });
  const merged = mergeManifests(prev, next, "2026-05-14");
  expect(merged.entries["https://example.com/new"]).toEqual({
    hash: "h1",
    lastmod: "2026-05-14",
  });
});

test("mergeManifests drops URLs that no longer exist", () => {
  const prev = {
    entries: {
      "https://example.com/old": { hash: "h1", lastmod: "2026-01-01" },
    },
  };
  const next = makeNext();
  const merged = mergeManifests(prev, next, "2026-05-14");
  expect(merged.entries).toEqual({});
});

test("mergeManifests emits empty objects for bare URLs", () => {
  const prev = { entries: {} };
  const next = makeNext({}, [
    "https://example.com/",
    "https://example.com/map",
  ]);
  const merged = mergeManifests(prev, next, "2026-05-14");
  expect(merged.entries).toEqual({
    "https://example.com/": {},
    "https://example.com/map": {},
  });
});

test("mergeManifests does not bump bare URLs across builds", () => {
  const prev = {
    entries: {
      "https://example.com/": {},
    },
  };
  const next = makeNext({}, ["https://example.com/"]);
  const merged = mergeManifests(prev, next, "2026-05-14");
  expect(merged.entries["https://example.com/"]).toEqual({});
});

test("mergeManifests handles transition from hashed to bare", () => {
  const prev = {
    entries: {
      "https://example.com/x": { hash: "h1", lastmod: "2026-01-01" },
    },
  };
  const next = makeNext({}, ["https://example.com/x"]);
  const merged = mergeManifests(prev, next, "2026-05-14");
  expect(merged.entries["https://example.com/x"]).toEqual({});
});

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
