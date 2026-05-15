import { test, expect } from "vitest";
import {
  canonicalJson,
  hashRow,
  mergeManifests,
} from "./build-sitemap-manifest.mjs";

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
