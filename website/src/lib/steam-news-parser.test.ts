import { test } from "vitest";
import assert from "node:assert/strict";
import { parseGameVersion } from "./steam-news-parser.ts";

const baseItem = { date: 1777381614, url: "https://example.com/post" };

test("parseGameVersion: hotfix-style title", () => {
  const r = parseGameVersion([
    { ...baseItem, title: "Ancient Kingdoms v0.9.14.3 Hotfix 🛠️" },
  ]);
  assert.deepEqual(r, {
    ok: true,
    version: "0.9.14.3",
    date: 1777381614,
    url: "https://example.com/post",
  });
});

test("parseGameVersion: dash subtitle", () => {
  const r = parseGameVersion([
    { ...baseItem, title: "Ancient Kingdoms v0.9.14.0 - Ornamentations" },
  ]);
  assert.equal(r.ok && r.version, "0.9.14.0");
});

test("parseGameVersion: 3-segment version", () => {
  const r = parseGameVersion([
    { ...baseItem, title: "Ancient Kingdoms v0.10.0 - Big Update" },
  ]);
  assert.equal(r.ok && r.version, "0.10.0");
});

test("parseGameVersion: 4-segment version", () => {
  const r = parseGameVersion([
    { ...baseItem, title: "Ancient Kingdoms v1.0.0.1 Hotfix" },
  ]);
  assert.equal(r.ok && r.version, "1.0.0.1");
});

test("parseGameVersion: skips non-version titles, picks next match", () => {
  const r = parseGameVersion([
    { ...baseItem, title: "Devblog: a year of Ancient Kingdoms" },
    { ...baseItem, title: "Ancient Kingdoms v0.9.14.0" },
  ]);
  assert.equal(r.ok && r.version, "0.9.14.0");
});

test("parseGameVersion: all unparseable returns ok:false", () => {
  const r = parseGameVersion([
    { ...baseItem, title: "Marketing post one" },
    { ...baseItem, title: "Marketing post two" },
  ]);
  assert.deepEqual(r, { ok: false });
});

test("parseGameVersion: empty array returns ok:false", () => {
  assert.deepEqual(parseGameVersion([]), { ok: false });
});

test("parseGameVersion: null returns ok:false", () => {
  assert.deepEqual(parseGameVersion(null), { ok: false });
});

test("parseGameVersion: undefined returns ok:false", () => {
  assert.deepEqual(parseGameVersion(undefined), { ok: false });
});

test("parseGameVersion: ignores items missing title field", () => {
  const r = parseGameVersion([
    { ...baseItem, title: undefined as unknown as string },
    { ...baseItem, title: "Ancient Kingdoms v0.9.14.3" },
  ]);
  assert.equal(r.ok && r.version, "0.9.14.3");
});

test("parseGameVersion: rejects two-segment versions (e.g. 'v1.0')", () => {
  const r = parseGameVersion([
    { ...baseItem, title: "Ancient Kingdoms v1.0 Demo Release" },
  ]);
  assert.deepEqual(r, { ok: false });
});
