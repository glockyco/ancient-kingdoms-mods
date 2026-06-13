import { test, expect } from "vitest";
import {
  selectUrlsToPing,
  buildPayload,
  sendIndexNowPing,
} from "./indexnow-ping.mjs";

test("selectUrlsToPing flags URLs whose hash changed between prev and current", () => {
  const prev = {
    entries: {
      "https://example.com/a": { hash: "h1", lastmod: "2026-05-13" },
      "https://example.com/b": { hash: "h2", lastmod: "2026-05-12" },
    },
  };
  const current = {
    entries: {
      "https://example.com/a": { hash: "h1", lastmod: "2026-05-13" },
      "https://example.com/b": { hash: "h2_new", lastmod: "2026-05-14" },
      "https://example.com/c": { hash: "h3", lastmod: "2026-05-14" },
    },
  };
  expect(selectUrlsToPing(prev, current).sort()).toEqual([
    "https://example.com/b",
    "https://example.com/c",
  ]);
});

test("selectUrlsToPing includes URLs that disappeared in current (deletions)", () => {
  const prev = {
    entries: {
      "https://example.com/gone": { hash: "h", lastmod: "2026-05-13" },
    },
  };
  const current = { entries: {} };
  expect(selectUrlsToPing(prev, current)).toEqual(["https://example.com/gone"]);
});

test("selectUrlsToPing tolerates an empty prev manifest (first deploy)", () => {
  const prev = { entries: {} };
  const current = {
    entries: {
      "https://example.com/a": { hash: "h", lastmod: "2026-05-14" },
    },
  };
  expect(selectUrlsToPing(prev, current)).toEqual(["https://example.com/a"]);
});

test("selectUrlsToPing skips bare entries (entries without a hash field)", () => {
  const prev = {
    entries: {
      "https://example.com/": {},
      "https://example.com/map": {},
    },
  };
  const current = {
    entries: {
      "https://example.com/": {},
      "https://example.com/map": {},
      "https://example.com/items/foo": { hash: "h", lastmod: "2026-05-14" },
    },
  };
  expect(selectUrlsToPing(prev, current)).toEqual([
    "https://example.com/items/foo",
  ]);
});

test("selectUrlsToPing skips a URL that transitioned from hashed to bare", () => {
  const prev = {
    entries: {
      "https://example.com/x": { hash: "h", lastmod: "2026-01-01" },
    },
  };
  const current = {
    entries: {
      "https://example.com/x": {},
    },
  };
  expect(selectUrlsToPing(prev, current)).toEqual([]);
});

test("buildPayload obeys IndexNow shape", () => {
  const payload = buildPayload({
    host: "ancient-kingdoms.compendiums.org",
    key: "abc123",
    keyLocation: "https://ancient-kingdoms.compendiums.org/abc123.txt",
    urls: ["https://ancient-kingdoms.compendiums.org/items/foo"],
  });
  expect(payload.host).toBe("ancient-kingdoms.compendiums.org");
  expect(payload.key).toBe("abc123");
  expect(payload.keyLocation).toBe(
    "https://ancient-kingdoms.compendiums.org/abc123.txt",
  );
  expect(payload.urlList).toEqual([
    "https://ancient-kingdoms.compendiums.org/items/foo",
  ]);
});

test("sendIndexNowPing throws when IndexNow rejects the payload", async () => {
  const payload = buildPayload({
    host: "ancient-kingdoms.compendiums.org",
    key: "abc123",
    keyLocation: "https://ancient-kingdoms.compendiums.org/abc123.txt",
    urls: ["https://ancient-kingdoms.compendiums.org/items/foo"],
  });

  await expect(
    sendIndexNowPing(
      payload,
      async () => new Response("bad key", { status: 403 }),
    ),
  ).rejects.toThrow("indexnow: 403");
});

test("sendIndexNowPing throws when the request fails", async () => {
  const payload = buildPayload({
    host: "ancient-kingdoms.compendiums.org",
    key: "abc123",
    keyLocation: "https://ancient-kingdoms.compendiums.org/abc123.txt",
    urls: ["https://ancient-kingdoms.compendiums.org/items/foo"],
  });

  await expect(
    sendIndexNowPing(payload, async () => {
      throw new Error("offline");
    }),
  ).rejects.toThrow("indexnow: fetch failed (offline)");
});
