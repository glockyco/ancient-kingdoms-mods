---
title: "Mercenary Stats Tool Implementation Plan"
type: plan
status: implemented
created: 2026-06-23
parent: 2026-06-23-mercenary-stats-tool-design
superseded_by:
archived: 2026-06-25
---

# Mercenary Stats Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a prerendered `/tools/mercenary-stats` page that shows every mercenary class/race stat range at any level and veteran-point total, plus a hiring odds & cost explorer, porting the finished prototype in `.merc-mock/` onto the project stack.

**Architecture:** Build-time DB load (curves + taverns) via a `+page.server.ts` (`prerender = true`), a pure `$lib/utils/merc-stats.ts` math/cost module shared by the UI, and a Svelte 5 `+page.svelte` that reproduces the prototype look using the project's tokens. No runtime DB or Worker.

**Tech Stack:** SvelteKit (Svelte 5 runes), better-sqlite3 (build-time), Tailwind v4 + OKLCH tokens, vitest.

**Reference:** The approved, validated prototype is `.merc-mock/index.html` and `.merc-mock/merc-stats.mjs`. It is the source of truth for markup, CSS, and behaviour. It exists on disk during execution and is deleted in the final task. Design spec: `docs/superpowers/specs/2026-06-23-mercenary-stats-tool-design.md`.

---

### Task 1: Stat-hue color tokens

**Files:**
- Modify: `website/src/app.css`

- [ ] **Step 1: Add the four stat tokens to `:root` and `.dark`**

In `:root` (after the existing `--monster-*` tokens), add:

```css
  /* Mercenary stat-range hues */
  --stat-hp: oklch(0.58 0.12 155);
  --stat-mana: oklch(0.57 0.13 255);
  --stat-atk: oklch(0.62 0.16 36);
  --stat-spell: oklch(0.55 0.15 305);
```

In `.dark` (after the `--quality-text-*` overrides), add:

```css
  --stat-hp: oklch(0.72 0.15 155);
  --stat-mana: oklch(0.72 0.14 255);
  --stat-atk: oklch(0.74 0.16 40);
  --stat-spell: oklch(0.72 0.15 305);
```

- [ ] **Step 2: Expose them as Tailwind colors in `@theme inline`**

In the `@theme inline { … }` block (after the `--color-monster-*` lines), add:

```css
  --color-stat-hp: var(--stat-hp);
  --color-stat-mana: var(--stat-mana);
  --color-stat-atk: var(--stat-atk);
  --color-stat-spell: var(--stat-spell);
```

- [ ] **Step 3: Commit**

```bash
git add website/src/app.css
git commit -m "feat(website): add mercenary stat-range color tokens"
```

---

### Task 2: Pure math/cost module + focused test

**Files:**
- Create: `website/src/lib/utils/merc-stats.ts`
- Test: `website/src/lib/utils/merc-stats.test.ts`

- [ ] **Step 1: Write the module**

This is a typed port of `.merc-mock/merc-stats.mjs`. The only behavioural change is that
`computeAll` takes the DB-loaded `curves` as a parameter (the prototype hardcoded them).

```ts
// Pure mercenary stat-range math + hiring-cost helpers.
// Engine-faithful: float32 (Math.fround) + banker's rounding to match Unity/C#.
// Game-logic constants transcribed from decompiled server-scripts (citations inline).

export const VET_MULT_PER_POINT = 0.0025; // Player.cs:8474
const CON_HEALTH = 25; // Constitution.cs:15
const INT_MANA = 20; // Intelligence.cs:23
const STR_PHYS = 1.0; // Strength.cs:17
const INT_MAGIC = 1.5; // Intelligence.cs:38 (round(INT*1.5))

/** Round to float32 precision, as Unity stores/computes. */
export const f32 = (x: number): number => Math.fround(x);

/** (int)Math.Round(double) — banker's rounding (MidpointRounding.ToEven). */
export function iround(x: number): number {
  const floor = Math.floor(x);
  const diff = x - floor;
  if (diff < 0.5) return floor;
  if (diff > 0.5) return floor + 1;
  return floor % 2 === 0 ? floor : floor + 1;
}

export interface RaceBands {
  hp: [number, number];
  mana: [number, number];
  energy: [number, number];
  bc: number;
}

// Per-race roll bands + base-combat factor. Source: Player.cs:8401-8430
export const RACES: Record<string, RaceBands> = {
  Human: { hp: [0.95, 1.0], mana: [0.95, 1.0], energy: [0.95, 1.0], bc: 0.9 },
  Elf: { hp: [0.9, 0.95], mana: [1.0, 1.05], energy: [0.9, 0.95], bc: 0.7 },
  "Dark Elf": { hp: [0.9, 0.95], mana: [1.0, 1.05], energy: [0.9, 0.95], bc: 0.9 },
  Dwarf: { hp: [1.0, 1.05], mana: [0.9, 0.95], energy: [1.0, 1.05], bc: 0.7 },
  "Fire Goblin": { hp: [0.95, 1.0], mana: [0.9, 0.95], energy: [1.0, 1.05], bc: 0.9 },
  Felarii: { hp: [0.9, 0.95], mana: [0.9, 0.95], energy: [1.0, 1.05], bc: 0.95 },
};

export const RACE_ORDER = ["Human", "Elf", "Dark Elf", "Dwarf", "Fire Goblin", "Felarii"];

export type Role = "mana" | "energy";

export interface ClassDef {
  type: string;
  role: Role;
  pool: string[];
  div: Record<string, number>;
}

// Mercenary classes. pool Source: Utils.cs:579-585 ; div Source: Player.cs:6975-7152
export const CLASSES: Record<string, ClassDef> = {
  Warrior: { type: "Warrior", role: "energy", pool: ["Human", "Elf", "Dark Elf", "Dwarf", "Fire Goblin", "Felarii"], div: { STR: 3, CON: 2, DEX: 4, INT: 5, WIS: 6, CHA: 6 } },
  Rogue: { type: "Rogue", role: "energy", pool: ["Human", "Dark Elf", "Dwarf", "Fire Goblin", "Felarii"], div: { STR: 3, CON: 4, DEX: 2, INT: 5, WIS: 6, CHA: 6 } },
  Cleric: { type: "Cleric", role: "mana", pool: ["Human", "Elf", "Dark Elf", "Dwarf", "Fire Goblin"], div: { STR: 5, CON: 4, DEX: 6, INT: 3, WIS: 2, CHA: 6 } },
  Wizard: { type: "Wizard", role: "mana", pool: ["Human", "Elf", "Dark Elf", "Fire Goblin", "Felarii"], div: { STR: 6, CON: 5, DEX: 3, INT: 2, WIS: 4, CHA: 6 } },
  Druid: { type: "Druid", role: "mana", pool: ["Human", "Elf", "Fire Goblin", "Felarii"], div: { STR: 6, CON: 5, DEX: 4, INT: 3, WIS: 2, CHA: 6 } },
  Ranger: { type: "Ranger", role: "mana", pool: ["Human", "Elf", "Dark Elf", "Dwarf", "Fire Goblin", "Felarii"], div: { STR: 4, CON: 3, DEX: 2, INT: 6, WIS: 5, CHA: 6 } },
};

export interface Curve {
  hp_base: number;
  hp_per: number;
  mana_base: number;
  mana_per: number;
}
export type Curves = Record<string, Curve>; // keyed by type_monster

const linear = (base: number, per: number, level: number): number => base + per * (level - 1);

export function attrs(cls: string, level: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [a, n] of Object.entries(CLASSES[cls].div)) out[a] = Math.floor(level / n);
  return out;
}

const hpAt = (hpCurve: number, mult: number, con: number): number =>
  iround(f32(f32(hpCurve) * f32(mult))) + con * CON_HEALTH;
const manaAt = (manaCurve: number, mult: number, intl: number): number =>
  iround(f32(f32(manaCurve) * f32(mult))) + intl * INT_MANA;
const baseCombatMax = (level: number, factor: number): number =>
  iround(f32(f32(level) * f32(factor))) - 1;

export interface MercRow {
  race: string;
  eligible: boolean;
  hp?: [number, number];
  mana?: [number, number] | null;
  atk?: [number, number];
  spell?: [number, number];
}

export interface ClassResult {
  cls: string;
  role: Role;
  hasMana: boolean;
  attrs: Record<string, number>;
  hpCurve: number;
  manaCurve: number;
  resource: string;
  rows: MercRow[];
}

/** Full stat matrix for one (level, veteran) query, given DB-loaded base curves. */
export function computeAll(level: number, veteran: number, curves: Curves): ClassResult[] {
  const vetAdd = f32(veteran * VET_MULT_PER_POINT);
  return Object.entries(CLASSES).map(([cls, c]) => {
    const a = attrs(cls, level);
    const cur = curves[c.type];
    const hpCurve = linear(cur.hp_base, cur.hp_per, level);
    const manaCurve = linear(cur.mana_base, cur.mana_per, level);
    const hasMana = c.role === "mana" && manaCurve > 0;
    const magAdd = iround(f32(a.INT * INT_MAGIC));
    const pool = new Set(c.pool);

    const rows: MercRow[] = RACE_ORDER.map((race) => {
      if (!pool.has(race)) return { race, eligible: false };
      const R = RACES[race];
      const bc = baseCombatMax(level, R.bc);
      const hp: [number, number] = [hpAt(hpCurve, f32(R.hp[0]) + vetAdd, a.CON), hpAt(hpCurve, f32(R.hp[1]) + vetAdd, a.CON)];
      const atk: [number, number] = [Math.trunc(a.STR * STR_PHYS), bc + Math.trunc(a.STR * STR_PHYS)];
      const spell: [number, number] = [magAdd, bc + magAdd];
      const mana: [number, number] | null = hasMana
        ? [manaAt(manaCurve, f32(R.mana[0]) + vetAdd, a.INT), manaAt(manaCurve, f32(R.mana[1]) + vetAdd, a.INT)]
        : null;
      return { race, eligible: true, hp, mana, atk, spell };
    });

    return { cls, role: c.role, hasMana, attrs: a, hpCurve, manaCurve, resource: c.role === "energy" ? "Rage" : "Mana", rows };
  });
}

// --- Hiring cost & odds ---------------------------------------------------- //

// Tavern race bias by numeric zone id. Source: Utils.GetRandomChar (Utils.cs:588-609)
export const ZONE_RACES: Record<number, string[]> = {
  1: ["Elf"],
  3: ["Dwarf"],
  4: ["Human"],
  5: ["Dark Elf", "Fire Goblin"],
  22: ["Felarii"],
};

export function raceHomeZone(race: string): number | null {
  for (const [z, rs] of Object.entries(ZONE_RACES)) if (rs.includes(race)) return Number(z);
  return null;
}

/**
 * P(roll this race) when hiring `cls` in `zoneId`. Zone-pinned races in the pool
 * are forced; otherwise uniform over the pool. Source: Utils.cs:588-609
 */
export function pRaceInZone(cls: string, race: string, zoneId: number | null): number {
  const pool = CLASSES[cls].pool;
  if (!pool.includes(race)) return 0;
  const pinned = (zoneId != null ? ZONE_RACES[zoneId] ?? [] : []).filter((r) => pool.includes(r));
  const list = pinned.length ? pinned : pool;
  return list.includes(race) ? 1 / list.length : 0;
}

/** Charisma -> purchase discount fraction. Source: Charisma.GetDiscountPurchaseBonus (x0.002, cap 25%). */
export function charismaDiscount(charisma: number): number {
  return Math.min(0.25, Math.max(0, charisma) * 0.002);
}

/**
 * Gold to hire one mercenary. Source: UIMercenaries.CalculatePriceMercenaryLevel
 * + UINpcTrading.CalculatePurchaseItemPrice.
 */
export function hirePrice(level: number, veteran: number, discount = 0): number {
  const L = Math.max(10, Math.min(50, level));
  const base = Math.round(20 + 400 * ((L - 10) / 40) ** 2 + Math.max(0, veteran) * 15);
  const d = Math.min(0.25, Math.max(0, discount));
  return Math.max(1, base - Math.ceil(base * d));
}

/** P(stat >= target), discrete uniform over integers [lo, hi]. Use for base-combat. */
export function pAtLeast([lo, hi]: [number, number], target: number): number {
  if (target <= lo) return 1;
  if (target > hi) return 0;
  return (hi - target + 1) / (hi - lo + 1);
}

/**
 * P(total >= target) for a Health/Mana-style stat: total = round(curve*mult) + flatBonus,
 * mult ~ Uniform(band+vetAdd). Inverts the rounded affine map to the multiplier band (exact).
 */
export function pCurveRollAtLeast(curve: number, flatBonus: number, band: [number, number], vetAdd: number, target: number): number {
  const lo = f32(band[0]) + vetAdd;
  const hi = f32(band[1]) + vetAdd;
  if (hi <= lo) return target <= iround(f32(f32(curve) * f32(lo))) + flatBonus ? 1 : 0;
  const required = (target - flatBonus - 0.5) / curve;
  if (required <= lo) return 1;
  if (required > hi) return 0;
  return (hi - required) / (hi - lo);
}

export function pHealthAtLeast(cd: ClassResult, race: string, veteran: number, target: number): number {
  return pCurveRollAtLeast(cd.hpCurve, cd.attrs.CON * CON_HEALTH, RACES[race].hp, f32(veteran * VET_MULT_PER_POINT), target);
}

export function pManaAtLeast(cd: ClassResult, race: string, veteran: number, target: number): number {
  if (!cd.hasMana) return 1;
  return pCurveRollAtLeast(cd.manaCurve, cd.attrs.INT * INT_MANA, RACES[race].mana, f32(veteran * VET_MULT_PER_POINT), target);
}
```

- [ ] **Step 2: Write the focused test**

```ts
import { describe, expect, test } from "vitest";
import { computeAll, hirePrice, charismaDiscount, pRaceInZone, type Curves } from "./merc-stats";

// Curves from the shipped compendium DB (pets where is_mercenary=1).
const CURVES: Curves = {
  Warrior: { hp_base: 110, hp_per: 110, mana_base: 0, mana_per: 0 },
  Rogue: { hp_base: 60, hp_per: 60, mana_base: 0, mana_per: 0 },
  Cleric: { hp_base: 80, hp_per: 80, mana_base: 20, mana_per: 10 },
  Wizard: { hp_base: 50, hp_per: 50, mana_base: 20, mana_per: 15 },
  Druid: { hp_base: 55, hp_per: 55, mana_base: 20, mana_per: 10 },
  Ranger: { hp_base: 80, hp_per: 80, mana_base: 15, mana_per: 5 },
};

function row(cls: string, race: string, level: number, veteran: number) {
  const c = computeAll(level, veteran, CURVES).find((x) => x.cls === cls)!;
  return c.rows.find((r) => r.race === race)!;
}

describe("computeAll", () => {
  test("Warrior/Dwarf at level 50 veteran 200 (banker's rounding edge cases)", () => {
    const r = row("Warrior", "Dwarf", 50, 200);
    expect(r.hp).toEqual([8875, 9150]);
    expect(r.atk).toEqual([16, 50]);
    expect(r.spell).toEqual([15, 49]);
  });

  test("Warrior/Felarii base-combat factor (bc 0.95)", () => {
    const r = row("Warrior", "Felarii", 50, 200);
    expect(r.atk).toEqual([16, 63]);
  });

  test("Wizard/Human caster row at 50/200", () => {
    const r = row("Wizard", "Human", 50, 200);
    expect(r.hp).toEqual([3875, 4000]);
    expect(r.mana).toEqual([1595, 1632]);
    expect(r.spell).toEqual([38, 82]);
  });

  test("low level: Warrior/Dwarf at 20/0", () => {
    expect(row("Warrior", "Dwarf", 20, 0).hp).toEqual([2450, 2560]);
  });

  test("ineligible race is marked, not computed", () => {
    expect(row("Rogue", "Elf", 50, 0).eligible).toBe(false);
  });
});

describe("hiring cost helpers", () => {
  test("hire price", () => {
    expect(hirePrice(50, 0)).toBe(420);
    expect(hirePrice(10, 0)).toBe(20);
    expect(hirePrice(50, 200)).toBe(3420);
  });

  test("charisma discount caps at 25%", () => {
    expect(charismaDiscount(0)).toBe(0);
    expect(charismaDiscount(60)).toBeCloseTo(0.12, 10);
    expect(charismaDiscount(125)).toBe(0.25);
    expect(charismaDiscount(200)).toBe(0.25);
  });

  test("race probability by zone", () => {
    expect(pRaceInZone("Wizard", "Human", 4)).toBe(1); // Crescent Coast pins Human
    expect(pRaceInZone("Wizard", "Human", 24)).toBe(1 / 5); // neutral tavern, pool size 5
    expect(pRaceInZone("Wizard", "Felarii", 4)).toBe(0); // can't roll Felarii at a Human tavern
    expect(pRaceInZone("Wizard", "Human", 3)).toBe(1 / 5); // Everfrost pins Dwarf (not a Wizard race) -> uniform over pool
  });
});
```

- [ ] **Step 3: Run the test**

Run: `cd website && pnpm vitest run src/lib/utils/merc-stats.test.ts`
Expected: PASS (all assertions).

- [ ] **Step 4: Commit**

```bash
git add website/src/lib/utils/merc-stats.ts website/src/lib/utils/merc-stats.test.ts
git commit -m "feat(website): add mercenary stat-range + hiring-cost module"
```

---

### Task 3: DB queries

**Files:**
- Create: `website/src/lib/queries/mercenaries.server.ts`

- [ ] **Step 1: Write the queries**

```ts
import { query } from "$lib/db.server";
import type { Curve } from "$lib/utils/merc-stats";

export interface Tavern {
  npc_name: string;
  zone_name: string;
  zone_num: number;
}

/** Base HP/mana LinearInt curves for each mercenary class, keyed by type_monster. */
export function getMercenaryCurves(): Record<string, Curve> {
  const rows = query<{
    type_monster: string;
    health_base: number;
    health_per_level: number;
    mana_base: number;
    mana_per_level: number;
  }>(
    `SELECT type_monster, health_base, health_per_level, mana_base, mana_per_level
     FROM pets WHERE is_mercenary = 1`,
  );
  const out: Record<string, Curve> = {};
  for (const r of rows) {
    out[r.type_monster] = {
      hp_base: r.health_base,
      hp_per: r.health_per_level,
      mana_base: r.mana_base,
      mana_per: r.mana_per_level,
    };
  }
  return out;
}

/** Mercenary recruiters (taverns) with their zone, incl. the numeric zone id for race bias. */
export function getTaverns(): Tavern[] {
  return query<Tavern>(
    `SELECT DISTINCT n.name AS npc_name, z.name AS zone_name, z.zone_id AS zone_num
     FROM npcs n
     JOIN npc_spawns s ON s.npc_id = n.id
     JOIN zones z ON z.id = s.zone_id
     WHERE json_extract(n.roles, '$.is_recruiter_mercenaries') = 1
     ORDER BY z.zone_id`,
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd website && pnpm check`
Expected: no errors referencing `mercenaries.server.ts`.

- [ ] **Step 3: Commit**

```bash
git add website/src/lib/queries/mercenaries.server.ts
git commit -m "feat(website): add mercenary curve + tavern queries"
```

---

### Task 4: Page server load

**Files:**
- Create: `website/src/routes/tools/mercenary-stats/+page.server.ts`

- [ ] **Step 1: Write the load**

```ts
import type { PageServerLoad } from "./$types";
import { getMercenaryCurves, getTaverns, type Tavern } from "$lib/queries/mercenaries.server";
import type { Curves } from "$lib/utils/merc-stats";

export const prerender = true;

export interface MercStatsData {
  curves: Curves;
  taverns: Tavern[];
}

export const load: PageServerLoad = (): MercStatsData => ({
  curves: getMercenaryCurves(),
  taverns: getTaverns(),
});
```

- [ ] **Step 2: Commit**

```bash
git add website/src/routes/tools/mercenary-stats/+page.server.ts
git commit -m "feat(website): load merc curves + taverns for stats tool"
```

---

### Task 5: The page UI (`+page.svelte`)

**Files:**
- Create: `website/src/routes/tools/mercenary-stats/+page.svelte`
- Reference: `.merc-mock/index.html` (verbatim source for markup structure, CSS, and SVG drawing)

This task ports the prototype `index.html` into a Svelte 5 component. The prototype's behaviour is
vanilla DOM rendering; convert it to reactive Svelte. Build it in slices and verify in the browser
between slices.

- [ ] **Step 1: Scaffold the component shell**

Create `+page.svelte` with:

```svelte
<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import SupportButton from "$lib/components/SupportButton.svelte";
  import {
    computeAll, CLASSES, RACE_ORDER, ZONE_RACES,
    raceHomeZone, pRaceInZone, hirePrice, charismaDiscount,
    pAtLeast, pHealthAtLeast, pManaAtLeast,
  } from "$lib/utils/merc-stats";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const STAT_HUE: Record<string, string> = {
    hp: "var(--stat-hp)", mana: "var(--stat-mana)", atk: "var(--stat-atk)", spell: "var(--stat-spell)",
  };
  const fmt = (n: number) => n.toLocaleString("en-US");

  // query state
  let level = $state(50);
  let veteran = $state(200);
  let active = $state(new Set(Object.keys(CLASSES)));

  const results = $derived(computeAll(level, veteran, data.curves));
  const shown = $derived(results.filter((c) => active.has(c.cls)));
</script>

<Seo
  title="Mercenary Stat Ranges - Ancient Kingdoms"
  description="Possible HP, mana, and combat-power rolls for every mercenary race and class, at any level and veteran rank, plus the gold and hires needed to roll a great one."
  path="/tools/mercenary-stats"
/>

<div class="wrap">
  <!-- topbar, h1, lead, details, controls, results, cost explorer go here -->
</div>

<style>
  /* prototype CSS (minus the token :root/.dark blocks, which now live in app.css) */
</style>
```

- [ ] **Step 2: Port the static CSS**

Copy the contents of the prototype `<style>` block into the component `<style>`, **excluding**
the `:root { … }` and `.dark { … }` token blocks (those tokens are in `app.css` now). Keep every
other rule verbatim (`.wrap`, `.topbar`, `.crumbs`/`.support` — but those parts are replaced by
the shared components, see Step 3 — `.controls`, `.field-*`, slider rules, `.chips`, `.class-sec`,
table rules, `.howto`, the cost-explorer rules, the reduced-motion query). Replace bare `var(--stat-*)`
usage as-is (the tokens resolve from app.css). Remove `.topbar`/`.crumbs`/`.support` rules only if
the shared components fully cover them; otherwise keep the layout rules for the header row.

- [ ] **Step 3: Header, lead, and disclosure markup**

Replace the prototype's hand-rolled breadcrumb and Ko-fi link with the shared components, and copy
the lead + `<details>` verbatim:

```svelte
<div class="topbar">
  <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Tools" }, { label: "Mercenary Stats" }]} />
  <SupportButton compact iconRight />
</div>

<h1>Mercenary Stat Ranges</h1>
<p class="lead">
  Compare the stat ranges every mercenary class and race can roll, at any level and
  veteran-point total. Hiring rolls a random race and hidden modifiers, so two mercenaries of
  the same class and level can still differ — the tables show every roll you might get.
</p>

<details class="howto">
  <summary>How to read these ranges</summary>
  <div class="howto-body">
    <!-- copy the three <p>/<ul> bodies verbatim from .merc-mock/index.html -->
  </div>
</details>
```

(If `.topbar` styling from the prototype conflicts with `Breadcrumb`'s own markup, keep a thin
flex `.topbar { display:flex; align-items:center; justify-content:space-between; gap:1rem; }`.)

- [ ] **Step 4: Controls (level, veteran, class chips)**

Reproduce the controls markup, bound to `$state`. Level and veteran each: number input + `−`/`+`
buttons + range input, all two-way bound. The slider fill uses `--pct`. Class chips toggle `active`.

```svelte
<section class="controls" aria-label="Query controls">
  <div class="controls-grid">
    {@render numField("Level", "mercs unlock at level 10", () => level, (v) => (level = v), 1, 50)}
    {@render numField("Veteran points", "Health & Mana · +0.25% each", () => veteran, (v) => (veteran = v), 0, 200)}
    <div class="chips">
      <span class="chips-label">Classes</span>
      <button class="chip" aria-pressed={active.size === Object.keys(CLASSES).length}
        onclick={() => (active = new Set(active.size === Object.keys(CLASSES).length ? [] : Object.keys(CLASSES)))}>All</button>
      {#each Object.keys(CLASSES) as cls (cls)}
        <button class="chip" aria-pressed={active.has(cls)} onclick={() => toggleClass(cls)}>{cls}</button>
      {/each}
    </div>
  </div>
</section>
```

Add helpers in `<script>`:

```ts
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, Math.round(v || 0))); }
function toggleClass(cls: string) {
  const next = new Set(active);
  next.has(cls) ? next.delete(cls) : next.add(cls);
  if (next.size === 0) for (const c of Object.keys(CLASSES)) next.add(c);
  active = next;
}
```

Define a `{#snippet numField(...)}` (or a small inline `MercNumberField.svelte` if cleaner) that
renders the label + hint, the `−`/big number input/`+` stepper, the range input with
`style="--pct:{((value-min)/(max-min))*100}%"`, and the min/max ticks, calling the setter clamped.
Keep the exact classes (`.field-label`, `.stepper`, `.stepbtn`, `.bignum`, `.ticks`) from the
prototype so the styling carries over.

- [ ] **Step 5: Per-class tables**

For each class in `shown`, render the class header (name, resource badge, base health, attribute
strip) and the table. Port the `renderClass`/`rowFor` logic from the prototype as Svelte markup +
a small `barStyle` helper. Column set: `["hp","atk","spell"]` for energy, `["hp","mana","atk","spell"]`
for casters. Domains for bar normalisation are computed per class over eligible rows. `–` cells for
ineligible races. Column headers carry the `title` tooltips (copy the `titles` map verbatim).

```svelte
{#each shown as c (c.cls)}
  {@const cols = c.hasMana ? ["hp","mana","atk","spell"] : ["hp","atk","spell"]}
  {@const dom = columnDomains(c, cols)}
  <section class="class-sec">
    <div class="class-head">
      <div class="class-id">
        <span class="class-name">{c.cls}</span>
        <span class="resource {c.role === 'energy' ? 'rage' : 'mana'}">{c.resource}</span>
      </div>
      <div style="display:flex; gap:1.25rem; align-items:center; flex-wrap:wrap;">
        <span class="basehp">Base Health <b class="tnum">{fmt(c.hpCurve)}</b></span>
        <span class="attrs">
          {#each ["STR","CON","DEX","INT","WIS","CHA"] as a}<span class="attr">{a}<b>{c.attrs[a]}</b></span>{/each}
        </span>
      </div>
    </div>
    <div class="tscroll"><table>
      <thead><tr>
        <th>Race</th>
        {#each cols as k}<th title={TITLES[k]}><span class="colmark" style="background:{STAT_HUE[k]}"></span>{LABELS[k]}</th>{/each}
      </tr></thead>
      <tbody>
        {#each RACE_ORDER as race (race)}
          {@const r = c.rows.find((x) => x.race === race)!}
          <tr class:ineligible={!r.eligible}>
            <td class="race">{race}</td>
            {#if r.eligible}
              {#each cols as k}
                {@const cell = (r as any)[k] as [number, number]}
                <td class="cell">
                  <div class="cell-val"><span class="lo">{fmt(cell[0])}</span><span class="dash">–</span>{fmt(cell[1])}</div>
                  <div class="bar"><span style={barStyle(cell, dom[k], STAT_HUE[k])}></span></div>
                </td>
              {/each}
            {:else}
              {#each cols as _k}<td class="na">–</td>{/each}
            {/if}
          </tr>
        {/each}
      </tbody>
    </table></div>
  </section>
{/each}
```

With `<script>` helpers `LABELS`, `TITLES` (verbatim from prototype), `columnDomains(c, cols)`
(min lo / max hi over eligible rows, the prototype's `dom` logic), and:

```ts
function barStyle([lo, hi]: [number, number], [dlo, dhi]: [number, number], hue: string) {
  const span = dhi - dlo || 1;
  const left = ((lo - dlo) / span) * 100;
  const width = Math.max(2, ((hi - lo) / span) * 100);
  return `left:${left}%; width:${width}%; background:${hue}`;
}
```

- [ ] **Step 6: Verify tables in the browser**

Run: `cd website && pnpm dev`, open `/tools/mercenary-stats`. Confirm 6 class tables render, the
level/veteran controls update them, class chips filter, light/dark both look right, and 50/200
matches the known values (Warrior/Dwarf Health 8,875–9,150). Stop dev server.

- [ ] **Step 7: Cost explorer**

Port the prototype's cost section. State:

```ts
let cCls = $state("Wizard");
let cRace = $state<string>(CLASSES["Wizard"].pool[0]);
let cTavernZone = $state<number | null>(raceHomeZone(CLASSES["Wizard"].pool[0]));
let cCharisma = $state(0);
let frac = $state<Record<string, number>>({ hp: 0, mana: 0, atk: 0 });
```

Derive: the selected class result `cd = $derived(results.find(c => c.cls === cCls)!)`, its `row`,
the `meaningful` keys (`["hp","mana","atk"]` casters / `["hp","atk"]` energy), per-roll target
values + probabilities (from `frac` over each row range, using `pHealthAtLeast`/`pManaAtLeast` for
hp/mana and `pAtLeast(row.atk, value)` for atk), `pRace = pRaceInZone(cCls, cRace, cTavernZone)`,
`pRolls`, `price = hirePrice(level, veteran, charismaDiscount(cCharisma))`, and the three outputs.
Preserve `frac` across class/race/tavern changes (do not reset it). Drive class/race/tavern via
explicit change handlers (not raw bindings) so invalid states are repaired before `row`/`pRace` are
derived:

```ts
function fixTavern() {
  if (cTavernZone == null || pRaceInZone(cCls, cRace, cTavernZone) === 0)
    cTavernZone = raceHomeZone(cRace);
}
function onClassChange(v: string) {
  cCls = v;
  // reset race only if it is no longer valid for the new class (e.g. Rogue/Felarii -> Cleric)
  if (!CLASSES[v].pool.includes(cRace)) cRace = RACE_ORDER.find((r) => CLASSES[v].pool.includes(r))!;
  fixTavern();
}
function onRaceChange(v: string) { cRace = v; fixTavern(); }
```

The race `<select>` must list only `RACE_ORDER.filter((r) => CLASSES[cCls].pool.includes(r))` so it
always reflects the current class. With these handlers `cRace` is always in-pool, so
`cd.rows.find((r) => r.race === cRace)` is always defined.

Tavern `<select>` lists `data.taverns` as `"{zone_name} · {npc_name} — {specialty}"` where
specialty is `ZONE_RACES[zone_num]?.join(" / ") ?? "any race"`, option value `zone_num`.

The combat target row is labelled `Attack Power / Spell Power` and its sub-line shows
`Attack Power ≥ {atkVal} · Spell Power ≥ {spellVal}` where `spellVal = row.spell[0] + (atkVal - row.atk[0])`.
HP/Mana rows show `≥ {value}`. The head shows `top {pct(p)}`.

Impossible combo (`pRace === 0`): show the message
`{zoneName} only recruits {pinned} — you can't roll a {cRace} here.` and `0% / ∞ / ∞`, and hide
the chart. Here `{pinned}` is the **pool-filtered** bias, `(ZONE_RACES[zone] ∩ classPool).join(" or ")`,
not raw `ZONE_RACES` — e.g. Druid at The Molten Summit can only roll Fire Goblin, so the message must
say "Fire Goblin", not "Dark Elf or Fire Goblin". (This branch only fires when that intersection is
non-empty and excludes the selected race, which `pRaceInZone` already encodes.)

Port `drawChart(price, pRace, k, pRolls)` verbatim (it returns an SVG string) and render it with
`{@html chartSvg}` where `chartSvg = $derived(...)`. Keep its CSS classes.

Use the prototype's `pct` and `goldFmt` helpers verbatim.

- [ ] **Step 8: Verify the cost explorer**

`pnpm dev`, open the page, set Wizard / Human / Crescent Coast and three targets near top 20-25%;
confirm the math matches the prototype (e.g. top-25% home ≈ 1.8% per hire, ~56 hires, ~192k gold),
the tavern list shows all six (incl. Molten Sanctuary "any race"), charisma 125 → −25%, and
switching Wizard→Warrior preserves the top-X% and drops to two target rows. Stop dev server.

- [ ] **Step 9: Commit**

```bash
git add website/src/routes/tools/mercenary-stats/+page.svelte
git commit -m "feat(website): add mercenary stats tool page"
```

---

### Task 6: Sitemap entry

**Files:**
- Modify: `website/scripts/build-sitemap-manifest.mjs`

- [ ] **Step 1: Add the route to `bareUrls`**

In `computeHashes()`, extend the `bareUrls` array:

```js
  const bareUrls = [
    `${SITE_URL}/`,
    `${SITE_URL}/map`,
    `${SITE_URL}/tools/combat-simulator`,
    `${SITE_URL}/tools/mercenary-stats`,
  ];
```

- [ ] **Step 2: Regenerate and check**

Run: `cd website && node scripts/build-sitemap-manifest.mjs`
Expected: `static/sitemap-manifest.json` now contains `https://ancient-kingdoms.compendiums.org/tools/mercenary-stats`.

- [ ] **Step 3: Commit**

```bash
git add website/scripts/build-sitemap-manifest.mjs website/static/sitemap-manifest.json
git commit -m "feat(website): add mercenary stats tool to sitemap"
```

---

### Task 7: Full verification and prototype cleanup

**Files:**
- Delete: `.merc-mock/`
- Delete: `build-pipeline/scripts/merc_stats.py` (if present and untracked — confirm it is not referenced elsewhere first)

- [ ] **Step 1: Run the gates**

```bash
cd website && pnpm vitest run src/lib/utils/merc-stats.test.ts && pnpm check && pnpm lint && pnpm build
```
Expected: tests pass, svelte-check clean, lint clean, build succeeds with `/tools/mercenary-stats`
prerendered and no broken-link errors.

- [ ] **Step 2: Manual QA**

`pnpm preview` (or `pnpm dev`), open `/tools/mercenary-stats`: verify desktop + mobile in light and
dark — tables update across levels, cost explorer math, controls non-sticky on small screens,
tables scroll, panel stacks. Capture a screenshot of each (desktop+mobile, light+dark).

- [ ] **Step 3: Remove prototypes**

```bash
rm -rf .merc-mock build-pipeline/scripts/merc_stats.py
```

(`.merc-mock` and `merc_stats.py` are untracked scratch references; nothing in the shipped app
depends on them.)

- [ ] **Step 4: Final commit (if anything staged remains)**

Only if there are tracked changes left to record (the deletions are of untracked files, so they
need no commit). Otherwise this task ends after QA.

---

## Notes for the executor

- The prototype `.merc-mock/index.html` is the literal source for any markup/CSS/SVG detail not
  spelled out above. When in doubt, match it pixel-for-pixel.
- Do not run project-wide formatters or unrelated lint fixes. Touch only the files listed.
- Keep semicolons out of user-facing prose. Straight quotes only. Full stat names ("Attack Power",
  "Spell Power") everywhere they name a stat.
