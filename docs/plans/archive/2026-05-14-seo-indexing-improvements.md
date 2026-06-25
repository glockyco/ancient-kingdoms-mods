---
title: "SEO Indexing Improvements Implementation Plan"
type: plan
status: implemented
created: 2026-05-14
parent:
superseded_by:
archived: 2026-06-25
---

# SEO Indexing Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift `ancient-kingdoms.compendiums.org` out of the "Discovered – currently not indexed" hole by (a) shrinking per-page weight, (b) emitting an honest `<lastmod>` per URL, (c) pushing changed URLs to IndexNow on every deploy, and (d) shipping per-bucket structured data that matches schema.org and current Google guidance.

**Architecture:**
- A small SEO helper module (`website/src/lib/seo/jsonld.ts`) exports per-type builders (`buildWebSite`, `buildOrganization`, `buildPerson`, `buildCollectionPage`) and a single-node `<JsonLd>` component that prepends `@context` and renders one `<script type="application/ld+json">` block. Each page emits its blocks independently — no `@graph` wrapper. Cross-references between nodes use stable `@id`s (`#website`, `#org`, `#author`) which Google resolves natively when the referenced node appears on the same page.
- A build-time manifest (`website/sitemap-manifest.json`, package root, NOT under `static/` so it is not publicly served) maps every URL to either a content hash + `lastmod` date (for URLs whose rendered content can be honestly fingerprinted) or an empty object (for URLs whose multi-source content cannot be honestly dated — currently `/`, `/map`, `/tools/combat-simulator`). A prebuild script regenerates it from the SQLite DB and source files; hashed entries only bump `lastmod` when the hash actually moves.
- The deploy script snapshots the previous manifest, runs a fresh build (which writes the new manifest), then diffs prev vs current to POST changed/added/deleted hashed URLs to IndexNow. Bare entries are skipped from IndexNow entirely — Cloudflare's zone-level "Crawler Hints" handles them on cache MISS as a separate channel.

**Tech Stack:** SvelteKit 2 / Svelte 5 / TypeScript strict / `@sveltejs/adapter-cloudflare` / better-sqlite3 (build-time) / Vitest / Node `crypto`/`fetch`. No new runtime dependencies.

**Authoritative sources used during planning:**
- Schema.org standards audit: `agent://0-SchemaOrgStandardsAudit`
- Live competitor JSON-LD audit: `agent://1-CompetitiveJsonLdAudit`

**Resolved open questions (from audits and subsequent scope decisions):**
- No `/search?q=` endpoint exists in the route tree → omit `potentialAction: SearchAction` from `WebSite`.
- No published data dump → omit `Dataset`.
- No Wikidata QID for the game has been curated → omit `about.sameAs` on `WebSite`.
- Per-entity JSON-LD (`Thing`/`Place`/`Person`-per-NPC/`CreativeWork`/`Article`/`WebApplication`) was considered and dropped — no rich-result eligibility on this site for those types and no plan for per-page OG images, so the only payoff is a marginal entity-disambiguation signal vs. ~3,300 routes of per-patch maintenance. Reasoning preserved in the Phase 4 intro and the "Out of scope" section.
- Site publisher is modeled as `Organization` (the compendium brand) linked via `founder` to a `Person` node (author "WoW_Much"). Ko-fi profile is the canonical creator URL; Steam profile lives in `Person.sameAs` as a cross-reference identity claim.
- Logo for `Organization.logo` is `/icons/pwa-512.png` (512×512 PNG, fits Google's "at least 112×112 raster, square" guidance), not the WebP at `/logo.webp`.

---

## Phase 1: Immediate wins

Two trivial fixes that ship the largest per-page-byte saving and remove the broken-URL spam from every prerendered page. No interdependencies; can be one commit each.

### Task 1.1: Lower `inlineStyleThreshold` to the SvelteKit default

**Files:**
- Modify: `website/svelte.config.js:15`

**Background.** The current `inlineStyleThreshold: 100000` inlines ~88 KB of CSS into every prerendered page (3,353 pages × 88 KB = ~290 MB of duplicated CSS across the deploy bundle). SvelteKit's default is `0`. Production CSS is already shipped as a single hashed static asset; the inline copy is pure waste.

- [ ] **Step 1: Remove the override**

Open `website/svelte.config.js` and delete the `inlineStyleThreshold` line entirely. SvelteKit's default of `0` (extract everything, never inline) is what we want.

```js
// Before
adapter: adapter({}),
inlineStyleThreshold: 100000,
prerender: { ... },

// After
adapter: adapter({}),
prerender: { ... },
```

- [ ] **Step 2: Verify locally**

Run from `website/`:

```bash
pnpm build
```

Expected: build succeeds; `pnpm exec snapshot-mechanics.mjs` (run as `node scripts/snapshot-mechanics.mjs`) reports "All snapshots match."

- [ ] **Step 3: Inspect a prerendered page to confirm no inline `<style>` over a few KB**

```bash
node -e 'const fs=require("fs");const h=fs.readFileSync(".svelte-kit/cloudflare/items/abyssal_tidehammer.html","utf8");const m=[...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)];console.log(m.map(x=>x[1].length))'
```

Expected: every `<style>` block is small (Svelte component-scoped style residue at most, kilobytes not tens of kilobytes). No single block over ~5 KB.

- [ ] **Step 4: Commit**

```bash
git add website/svelte.config.js
git commit -m "perf(website): drop inlineStyleThreshold override to save ~88KB per page"
```

---

### Task 1.2: Fix `BreadcrumbList` JSON-LD URLs (interim)

**Files:**
- Modify: `website/src/lib/components/Breadcrumb.svelte`
- Create: `website/src/lib/components/Breadcrumb.test.ts`

**Background.** `breadcrumbLd` currently feeds the output of `resolve()` (which returns navigation-relative paths like `..` and `../items`) into `canonicalUrl()`, producing JSON-LD `item` values like `https://ancient-kingdoms.compendiums.org/.` and `https://ancient-kingdoms.compendiums.org/../items`. This is broken on every non-home page. The visible `<a href>` in the rendered nav stays untouched — `resolve()` is correct for navigation, wrong for canonical URLs.

Phase 1.2 owns BreadcrumbList JSON-LD permanently — Phase 4 was originally planned to move it into a combined `@graph` per page, but Phase 4 was later slimmed to drop the `@graph` pattern, so `Breadcrumb.svelte` keeps emitting its own JSON-LD block.

- [ ] **Step 1: Extract the path resolver for JSON-LD as a pure function**

Add a non-exported helper inside the script tag that returns a clean app-relative path (`/items`, `/items/foo`) from a `BreadcrumbItem.href` without going through `$app/paths.resolve()`:

```ts
function jsonLdPath(
  href:
    | RouteId
    | { route: RouteId; params: Record<string, string> }
    | undefined,
): string | undefined {
  if (!href) return undefined;
  if (typeof href === "object" && "route" in href) {
    // RouteId templates use [param] placeholders. Substitute params verbatim.
    let path: string = href.route;
    for (const [key, value] of Object.entries(href.params)) {
      path = path.replace(`[${key}]`, value);
    }
    return path;
  }
  return href as string;
}
```

Replace `const path = resolveHref(item.href);` in `breadcrumbLd` with `const path = jsonLdPath(item.href);`. Leave `resolveHref()` in place — the `<a href>` template still uses it.

- [ ] **Step 2: Make `breadcrumbLd` testable**

Refactor by hoisting the builder to module scope so a test can call it without mounting the component:

```ts
// Above the component <script>, in the module script:
export function buildBreadcrumbLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => {
      const path = jsonLdPath(item.href);
      const entry: Record<string, unknown> = {
        "@type": "ListItem",
        position: index + 1,
        name: item.label,
      };
      if (path) entry.item = canonicalUrl(path);
      return entry;
    }),
  };
}
```

Move `jsonLdPath` and `canonicalUrl` import into the module script so both the export and the component can use them.

Update the instance script to `const breadcrumbLd = $derived(buildBreadcrumbLd(items));`.

- [ ] **Step 3: Write the failing test**

Create `website/src/lib/components/Breadcrumb.test.ts`:

```ts
import { test, expect } from "vitest";
import { buildBreadcrumbLd } from "./Breadcrumb.svelte";

test("string href becomes a clean canonical URL", () => {
  const ld = buildBreadcrumbLd([
    { label: "Home", href: "/" },
    { label: "Items", href: "/items" },
    { label: "Abyssal Tidehammer" },
  ]);
  expect(ld.itemListElement[0].item).toBe(
    "https://ancient-kingdoms.compendiums.org/",
  );
  expect(ld.itemListElement[1].item).toBe(
    "https://ancient-kingdoms.compendiums.org/items",
  );
  expect(ld.itemListElement[2]).not.toHaveProperty("item");
});

test("route+params href substitutes [param] placeholders", () => {
  const ld = buildBreadcrumbLd([
    { label: "Home", href: "/" },
    { label: "Items", href: "/items" },
    {
      label: "Sword",
      href: { route: "/items/[id]", params: { id: "abyssal_tidehammer" } },
    },
  ]);
  expect(ld.itemListElement[2].item).toBe(
    "https://ancient-kingdoms.compendiums.org/items/abyssal_tidehammer",
  );
});

test("no URL contains '.' or '..' segments", () => {
  const ld = buildBreadcrumbLd([
    { label: "Home", href: "/" },
    { label: "Items", href: "/items" },
    { label: "Foo", href: { route: "/items/[id]", params: { id: "foo" } } },
  ]);
  for (const entry of ld.itemListElement) {
    if (entry.item) {
      const url = entry.item as string;
      expect(url).not.toMatch(/\/\.{1,2}(\/|$)/);
    }
  }
});
```

- [ ] **Step 4: Run the test, confirm pass**

```bash
cd website && pnpm test -- Breadcrumb
```

Expected: all three tests pass.

- [ ] **Step 5: Spot-check a real prerendered page**

```bash
cd website && pnpm build
node -e 'const fs=require("fs");const h=fs.readFileSync(".svelte-kit/cloudflare/items/abyssal_tidehammer.html","utf8");const m=h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);console.log(JSON.stringify(JSON.parse(m[0].replace(/^<[^>]*>|<\/script>$/g,"")),null,2))'
```

Expected: every `BreadcrumbList[].item` is a clean `https://ancient-kingdoms.compendiums.org/<path>` with no `.` or `..` segments.

- [ ] **Step 6: Commit**

```bash
git add website/src/lib/components/Breadcrumb.svelte website/src/lib/components/Breadcrumb.test.ts
git commit -m "fix(website): emit clean canonical URLs in BreadcrumbList JSON-LD"
```

---

## Phase 2: Per-entity `<lastmod>` via content-hash manifest

Bumping every URL on every build makes the signal meaningless. Instead, hash each entity's normalized DB payload, compare to the previous deploy's hash, and only bump that URL's `lastmod` when the hash changed.

### Task 2.1: Add the manifest generator script

**Files:**
- Create: `website/scripts/build-sitemap-manifest.mjs`
- Create: `website/scripts/build-sitemap-manifest.test.mjs`
- Create: `website/sitemap-manifest.json` (committed; lives at package root so it is not served as a static asset)
- Modify: `website/package.json` (`prebuild` script)
- Modify: `website/vite.config.ts` (widen vitest `test.include` to discover `scripts/**/*.test.mjs`)

**Design.**
- One manifest file at `website/sitemap-manifest.json` (NOT under `static/` — keeping it out of `static/` avoids exposing internal build metadata at `https://ancient-kingdoms.compendiums.org/sitemap-manifest.json`). Committed (visible diff per build; ~250 KB).
- Two kinds of `entries`:
  - **Hashed URLs** — `{ "hash": "<sha256-hex>", "lastmod": "<YYYY-MM-DD>" }`. Used for URLs we can date honestly. Emit `<lastmod>` in the sitemap and ping IndexNow on hash change.
  - **Bare URLs** — `{}` (empty object). Used for URLs whose rendered content has fuzzy multi-source dependencies that no single hash can capture cleanly without coupling this script to every loader's internal schema. Sitemap emits `<loc>` only, no `<lastmod>`. IndexNow does not ping them; Cloudflare Crawler Hints (Task 3.3) catches them on cache MISS instead.
  - The empty-object shape (not absent and not `null`) is deliberate: it keeps the manifest as the single source of truth for "URLs to include in the sitemap" and avoids two parallel collections.
- The hash for each hashed URL must reflect what the page actually renders, not just the entity's primary-table row. The reviewers' specific concern: every detail page joins related tables (e.g. `items/[id]` pulls sources, usages, recipe materials, treasure locations, pack contents; `npcs/[id]` pulls quests, sold items, spawns, world-boss links; `monsters/[id]` pulls drop enrichment). Hashing only the primary row leaves `<lastmod>` stale for changes in those related tables. The script therefore uses a per-route payload function that mirrors each loader's data assembly.
- **Per-route strategy:**
  - **Entity detail pages** (`/items/<id>`, `/monsters/<id>`, `/npcs/<id>`, `/quests/<id>`, `/zones/<id>`, `/chests/<id>`, `/gather-items/<id>`, `/skills/<id>`, `/classes/<id>`, `/altars/<id>`, `/pets/<id>`, `/recipes/<id>`): hashed. Canonical-JSON of the entity's primary row PLUS rows from the related tables the page renders. Per-route projections are listed inline in the script.
  - **Overview pages** (`/items`, `/monsters`, …): hashed. Deterministic projection of the columns the overview-page rendering depends on (`id, name, item_type, quality, level_required, ...` for `/items`; analogous columns elsewhere). Catches renames, retunes, and inserts that preserve total row count.
  - **Mechanics pages** (`/mechanics`, `/mechanics/<topic>`): hashed. File contents of `src/routes/mechanics{,/<topic>}/+page.svelte`. These pages render from prose source — verified that they import only generic UI primitives, so all content lives in the file.
  - **Profession pages** (`/professions`, `/professions/<slug>`): hashed. Projection of `professions` rows plus the relevant `+page.server.ts` and `+page.svelte` source.
  - **Bare**: `/`, `/map`, `/tools/combat-simulator`. Each composes content from multiple disjoint sources whose union no single hash captures honestly:
    - `/` — markup + `home-counts.ts` (generated) + live Steam game version (per-request). The Steam version isn't a sitemap-meaningful change but inflating the hash on every build would trip Google's "ignore this site's lastmod" rule.
    - `/map` — joins ~10 spatial tables (`monster_spawns`, `npc_spawns`, `gathering_resource_spawns`, `treasure_locations`, `chests`, `altars`, `houses`, `portals`, `zone_triggers`, zone bounds). Honest hashing would couple this script to every loader's internal query.
    - `/tools/combat-simulator` — page markup + `combat-sim.ts` formula module + weapon list from DB. Multi-source with no single defensible "this changed" signal.
- Hash function (for hashed URLs): `sha256(canonicalJson(value))`. `canonicalJson` sorts object keys and JSON-stringifies recursively (no third-party dep).
- Merge logic for hashed URLs: hash unchanged → keep `lastmod`. Hash changed or URL is new → set `lastmod = today (UTC, YYYY-MM-DD)`. Merge logic for bare URLs: always emit `{}`. URLs that disappeared from the new build are removed entirely (Task 3.2 picks them up from the prev-vs-next diff and pings IndexNow with the deletion — but only for previously-hashed URLs).
- Idempotent: re-running with no DB or source changes produces a manifest whose `entries` are byte-identical (only `generated` timestamp moves).

- [ ] **Step 1: Widen vitest's `test.include` so tests under `scripts/` get discovered**

The current `website/vite.config.ts` only discovers `src/**/*.test.ts`. Without this change, `pnpm test -- build-sitemap-manifest` silently runs zero tests.

Edit `website/vite.config.ts`:

```ts
export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"],
  },
});
```

- [ ] **Step 2: Write the failing tests**

Create `website/scripts/build-sitemap-manifest.test.mjs`:

```js
import { test, expect } from "vitest";
import {
  canonicalJson,
  hashRow,
  mergeManifests,
} from "./build-sitemap-manifest.mjs";

// Test helper: build a `next` hashes-and-bares pair as the script's
// computeHashes() would. Hashed entries get a string hash; bare entries
// are listed separately.
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
  // If a URL was hashed in the previous manifest but is now declared
  // bare, the new entry is bare (the previous lastmod is discarded —
  // a bare URL is intentionally not dated).
  const prev = {
    entries: {
      "https://example.com/x": { hash: "h1", lastmod: "2026-01-01" },
    },
  };
  const next = makeNext({}, ["https://example.com/x"]);
  const merged = mergeManifests(prev, next, "2026-05-14");
  expect(merged.entries["https://example.com/x"]).toEqual({});
});
```

Run: `cd website && pnpm test -- build-sitemap-manifest`. Expected: all nine fail with `Cannot find module`.

- [ ] **Step 3: Implement the script**

Create `website/scripts/build-sitemap-manifest.mjs`:

```js
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";

const SITE_URL = "https://ancient-kingdoms.compendiums.org";
const DB_PATH = resolve("static/compendium.db");
const MANIFEST_PATH = resolve("sitemap-manifest.json");

const ENTITIES = [
  { table: "items", route: "items" },
  { table: "monsters", route: "monsters" },
  { table: "npcs", route: "npcs" },
  { table: "zones", route: "zones" },
  { table: "quests", route: "quests" },
  { table: "chests", route: "chests" },
  { table: "gathering_resources", route: "gather-items" },
  { table: "skills", route: "skills" },
  { table: "classes", route: "classes" },
  { table: "altars", route: "altars" },
];


export function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value))
    return "[" + value.map(canonicalJson).join(",") + "]";
  const keys = Object.keys(value).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + canonicalJson(value[k]))
      .join(",") +
    "}"
  );
}

export function hashRow(row) {
  return createHash("sha256").update(canonicalJson(row)).digest("hex");
}

/**
 * Merge a previous manifest with the new (hashes, bareUrls) computation.
 *
 * For each hashed URL:
 *   - hash unchanged vs. previous entry → keep prior `lastmod`
 *   - hash changed or URL is new        → set `lastmod = today`
 *
 * For each bare URL: emit `{}`. No hash, no lastmod. The sitemap will
 * render these URLs without a `<lastmod>` element; IndexNow skips them.
 *
 * URLs absent from both `hashes` and `bareUrls` (i.e. removed since the
 * previous build) are not carried over — they fall out of the manifest
 * entirely. Task 3.2's IndexNow ping diffs prev vs current and picks
 * those up as deletions for hashed URLs only.
 */
export function mergeManifests(prev, next, today) {
  const prevEntries = prev?.entries ?? {};
  const entries = {};

  for (const [url, hash] of Object.entries(next.hashes ?? {})) {
    const prior = prevEntries[url];
    if (prior && prior.hash === hash) {
      entries[url] = { hash, lastmod: prior.lastmod };
    } else {
      entries[url] = { hash, lastmod: today };
    }
  }

  for (const url of next.bareUrls ?? []) {
    entries[url] = {};
  }

  return {
    version: 1,
    generated: new Date().toISOString(),
    entries,
  };
}

function loadPrevManifest() {
  if (!existsSync(MANIFEST_PATH)) return { entries: {} };
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
}

/** Per-route payload functions. Each returns the assembled object whose
 *  canonical JSON is hashed. Mirrors the data the loader passes to the
 *  +page.svelte so any change that affects the rendered HTML moves the
 *  hash. Adding a related-table dependency to a loader MUST be matched
 *  by adding the same field here. */
function itemPayload(db, id) {
  return {
    row: db.prepare("SELECT * FROM items WHERE id = ?").get(id),
    sources: db.prepare("SELECT * FROM item_sources WHERE item_id = ?").all(id),
    usages: db.prepare("SELECT * FROM item_usages WHERE item_id = ?").all(id),
    crafting: db.prepare("SELECT * FROM crafting_recipes WHERE output_item_id = ?").all(id),
    alchemy: db.prepare("SELECT * FROM alchemy_recipes WHERE output_item_id = ?").all(id),
    scribing: db.prepare("SELECT * FROM scribing_recipes WHERE output_item_id = ?").all(id),
    chestSources: db.prepare("SELECT * FROM chest_loot WHERE item_id = ?").all(id),
  };
}

function monsterPayload(db, id) {
  return {
    row: db.prepare("SELECT * FROM monsters WHERE id = ?").get(id),
    drops: db.prepare("SELECT * FROM monster_drops WHERE monster_id = ?").all(id),
    spawns: db.prepare("SELECT * FROM monster_spawns WHERE monster_id = ?").all(id),
  };
}

function npcPayload(db, id) {
  return {
    row: db.prepare("SELECT * FROM npcs WHERE id = ?").get(id),
    quests_offered: db.prepare("SELECT quest_id FROM npc_quests_offered WHERE npc_id = ? ORDER BY quest_id").all(id),
    items_sold: db.prepare("SELECT item_id FROM npc_items_sold WHERE npc_id = ? ORDER BY item_id").all(id),
    spawns: db.prepare("SELECT * FROM npc_spawns WHERE npc_id = ?").all(id),
  };
}

function questPayload(db, id) {
  return {
    row: db.prepare("SELECT * FROM quests WHERE id = ?").get(id),
    offered_by: db.prepare("SELECT npc_id FROM npc_quests_offered WHERE quest_id = ? ORDER BY npc_id").all(id),
  };
}

function zonePayload(db, id) {
  return {
    row: db.prepare("SELECT * FROM zones WHERE id = ?").get(id),
  };
}

function rowOnlyPayload(table) {
  return (db, id) => ({ row: db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) });
}

const DETAIL_PAYLOADS = {
  items: itemPayload,
  monsters: monsterPayload,
  npcs: npcPayload,
  quests: questPayload,
  zones: zonePayload,
  chests: rowOnlyPayload("chests"),
  gathering_resources: rowOnlyPayload("gathering_resources"),
  skills: rowOnlyPayload("skills"),
  classes: rowOnlyPayload("classes"),
  altars: rowOnlyPayload("altars"),
};

/** Hash the contents of a file path (relative to package root). Used for
 *  static routes whose content lives in source, not the DB. */
function fileHash(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function computeHashes() {
  const db = new Database(DB_PATH, { readonly: true });
  const hashes = {};

  /* Entity detail pages: hash assembled payload mirroring the loader. */
  for (const { table, route } of ENTITIES) {
    const payloadFor = DETAIL_PAYLOADS[table];
    if (!payloadFor) throw new Error(`No payload function for table ${table}`);
    const ids = db.prepare(`SELECT id FROM ${table}`).all();
    for (const { id } of ids) {
      hashes[`${SITE_URL}/${route}/${id}`] = hashRow(payloadFor(db, id));
    }
  }

  /* Pets: filter applied per existing route convention. */
  const petIds = db
    .prepare(
      "SELECT id FROM pets WHERE id NOT IN ('rolim','nieven','bemere','ciliren')",
    )
    .all();
  for (const { id } of petIds) {
    hashes[`${SITE_URL}/pets/${id}`] = hashRow({
      row: db.prepare("SELECT * FROM pets WHERE id = ?").get(id),
    });
  }

  /* Recipes: three tables merged into the /recipes/<id> route. */
  for (const table of ["crafting_recipes", "alchemy_recipes", "scribing_recipes"]) {
    const rows = db.prepare(`SELECT * FROM ${table}`).all();
    for (const row of rows) {
      hashes[`${SITE_URL}/recipes/${row.id}`] = hashRow({ table, row });
    }
  }

  /* Overview pages: hash a projection of columns the rendered table depends on.
   *  Keep the column list in sync with what the +page.svelte actually reads.
   *  When a column is added/removed there, update this projection and the
   *  next build will bump every URL on that overview — which is correct. */
  const overviewProjection = {
    items: "id, name, item_type, quality, level_required, item_level, slot, backpack_slots, stat_count, alchemy_recipe_level_required, mount_speed, augment_is_defensive, augment_armor_set_name",
    monsters: "id, name, level, health, damage, magic_damage, race",
    npcs: "id, name, faction, race, level",
    zones: "id, name, is_dungeon, required_level, level_min, level_max",
    quests: "id, name, level_recommended, level_required",
    chests: "id, name",
    gathering_resources: "id, name, tier",
    skills: "id, name",
    classes: "id, name",
    altars: "id, name",
  };
  const OVERVIEW_ROUTES = {
    items: "/items",
    monsters: "/monsters",
    npcs: "/npcs",
    zones: "/zones",
    quests: "/quests",
    chests: "/chests",
    gathering_resources: "/gather-items",
    skills: "/skills",
    classes: "/classes",
    altars: "/altars",
  };
  for (const [table, cols] of Object.entries(overviewProjection)) {
    const rows = db.prepare(`SELECT ${cols} FROM ${table} ORDER BY id`).all();
    hashes[`${SITE_URL}${OVERVIEW_ROUTES[table]}`] = hashRow(rows);
  }
  hashes[`${SITE_URL}/pets`] = hashRow(
    db.prepare("SELECT id, name FROM pets WHERE id NOT IN ('rolim','nieven','bemere','ciliren') ORDER BY id").all(),
  );
  hashes[`${SITE_URL}/recipes`] = hashRow({
    crafting: db.prepare("SELECT id, name FROM crafting_recipes ORDER BY id").all(),
    alchemy: db.prepare("SELECT id, name FROM alchemy_recipes ORDER BY id").all(),
    scribing: db.prepare("SELECT id, name FROM scribing_recipes ORDER BY id").all(),
  });

  /* Mechanics pages: hash the prose source file. Verified that these pages
   *  import only generic UI primitives, so all content lives in the file. */
  const MECHANICS_ROUTES = [
    { url: "/mechanics", file: "src/routes/mechanics/+page.svelte" },
    { url: "/mechanics/inventory", file: "src/routes/mechanics/inventory/+page.svelte" },
    { url: "/mechanics/combat", file: "src/routes/mechanics/combat/+page.svelte" },
    { url: "/mechanics/experience", file: "src/routes/mechanics/experience/+page.svelte" },
  ];
  for (const { url, file } of MECHANICS_ROUTES) {
    hashes[`${SITE_URL}${url}`] = fileHash(file);
  }

  /* Profession pages: hash row projection + source files. */
  const PROFESSION_SLUGS = [
    "adventuring", "alchemy", "cooking", "exploring", "herbalism",
    "hunter", "lore_keeping", "mining", "radiant_seeker",
    "scroll_mastery", "slayer", "treasure_hunter",
  ];
  const professions = db.prepare("SELECT * FROM professions ORDER BY id").all();
  const professionsSource = fileHash("src/routes/professions/+page.svelte");
  hashes[`${SITE_URL}/professions`] = hashRow({ professions, source: professionsSource });
  for (const slug of PROFESSION_SLUGS) {
    const sourcePath = `src/routes/professions/${slug}/+page.svelte`;
    const source = existsSync(sourcePath) ? fileHash(sourcePath) : null;
    hashes[`${SITE_URL}/professions/${slug}`] = hashRow({
      profession: professions.find((p) => p.id === slug) ?? null,
      source,
    });
  }

  /* Bare URLs: included in the sitemap as <loc> only (no <lastmod>).
   *  These pages have multi-source content (markup + generated counts +
   *  per-request data for `/`; ~10 spatial tables joined for `/map`;
   *  markup + formula module + DB weapon list for the combat simulator)
   *  where no single hash captures "this page changed" honestly without
   *  coupling this script to every loader's internal schema. Bumping
   *  inaccurately would trip Google's "ignore lastmod for this site"
   *  rule — strictly worse than omitting lastmod for three URLs. */
  const bareUrls = [
    `${SITE_URL}/`,
    `${SITE_URL}/map`,
    `${SITE_URL}/tools/combat-simulator`,
  ];

  db.close();
  return { hashes, bareUrls };
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function main() {
  const prev = loadPrevManifest();
  const next = computeHashes();
  const merged = mergeManifests(prev, next, todayUtc());
  writeFileSync(MANIFEST_PATH, JSON.stringify(merged, null, 2) + "\n");

  const hashedCount = Object.values(merged.entries).filter(
    (e) => "hash" in e,
  ).length;
  const bareCount = Object.values(merged.entries).length - hashedCount;
  const bumped = Object.entries(merged.entries).filter(
    ([url, e]) => "hash" in e && prev.entries?.[url]?.lastmod !== e.lastmod,
  ).length;
  const removed = Object.keys(prev.entries ?? {}).filter(
    (url) => !(url in merged.entries),
  ).length;
  console.log(
    `sitemap-manifest: ${hashedCount} hashed (${bumped} bumped), ${bareCount} bare, ${removed} removed`,
  );
}

// Run only when invoked directly, not when imported by tests. Compare
// filesystem paths instead of serialized file: URLs so the gate works
// on checkouts with spaces or non-ASCII in the path.
import { fileURLToPath } from "node:url";
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
```

- [ ] **Step 4: Run the tests**

```bash
cd website && pnpm test -- build-sitemap-manifest
```

Expected: all nine pass.

- [ ] **Step 5: Wire into `prebuild`**

Modify `website/package.json:9`:

```jsonc
// Before
"prebuild": "node scripts/generate-og-image.mjs && node scripts/generate-home-counts.mjs",
// After
"prebuild": "node scripts/generate-og-image.mjs && node scripts/generate-home-counts.mjs && node scripts/build-sitemap-manifest.mjs",
```

- [ ] **Step 6: Run a real build to produce the initial manifest**

```bash
cd website && pnpm build
```

Expected: `build-sitemap-manifest: 3353 URLs, 3353 bumped` (everything is "new" on the first run).

- [ ] **Step 7: Verify idempotence**

```bash
cd website && node scripts/build-sitemap-manifest.mjs
```

Expected: `build-sitemap-manifest: 3353 URLs, 0 bumped`. The manifest file's contents should be byte-identical except for the `"generated"` timestamp.

- [ ] **Step 8: Commit**

```bash
git add website/scripts/build-sitemap-manifest.mjs website/scripts/build-sitemap-manifest.test.mjs website/package.json website/vite.config.ts website/sitemap-manifest.json
git commit -m "feat(website): build content-hash sitemap manifest for per-entity lastmod"
```

---

### Task 2.2: Emit `<lastmod>` from the sitemap route

**Files:**
- Modify: `website/src/routes/sitemap.xml/+server.ts`

- [ ] **Step 1: Read the manifest at prerender time**

Replace the body of `GET()` so it pulls URLs and `lastmod` from `website/sitemap-manifest.json` (the manifest sits at the package root, NOT under `static/`, so it does not get served as a public asset). Use `node:fs` directly at prerender time:

```ts
import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";

export const prerender = true;

interface HashedEntry {
  hash: string;
  lastmod: string;
}
interface BareEntry {} // eslint-disable-line @typescript-eslint/no-empty-object-type — intentional: a bare entry has no fields, only its key in `entries` matters
type Entry = HashedEntry | BareEntry;

interface Manifest {
  entries: Record<string, Entry>;
}

function hasLastmod(entry: Entry): entry is HashedEntry {
  return "lastmod" in entry;
}

export function GET() {
  const manifestPath = resolvePath("sitemap-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;

  const urls = Object.entries(manifest.entries)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([url, entry]) => {
      if (hasLastmod(entry)) {
        return `  <url>\n    <loc>${url}</loc>\n    <lastmod>${entry.lastmod}</lastmod>\n  </url>`;
      }
      return `  <url>\n    <loc>${url}</loc>\n  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
```

Remove the old DB-driven URL enumeration and the static-routes array — that logic now lives in the manifest builder. Keep `export const prerender = true;`.

- [ ] **Step 2: Build and inspect**

```bash
cd website && pnpm build
node -e 'const x=require("fs").readFileSync(".svelte-kit/cloudflare/sitemap.xml","utf8");console.log(x.split("\n").slice(0,10).join("\n"));console.log("...");console.log("urls:",[...x.matchAll(/<url>/g)].length);console.log("lastmods:",[...x.matchAll(/<lastmod>/g)].length)'
```

Expected: ~3,353 `<url>` elements. The `<lastmod>` count is **~3,350** (3 fewer than `<url>` — the three bare URLs `/`, `/map`, `/tools/combat-simulator` ship without `<lastmod>` per design). Every `<lastmod>` value is a valid `YYYY-MM-DD`.

- [ ] **Step 3: Verify a second build does NOT bump lastmods when DB is unchanged**

```bash
cd website && pnpm build
git diff --stat website/sitemap-manifest.json
```

Expected: the only changed line in the manifest is `"generated"` (timestamp). No `lastmod` values changed.

- [ ] **Step 4: Commit**

```bash
git add website/src/routes/sitemap.xml/+server.ts website/sitemap-manifest.json
git commit -m "feat(website): emit per-URL <lastmod> from content-hash manifest"
```

---

### Task 2.3: Smoke-test live after deploy

This is a verification task, not a code task. Do it after the next `pnpm cf-deploy`.

- [ ] **Step 1: Fetch the live sitemap**

```bash
curl -sS https://ancient-kingdoms.compendiums.org/sitemap.xml | head -20
```

Expected: every `<url>` block contains `<loc>`. **~3,350 of them** also contain `<lastmod>` — three URLs (`/`, `/map`, `/tools/combat-simulator`) intentionally ship without `<lastmod>` because their rendered content has multi-source dependencies that no single hash captures honestly (see Task 2.1 design). Hashed `lastmod` values vary per entity (not all identical to today).

- [ ] **Step 2: Resubmit the sitemap in Google Search Console**

GSC → Sitemaps → enter `https://ancient-kingdoms.compendiums.org/sitemap.xml` → Submit. Status should flip to "Success" within 24 h.

---

## Phase 3: IndexNow on deploy

Bolted onto the deploy step. Diffs the pre-build manifest snapshot against the post-build manifest, POSTs the changed/new/deleted hashed URLs to IndexNow. Bare entries (`/`, `/map`, `/tools/combat-simulator`) are skipped from the diff — Cloudflare Crawler Hints handles them on cache MISS as a separate channel.

### Task 3.1: Generate and host the IndexNow key

**Files:**
- Create: `website/static/<key>.txt` (the key file; filename equals key)
- Create: `website/src/lib/seo/indexnow-key.ts` (the key as a typed constant)

- [ ] **Step 1: Generate a key**

```bash
node -e 'console.log(require("crypto").randomBytes(16).toString("hex"))'
```

Copy the 32-character hex string. Use it for the filename AND the file content (the IndexNow protocol requires `GET https://<host>/<key>.txt` to return the key as plaintext, content-type `text/plain`).

- [ ] **Step 2: Create the static key file**

Write the key string to `website/static/<key>.txt`. No newline. (Substitute `<key>` with the actual hex.)

- [ ] **Step 3: Add a typed constant**

Create `website/src/lib/seo/indexnow-key.ts`:

```ts
/**
 * IndexNow API key. Must match the filename of the key file under static/.
 * IndexNow protocol: https://www.indexnow.org/documentation
 */
export const INDEXNOW_KEY = "<key>";
export const INDEXNOW_KEY_LOCATION = `https://ancient-kingdoms.compendiums.org/${INDEXNOW_KEY}.txt`;
```

- [ ] **Step 4: Commit**

```bash
git add website/static/<key>.txt website/src/lib/seo/indexnow-key.ts
git commit -m "chore(website): provision IndexNow key and static key file"
```

---

### Task 3.2: Add the post-deploy IndexNow ping script

**Files:**
- Create: `website/scripts/indexnow-ping.mjs`
- Create: `website/scripts/indexnow-ping.test.mjs`
- Modify: `website/package.json` (`cf-deploy` script chain)

- [ ] **Step 1: Write the failing test**

Create `website/scripts/indexnow-ping.test.mjs`:

```js
import { test, expect } from "vitest";
import { selectUrlsToPing, buildPayload } from "./indexnow-ping.mjs";

test("selectUrlsToPing flags URLs whose hash changed between prev and current", () => {
  const prev = {
    entries: {
      "https://example.com/a": { hash: "h1", lastmod: "2026-05-13" },
      "https://example.com/b": { hash: "h2", lastmod: "2026-05-12" },
    },
  };
  const current = {
    entries: {
      "https://example.com/a": { hash: "h1", lastmod: "2026-05-13" }, // unchanged
      "https://example.com/b": { hash: "h2_new", lastmod: "2026-05-14" }, // changed
      "https://example.com/c": { hash: "h3", lastmod: "2026-05-14" }, // added
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
  // Bare URLs never appear in the ping payload, even when they're new or
  // changed in some external sense. They rely on Cloudflare Crawler Hints
  // (Task 3.3) for IndexNow notification on cache MISS.
  expect(selectUrlsToPing(prev, current)).toEqual([
    "https://example.com/items/foo",
  ]);
});

test("selectUrlsToPing skips a URL that transitioned from hashed to bare", () => {
  // Going from hashed → bare is a re-classification, not a content change
  // we can describe to IndexNow. Stay silent.
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
```

Run: `cd website && pnpm test -- indexnow-ping`. Expected: all six fail with "Cannot find module".

- [ ] **Step 2: Implement the script**

Create `website/scripts/indexnow-ping.mjs`:

```js
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_HOST = "ancient-kingdoms.compendiums.org";
const SITE_URL = `https://${SITE_HOST}`;
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";
const KEY = "<key>"; // keep in sync with src/lib/seo/indexnow-key.ts
const KEY_LOCATION = `${SITE_URL}/${KEY}.txt`;

/**
 * Returns the set of URLs to ping IndexNow about. Computed from a prev/next
 * manifest diff so that:
 *  - URLs whose hash changed are pinged (their content moved).
 *  - URLs newly present in `current` (with a hash) are pinged (new pages).
 *  - URLs removed from `current` whose previous entry had a hash are
 *    pinged so IndexNow can drop them — the protocol accepts removed
 *    URLs for the same endpoint; the receiving search engines treat a
 *    404/410 on re-fetch as the signal to drop the page.
 *
 * Bare entries (entries without a `hash` field — manifest URLs like `/`,
 * `/map`, `/tools/combat-simulator` whose content can't be honestly
 * fingerprinted) are skipped in BOTH directions:
 *   - New bare entries don't ping (we have no signal to send).
 *   - Removed bare entries don't ping (we never claimed a version for them).
 *   - A URL that transitioned hashed → bare doesn't ping (it's a
 *     re-classification, not a content change we can describe).
 * Cloudflare Crawler Hints (Task 3.3) handles those URLs on cache MISS.
 *
 * Selecting by `lastmod == today` would miss commit-then-deploy-later
 * gaps and would never catch deletions. Diffing is the only correct path.
 */
export function selectUrlsToPing(previous, current) {
  const urls = [];
  const prevEntries = previous?.entries ?? {};
  const currentEntries = current?.entries ?? {};

  for (const [url, entry] of Object.entries(currentEntries)) {
    if (!("hash" in entry)) continue; // bare entry — skip
    const prev = prevEntries[url];
    if (!prev || prev.hash !== entry.hash) urls.push(url);
  }

  for (const [url, entry] of Object.entries(prevEntries)) {
    if (url in currentEntries) continue;
    if (!("hash" in entry)) continue; // removed bare URL — skip
    urls.push(url);
  }

  return urls;
}

export function buildPayload({ host, key, keyLocation, urls }) {
  return { host, key, keyLocation, urlList: urls };
}

function loadManifest(path) {
  if (!existsSync(path)) return { entries: {} };
  return JSON.parse(readFileSync(path, "utf8"));
}

async function main() {
  // Two positional args: previous manifest snapshot, current manifest.
  // Both paths are relative to package CWD. The previous-manifest snapshot
  // is taken by `cf-deploy` BEFORE the build overwrites it.
  const [prevPath, nextPath] = process.argv.slice(2);
  if (!prevPath || !nextPath) {
    throw new Error(
      "Usage: node scripts/indexnow-ping.mjs <prev-manifest> <current-manifest>",
    );
  }
  const previous = loadManifest(resolve(prevPath));
  const current = loadManifest(resolve(nextPath));
  const urls = selectUrlsToPing(previous, current);

  if (urls.length === 0) {
    console.log("indexnow: no manifest changes; skipping ping");
    return;
  }

  const payload = buildPayload({
    host: SITE_HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urls,
  });

  console.log(`indexnow: pinging ${urls.length} URLs`);
  let res;
  try {
    res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // fetch() rejects on DNS, TLS, connectivity, or abort errors. Per
    // MDN's Promise<Response> contract, these are thrown, not 4xx/5xx
    // status codes. We must catch them explicitly — letting the
    // promise reject would propagate up through `await main()` and
    // exit the process non-zero, which would mark `cf-deploy` failed
    // even though `wrangler deploy` already succeeded.
    // (https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)
    console.error(`indexnow: fetch failed (${err.message ?? err})`);
    return;
  }
  console.log(`indexnow: ${res.status} ${res.statusText}`);
  if (!res.ok) {
    const body = await res.text();
    console.error(`indexnow body: ${body}`);
    // Do NOT fail the deploy on IndexNow errors. Bing/Yandex reachability
    // hiccups are not show-stoppers.
  }
}

// Run only when invoked directly. Compare filesystem paths instead of
// serialized file: URLs so the gate works on checkouts with spaces or
// non-ASCII characters in the path.
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  await main();
}
```

- [ ] **Step 3: Run the tests**

```bash
cd website && pnpm test -- indexnow-ping
```

Expected: all six pass.

- [ ] **Step 4: Chain the ping into `cf-deploy` with a pre-build manifest snapshot**

The selection logic diffs the pre-build manifest snapshot against the post-build manifest. The chain snapshots, builds, deploys, pings, then cleans up:

```jsonc
// Before
"cf-deploy": "wrangler deploy",
// After
"cf-deploy": "cp sitemap-manifest.json .sitemap-manifest.prev.json && pnpm build && wrangler deploy && node scripts/indexnow-ping.mjs .sitemap-manifest.prev.json sitemap-manifest.json && rm -f .sitemap-manifest.prev.json",
```

Key points:
- `cp` runs FIRST so `.sitemap-manifest.prev.json` captures the previous deploy's manifest before `pnpm build` overwrites `sitemap-manifest.json`.
- `pnpm build` is explicit (not implicit through `wrangler deploy` — wrangler's Cloudflare-Pages-style deploys do not run a build for Workers projects with `[assets]`, see `website/wrangler.toml`).
- The ping runs AFTER `wrangler deploy` succeeds so we don't notify search engines about content that failed to ship.
- `rm -f` cleans up the temp file even if the previous command failed (the indexnow script itself swallows non-deploy-blocking errors). On Windows shells use `del`; not relevant for this repo (deploys run from macOS/Linux).
- Add `.sitemap-manifest.prev.json` to `.gitignore` to prevent the temp snapshot from being accidentally committed.

- [ ] **Step 5: Dry-run the ping locally**

```bash
cd website && cp sitemap-manifest.json /tmp/manifest-prev.json && node scripts/indexnow-ping.mjs /tmp/manifest-prev.json sitemap-manifest.json
```

Expected: `indexnow: no manifest changes; skipping ping` when the diff is empty, or a numeric URL count followed by `indexnow: 200 OK` / `indexnow: 202 Accepted`. (IndexNow returns 200 or 202 on success; 422 for invalid host; 4xx for malformed payload.)

- [ ] **Step 6: Commit**

```bash
git add website/scripts/indexnow-ping.mjs website/scripts/indexnow-ping.test.mjs website/package.json website/.gitignore
git commit -m "feat(website): ping IndexNow with per-deploy manifest diff"
```

---

### Task 3.3: Turn on Cloudflare Crawler Hints (defense-in-depth)

This is an out-of-band one-shot toggle on the Cloudflare zone — not source code. Captures cache-MISS URLs we missed (e.g. someone hand-bumps a page outside the manifest pipeline).

- [ ] **Step 1: Run the API toggle**

```bash
curl -X PATCH \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/crawler_hints" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":"on"}'
```

`ZONE_ID` is the `compendiums.org` zone ID; `CF_API_TOKEN` needs `Zone > Cache Settings > Edit` scope. Both should already exist in the user's Cloudflare account.

- [ ] **Step 2: Verify**

```bash
curl -sS \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/crawler_hints" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  | python3 -c 'import json,sys;print(json.load(sys.stdin)["result"]["value"])'
```

Expected: `on`.

No commit needed — this is a zone-level dashboard setting, not in git.

---

## Phase 4: Structured data where it earns its keep

Three buckets ship: `BreadcrumbList` (already in Phase 1.2, eligible for the Breadcrumb rich result), site-identity nodes `WebSite` + `Organization` + `Person` linked via `publisher` and `founder` (Site Names signal plus a cross-referenced author identity, cheap), and `CollectionPage` + `ItemList` on overview pages (machine-readable URL inventory for crawl-graph clarity, mirrors Wowhead).

Everything else schema.org defines was deliberately considered and dropped: per-entity `Thing` for items/monsters/chests/etc., `Place` for zones/altars, `Person`-per-NPC (distinct from the single author Person we ship in Task 4.2), `CreativeWork` for quests, `Article` for mechanics pages, `WebApplication` for the map and combat simulator. The rationale: none are eligible for a visible rich result on this site (no `aggregateRating` to fabricate, no per-page article images, no commerce). Their only payoff is an "entity disambiguation" signal that the visible HTML already conveys, weighed against per-route boilerplate maintenance across ~3,300 pages on every game patch. Cost-benefit fails. If GSC's URL Inspection later flags a specific entity-confusion issue, we can selectively add markup then; YAGNI applies.

The Phase 4 work is therefore small: one shared helper module, one root-layout addition, and one builder call on each of ~13 overview pages.

### Task 4.1: Build the JSON-LD helper module

**Files:**
- Create: `website/src/lib/seo/jsonld.ts`
- Create: `website/src/lib/seo/jsonld.test.ts`
- Create: `website/src/lib/components/JsonLd.svelte`

**Design.** Pure functions per shipped type. Each returns a node (no `@context`). The `JsonLd` component takes one node, prepends `@context: "https://schema.org"`, and renders it inside a single `<script type="application/ld+json">` block in `<svelte:head>`. Multiple `<JsonLd>` components on the same page produce multiple JSON-LD blocks, which Google supports natively. No `@graph` wrapper. Cross-references between nodes use stable `@id`s, resolved natively by Google when the referenced node appears on the same page: `WebSite.publisher → Organization` (`#org`), `Organization.founder → Person` (`#author`), `CollectionPage.isPartOf → WebSite` (`#website`).

Phase 1.2 already shipped a working `BreadcrumbList` emission inside `Breadcrumb.svelte` (with the URL bug fixed). Phase 4 does NOT move that emission; the component keeps owning its own JSON-LD. The helper module here covers the new node types — `WebSite` + `Organization` + `Person` (root layout) and `CollectionPage` (overview pages).

- [ ] **Step 1: Write the failing tests**

Create `website/src/lib/seo/jsonld.test.ts`:

```ts
import { test, expect } from "vitest";
import {
  buildWebSite,
  buildOrganization,
  buildPerson,
  buildCollectionPage,
  SITE_ID,
  ORG_ID,
  AUTHOR_ID,
} from "./jsonld";

test("SITE_ID, ORG_ID, AUTHOR_ID are stable", () => {
  expect(SITE_ID).toBe("https://ancient-kingdoms.compendiums.org/#website");
  expect(ORG_ID).toBe("https://ancient-kingdoms.compendiums.org/#org");
  expect(AUTHOR_ID).toBe("https://ancient-kingdoms.compendiums.org/#author");
});

test("buildWebSite has the expected shape", () => {
  const node = buildWebSite();
  expect(node["@type"]).toBe("WebSite");
  expect(node["@id"]).toBe(SITE_ID);
  expect(node.url).toBe("https://ancient-kingdoms.compendiums.org/");
  expect(node.publisher).toEqual({ "@id": ORG_ID });
  expect(node.inLanguage).toBe("en");
});

test("buildOrganization carries name, logo, description, and founder ref", () => {
  const node = buildOrganization();
  expect(node["@type"]).toBe("Organization");
  expect(node["@id"]).toBe(ORG_ID);
  expect(node.name).toBe("Ancient Kingdoms Compendium");
  expect(node.url).toBe("https://ancient-kingdoms.compendiums.org/");
  expect(node.description).toBe(
    "Fan-made wiki, interactive world map, and game database for Ancient Kingdoms",
  );
  expect(node.logo).toEqual({
    "@type": "ImageObject",
    url: "https://ancient-kingdoms.compendiums.org/icons/pwa-512.png",
    width: 512,
    height: 512,
  });
  expect(node.founder).toEqual({ "@id": AUTHOR_ID });
});

test("buildPerson uses Ko-fi as primary url with Steam cross-reference", () => {
  const node = buildPerson();
  expect(node["@type"]).toBe("Person");
  expect(node["@id"]).toBe(AUTHOR_ID);
  expect(node.name).toBe("WoW_Much");
  expect(node.url).toBe("https://ko-fi.com/wowmuch");
  expect(node.sameAs).toEqual([
    "https://ko-fi.com/wowmuch",
    "https://steamcommunity.com/profiles/76561198107304856/",
  ]);
});

test("buildCollectionPage embeds an ItemList sized to the input array", () => {
  const node = buildCollectionPage({
    path: "/items",
    name: "Items",
    description: "All items",
    items: [
      { name: "A", path: "/items/a" },
      { name: "B", path: "/items/b" },
      { name: "C", path: "/items/c" },
    ],
  });
  expect(node["@type"]).toBe("CollectionPage");
  expect(node["@id"]).toBe(
    "https://ancient-kingdoms.compendiums.org/items#page",
  );
  expect(node.isPartOf).toEqual({ "@id": SITE_ID });
  expect(node.mainEntity["@type"]).toBe("ItemList");
  expect(node.mainEntity.numberOfItems).toBe(3);
  expect(node.mainEntity.itemListElement[0]).toEqual({
    "@type": "ListItem",
    position: 1,
    name: "A",
    url: "https://ancient-kingdoms.compendiums.org/items/a",
  });
});

test("buildCollectionPage omits description cleanly when not provided", () => {
  const node = buildCollectionPage({
    path: "/items",
    name: "Items",
    items: [],
  });
  expect(node.description).toBeUndefined();
  expect(node.mainEntity.numberOfItems).toBe(0);
});
```

Run: `cd website && pnpm test -- jsonld`. Expected: all six fail with `Cannot find module`. (The vitest include glob already covers `src/**/*.test.ts` — no config change needed for this test file, only the `scripts/` tests required widening.)

- [ ] **Step 2: Implement `jsonld.ts`**

Create `website/src/lib/seo/jsonld.ts`:

```ts
import { SITE_URL, SITE_NAME, canonicalUrl } from "./site";

export const SITE_ID = `${SITE_URL}/#website`;
export const ORG_ID = `${SITE_URL}/#org`;
export const AUTHOR_ID = `${SITE_URL}/#author`;

// PNG over WebP for the Organization logo: Google's Organization logo
// guidance historically required raster formats (PNG/JPEG). The 512×512
// PWA icon at `/icons/pwa-512.png` fits Google's "at least 112×112,
// square or fits cleanly in a 1:1 box" recommendation.
export const LOGO_PATH = "/icons/pwa-512.png";

// The compendium operator's public identity. These URLs already appear in
// the homepage chrome (Ko-fi + Steam icons), so making them machine-readable
// here is not a new disclosure. Discord is intentionally excluded: an
// invite URL identifies an action, not an entity, which is the wrong shape
// for schema.org `sameAs`.
const AUTHOR_NAME = "WoW_Much";
const AUTHOR_KOFI_URL = "https://ko-fi.com/wowmuch";
const AUTHOR_STEAM_URL =
  "https://steamcommunity.com/profiles/76561198107304856/";

const ORG_DESCRIPTION =
  "Fan-made wiki, interactive world map, and game database for Ancient Kingdoms";

interface IdRef {
  "@id": string;
}

interface ImageObjectNode {
  "@type": "ImageObject";
  url: string;
  width: number;
  height: number;
}

export interface WebSiteNode {
  "@type": "WebSite";
  "@id": string;
  url: string;
  name: string;
  inLanguage: string;
  publisher: IdRef;
}

export function buildWebSite(): WebSiteNode {
  return {
    "@type": "WebSite",
    "@id": SITE_ID,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    inLanguage: "en",
    publisher: { "@id": ORG_ID },
  };
}

export interface OrganizationNode {
  "@type": "Organization";
  "@id": string;
  name: string;
  url: string;
  description: string;
  logo: ImageObjectNode;
  founder: IdRef;
}

export function buildOrganization(): OrganizationNode {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    description: ORG_DESCRIPTION,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}${LOGO_PATH}`,
      width: 512,
      height: 512,
    },
    founder: { "@id": AUTHOR_ID },
  };
}

export interface PersonNode {
  "@type": "Person";
  "@id": string;
  name: string;
  url: string;
  sameAs: string[];
}

export function buildPerson(): PersonNode {
  return {
    "@type": "Person",
    "@id": AUTHOR_ID,
    name: AUTHOR_NAME,
    // Ko-fi is the primary public creator profile — that's where someone
    // would go to learn about the maintainer. Steam profile lives in
    // `sameAs` for cross-reference. Schema.org `sameAs` includes the
    // canonical `url` by convention so an entity that visits a `sameAs`
    // URL finds the same identity claim there too.
    url: AUTHOR_KOFI_URL,
    sameAs: [AUTHOR_KOFI_URL, AUTHOR_STEAM_URL],
  };
}

export interface CollectionItem {
  name: string;
  path: string;
}

export interface CollectionPageSpec {
  path: string;
  name: string;
  description?: string;
  items: CollectionItem[];
}

interface ItemListEntry {
  "@type": "ListItem";
  position: number;
  name: string;
  url: string;
}

export interface CollectionPageNode {
  "@type": "CollectionPage";
  "@id": string;
  url: string;
  name: string;
  description?: string;
  isPartOf: IdRef;
  mainEntity: {
    "@type": "ItemList";
    numberOfItems: number;
    itemListOrder: "https://schema.org/ItemListOrderAscending";
    itemListElement: ItemListEntry[];
  };
}

export function buildCollectionPage(
  spec: CollectionPageSpec,
): CollectionPageNode {
  const node: CollectionPageNode = {
    "@type": "CollectionPage",
    "@id": `${canonicalUrl(spec.path)}#page`,
    url: canonicalUrl(spec.path),
    name: spec.name,
    isPartOf: { "@id": SITE_ID },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: spec.items.length,
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      itemListElement: spec.items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        url: canonicalUrl(item.path),
      })),
    },
  };
  if (spec.description) node.description = spec.description;
  return node;
}

export type JsonLdNode =
  | WebSiteNode
  | OrganizationNode
  | PersonNode
  | CollectionPageNode;
```

- [ ] **Step 3: Create the renderer component**

Create `website/src/lib/components/JsonLd.svelte`:

```svelte
<script lang="ts" module>
  import type { JsonLdNode } from "$lib/seo/jsonld";
  export interface JsonLdProps {
    node: JsonLdNode;
  }
</script>

<script lang="ts">
  let { node }: JsonLdProps = $props();
  const json = $derived(
    JSON.stringify({ "@context": "https://schema.org", ...node }),
  );
</script>

<svelte:head>
  <!-- eslint-disable-next-line svelte/no-at-html-tags — JSON.stringify output is structured data, not user HTML; the </ + script> split avoids the Svelte parser closing the surrounding script block -->
  {@html `<script type="application/ld+json">${json}</` + `script>`}
</svelte:head>
```

- [ ] **Step 4: Run the tests**

```bash
cd website && pnpm test -- jsonld
```

Expected: all six pass.

- [ ] **Step 5: Commit**

```bash
git add website/src/lib/seo/jsonld.ts website/src/lib/seo/jsonld.test.ts website/src/lib/components/JsonLd.svelte
git commit -m "feat(website): add JSON-LD helper module for WebSite/Organization/CollectionPage"
```

---

### Task 4.2: Emit `WebSite` + `Organization` + `Person` from the root layout

**Files:**
- Modify: `website/src/routes/+layout.svelte`
- Modify: `website/src/routes/+page.svelte` (delete the existing `websiteLd` block — the layout now handles it)

- [ ] **Step 1: Add WebSite + Organization + Person emission to the root layout**

In `website/src/routes/+layout.svelte`, build the three nodes and render them once. Because `+layout.svelte`'s `<svelte:head>` content is inherited by every page, every prerendered HTML gets the three blocks exactly once.

```svelte
<script lang="ts">
  import JsonLd from "$lib/components/JsonLd.svelte";
  import {
    buildWebSite,
    buildOrganization,
    buildPerson,
  } from "$lib/seo/jsonld";
  // ... existing imports

  const websiteNode = buildWebSite();
  const organizationNode = buildOrganization();
  const personNode = buildPerson();
</script>

<JsonLd node={websiteNode} />
<JsonLd node={organizationNode} />
<JsonLd node={personNode} />

<!-- existing layout markup unchanged -->
```

Block order matches the entity reference chain: WebSite → publisher → Organization → founder → Person. Google's parser is order-agnostic when `@id` references are present, so this order is for readability; functionally equivalent shuffles work too.

- [ ] **Step 2: Remove the old homepage-local `websiteLd` block**

In `website/src/routes/+page.svelte`, delete:
- the `const websiteLd = { ... }` constant (currently lines ~35–42)
- the `<svelte:head>{@html …}</svelte:head>` JSON-LD injection block (currently lines ~47–51)
- the now-unused `import { SITE_NAME, SITE_URL }` if those symbols are no longer referenced

The homepage now picks up `WebSite` + `Organization` from the root layout like every other page. The visible homepage content is unchanged.

- [ ] **Step 3: Verify**

```bash
cd website && pnpm build
node -e 'const fs=require("fs");for(const p of ["index","items","items/abyssal_tidehammer","mechanics/combat","map"]){const f=`.svelte-kit/cloudflare/${p}.html`;if(!fs.existsSync(f))continue;const h=fs.readFileSync(f,"utf8");const blocks=[...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>{try{return JSON.parse(m[1])["@type"]}catch{return"INVALID"}});console.log(p,blocks)}'
```

Expected: every page lists at least `[ 'WebSite', 'Organization', 'Person' ]`. Pages with a `Breadcrumb` component also list `'BreadcrumbList'`. The homepage shows exactly `[ 'WebSite', 'Organization', 'Person' ]` (no duplicate `WebSite` after the homepage-local block is removed).

- [ ] **Step 4: Validate against schema.org**

After deploy, paste `https://ancient-kingdoms.compendiums.org/` into `https://validator.schema.org`. Expected: `WebSite`, `Organization`, and `Person` all detected. 0 errors. The validator should report the `publisher` and `founder` `@id` references resolving against the in-document Organization and Person nodes respectively.

- [ ] **Step 5: Commit**

```bash
git add website/src/routes/+layout.svelte website/src/routes/+page.svelte
git commit -m "feat(website): emit WebSite + Organization + Person JSON-LD from root layout"
```

---

### Task 4.3: Emit `CollectionPage` + `ItemList` on overview pages

This is the **single biggest crawl-graph win** in Phase 4: each overview page surfaces every entity URL it represents in a machine-readable list, giving Google a clean enumerable map of the catalog alongside the visible `<a href>` links.

**Files (modify each `+page.svelte`; loaders stay untouched — overview loaders already return a rich array with `id` and `name`):**
- `website/src/routes/items/+page.svelte`
- `website/src/routes/monsters/+page.svelte`
- `website/src/routes/npcs/+page.svelte`
- `website/src/routes/zones/+page.svelte`
- `website/src/routes/quests/+page.svelte`
- `website/src/routes/chests/+page.svelte`
- `website/src/routes/gather-items/+page.svelte`
- `website/src/routes/skills/+page.svelte`
- `website/src/routes/classes/+page.svelte`
- `website/src/routes/altars/+page.svelte`
- `website/src/routes/pets/+page.svelte`
- `website/src/routes/recipes/+page.svelte`
- `website/src/routes/professions/+page.svelte`

- [ ] **Step 1: Confirm every overview loader already exposes `id` + `name` per row**

```bash
cd website && pnpm exec svelte-kit sync
node -e 'const fs=require("fs");for(const r of ["items","monsters","npcs","zones","quests","chests","gather-items","skills","classes","altars","pets","recipes","professions"]){const p=`src/routes/${r}/+page.server.ts`;if(!fs.existsSync(p))continue;const s=fs.readFileSync(p,"utf8");const ret=s.match(/return\s+\{[^}]+\}/s)?.[0]?.replace(/\s+/g," ").slice(0,160) ?? "no return";console.log(r,ret)}'
```

Expected: each loader returns at least one array of objects with `id` and `name` accessible. If `recipes` does NOT already expose a unified `{ id; name }` projection across crafting/alchemy/scribing, add a NEW `recipeLinks: Array<{ id; name; kind }>` field alongside the existing payload (do NOT replace existing fields — current overview rendering depends on them).

If you ADD a new load field on a route whose load function has an explicit manual return-type annotation (e.g. `(): QuestsPageData`), update the matching `src/lib/types/*PageData` interface in lockstep, OR drop the explicit annotation so generated `./$types` can pick the new field up.

- [ ] **Step 2: Emit `CollectionPage` from each overview page**

Pattern for `website/src/routes/items/+page.svelte` (apply analogously to every overview route, pointing at the appropriate `data.<entity>` array):

```svelte
<script lang="ts">
  import JsonLd from "$lib/components/JsonLd.svelte";
  import { buildCollectionPage } from "$lib/seo/jsonld";
  // ... existing imports

  let { data } = $props();

  const collectionNode = buildCollectionPage({
    path: "/items",
    name: "Items — Ancient Kingdoms Compendium",
    description: `Searchable database of ${data.items.length.toLocaleString()} items in Ancient Kingdoms.`,
    items: data.items.map((i) => ({ name: i.name, path: `/items/${i.id}` })),
  });
</script>

<!-- existing <Seo>, <Breadcrumb>, page content unchanged -->
<JsonLd node={collectionNode} />
```

For recipes: source from `data.recipeLinks` (or whatever unified array Step 1 produced), mapping `(r) => ({ name: r.name, path: `/recipes/${r.id}` })`. For the professions hub: source from `data.professions`.

- [ ] **Step 3: Validate page size on `/items` (the largest overview)**

```bash
cd website && pnpm build
node -e 'const fs=require("fs");const h=fs.readFileSync(".svelte-kit/cloudflare/items.html","utf8");const blocks=[...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));const cp=blocks.find(b=>b["@type"]==="CollectionPage");console.log("blocks:",blocks.map(b=>b["@type"]));console.log("items in ItemList:",cp?.mainEntity?.numberOfItems);console.log("page bytes:",h.length)'
```

Expected: blocks include `[ 'WebSite', 'Organization', 'Person', 'BreadcrumbList', 'CollectionPage' ]`. `numberOfItems` matches `data.items.length` (~1,570). Page bytes increase by ~220 KB compared to the previous build — that's the cost of embedding 1,570 list entries. If the page exceeds 1 MB after this change, consider linking to a separate `/items.sitemap.json` rather than inlining. Not expected at current scale.

- [ ] **Step 4: Commit**

```bash
git add website/src/routes/{items,monsters,npcs,zones,quests,chests,gather-items,skills,classes,altars,pets,recipes,professions}/+page.svelte website/src/routes/recipes/+page.server.ts
git commit -m "feat(website): emit CollectionPage+ItemList JSON-LD on overview pages"
```

(Adjust the `git add` list if recipes' loader didn't need a change.)

---
### Task 4.4: Final cross-cutting validation

- [ ] **Step 1: Run the full test suite and lints**

```bash
cd website && pnpm check && pnpm lint && pnpm test
```

Expected: 0 errors across all three.

- [ ] **Step 2: Deploy and validate live**

```bash
cd website && pnpm cf-deploy && pnpm cf-deploy:redirect
```

(IndexNow ping fires automatically as part of `cf-deploy`.)

- [ ] **Step 3: Live JSON-LD audit**

Paste three representative URLs into `https://validator.schema.org`:
- `https://ancient-kingdoms.compendiums.org/` (homepage — expect `WebSite`, `Organization`, `Person`)
- `https://ancient-kingdoms.compendiums.org/items` (overview — expect `WebSite`, `Organization`, `Person`, `BreadcrumbList`, `CollectionPage`)
- `https://ancient-kingdoms.compendiums.org/items/abyssal_tidehammer` (detail — expect `WebSite`, `Organization`, `Person`, `BreadcrumbList`)

Expected: 0 errors on each. Warnings about missing optional fields are acceptable.

- [ ] **Step 4: Google Rich Results Test for the Breadcrumb rich result**

`https://search.google.com/test/rich-results` against any detail page (e.g. `/items/abyssal_tidehammer`). Expected: `Breadcrumbs` listed under "Detected items" as eligible. (No other rich-result types are expected on this site by design — see Phase 4 intro.)

- [ ] **Step 5: GSC resubmit**

GSC → Sitemaps → resubmit `https://ancient-kingdoms.compendiums.org/sitemap.xml`. Status: Success.

GSC → URL Inspection → Request Indexing on the homepage and the top 10 overview pages to seed the crawl.

GSC → Settings → Change of Address → click "Try Again" on the validation that previously failed.

---

## Cross-cutting verification gates

Before merging this plan's final commit:

- `pnpm check` — 0 errors, 0 warnings
- `pnpm lint` — clean
- `pnpm test` — all green
- `pnpm build` — clean; `node scripts/snapshot-mechanics.mjs` reports "All snapshots match."
- Manual: validator.schema.org on three sample URLs — 0 errors
- Manual: Google Rich Results Test on a detail page — Breadcrumb eligible

## Out of scope

Deliberately deferred per user direction in the handoff. List these as follow-ups, do not let them block this plan:

- Internal-link improvements (cross-link related items on detail pages, noscript-only anchor lists, `/site-index`). Discuss approach with user before designing.
- A real `/search?q=` endpoint enabling `SearchAction`. Substantial work; punt unless user wants it.
- A published `/data` dump enabling `Dataset` JSON-LD. Punt unless user wants Dataset Search inclusion.
- Per-entity structured data (`Thing` / `Place` / `Person` / `CreativeWork` on detail pages). Considered and dropped: no rich-result eligibility, marginal entity-disambiguation signal vs. ~3,300 routes of per-patch maintenance. Re-evaluate only if a specific entity confusion shows up in GSC's URL Inspection.
- `Article` on mechanics pages. Considered and dropped: requires per-page representative images for Article rich-result eligibility, which we are not investing in. Without images the schema is valid but ships no SERP enhancement, only a marginal freshness signal — not worth the git-date generator + per-page boilerplate.
- `WebApplication` on `/map` and `/tools/combat-simulator`. Considered and dropped: SoftwareApplication rich result requires `aggregateRating`, which we will not fabricate.
- Wikidata QID curation for `sameAs` on the homepage. Optional later win if/when the game gets a Wikidata entry.

## Push-when-user-requests

`main` accumulates these commits beyond `origin/main`:

- `0a2b60b fix(website): set canonical link header on legacy redirect`
- `2af6195 chore: add canonical worktree bootstrap workflow`
- `7d8e957 chore: refresh pnpm-lockfile to match website manifest`
- `bec223d fix(website): remove duplicate pnpm-workspace.yaml`
- + all commits this plan produces

When the user says "push": `git push origin main` and, for combat-simulator, `git push --force-with-lease origin combat-simulator`.
