---
title: "Mercenary Stat Ranges Tool — Design"
type: spec
status: implemented
created: 2026-06-23
parent:
superseded_by:
archived: 2026-06-25
---

# Mercenary Stat Ranges Tool — Design

## Goal

Add a `/tools/mercenary-stats` page to the compendium website that lets players check the full
stat ranges every mercenary class and race can roll, at **any** level (1–50) and veteran-point
total (0–200), plus a "Hiring odds & cost" explorer that estimates the gold and number of hires
needed to roll a mercenary of a chosen quality. The only existing reference was a throwaway
prototype that printed level 50 / veteran 200 only, which is useless to lower-level players.

A fully working, visually-finished prototype lives in `.merc-mock/` (`index.html` +
`merc-stats.mjs`). It is the design reference for this build. The implementation reproduces its
look and behaviour exactly, ported to the project's SvelteKit + Tailwind + token stack, with all
derivable data read from the compendium DB at build time.

The prototypes (`.merc-mock/` and `build-pipeline/scripts/merc_stats.py`) are scratch references
only. They are not committed and play no part in the build, the test suite, or the shipped page.

## Scope / non-goals

- **In scope:** the route, a pure TS stat/cost module ported from the prototype, build-time DB
  loading of mercenary base curves and tavern locations, the full UI (reference tables + cost
  explorer) preserving the prototype styling, and a sitemap entry.
- **Not linked in-app.** No nav, home, or cross-page links are added. The page is reachable by
  direct URL only (per the original request). It **is** added to the sitemap so search engines can
  find it.
- **No runtime DB / Worker.** Like `/tools/combat-simulator`, the page is `prerender = true`. All
  DB reads happen at build. The page ships as a static asset and computes everything client-side
  from the baked-in data plus user inputs.
- Theme follows the site's existing global light/dark toggle. No per-page theme control.

## Architecture overview

```
+page.server.ts (prerender=true)        ->  loads base curves + taverns from DB, returns as props
$lib/queries/mercenaries.server.ts      ->  the two DB queries (curves, taverns)
$lib/utils/merc-stats.ts                ->  pure game-logic module (constants + math + cost)
$lib/utils/merc-stats.test.ts           ->  small focused unit test of the core math
+page.svelte                            ->  reactive UI (Svelte 5 runes) using loaded props + module
```

Data flows one way: DB to server load (at build) to page props to reactive client compute. The
math module is pure and takes the loaded curves as input, so it is easy to test and shared by the
tables and the cost explorer.

## Data sources

### From the compendium DB (build time, via `db.server.ts`)

1. **Mercenary base curves** — the per-class HP/mana `LinearInt` curves.

   ```sql
   SELECT type_monster, health_base, health_per_level, mana_base, mana_per_level
   FROM pets
   WHERE is_mercenary = 1
   ```

   Returns the 6 mercenary classes (Warrior, Rogue, Cleric, Wizard, Druid, Ranger). Shape per row:
   `{ type_monster, health_base, health_per_level, mana_base, mana_per_level }`.

2. **Taverns (mercenary recruiters)** — the same join the pets page already uses in
   `getMercenaryRecruiters()`, but also returning the **numeric** zone id (needed for the
   race-bias lookup, since the existing query only returns the text `zone_id`):

   ```sql
   SELECT DISTINCT n.name AS npc_name, z.name AS zone_name, z.zone_id AS zone_num
   FROM npcs n
   JOIN npc_spawns s ON s.npc_id = n.id
   JOIN zones z ON z.id = s.zone_id
   WHERE json_extract(n.roles, '$.is_recruiter_mercenaries') = 1
   ORDER BY z.zone_id
   ```

   Verified current result (6 recruiters): Twilight Forest · Selara Highmoon (1), Everfrost ·
   Khorin Ironmantle (3), Crescent Coast · Garrick Ironclaw (4), The Molten Summit · Blazek
   Grimspark (5), Northern Wastes · Auren Whiskerweave (22), Molten Sanctuary · Ruknar Flamefang
   (24). Zone 24 has no race bias, so it is the neutral tavern.

### Code constants (transcribed from decompiled server scripts, NOT in the DB)

These are game-logic values the DB does not contain. They live in the module as constants, with
source citations.

- **Per-race roll bands + base-combat factor** (`RACES`): hp/mana/energy multiplier ranges and
  `bc`. Source `Player.cs:8401-8430`.
- **Class definitions** (`CLASSES`): `type_monster`, role (`mana`/`energy`), race `pool`
  (`Utils.cs:579-585`), attribute divisors `div` (`Player.cs:6975-7152`).
- **Stat constants:** `VET_MULT_PER_POINT = 0.0025` (`Player.cs:8474`), `CON_HEALTH = 25`,
  `INT_MANA = 20`, `STR_PHYS = 1.0`, `INT_MAGIC = 1.5`.
- **Tavern race bias by zone** (`ZONE_RACES`): `{1:[Elf], 3:[Dwarf], 4:[Human],
  5:[Dark Elf, Fire Goblin], 22:[Felarii]}` (zone 24 or anything else means neutral). Source
  `Utils.GetRandomChar` (`Utils.cs:588-609`). Joined with the DB tavern list by numeric zone id.
- **Hire price:** `round(20 + 400·((clamp(level,10,50)−10)/40)² + veteranPoints·15)` then
  `− ceil(price · min(0.25, charisma·0.002))`. Source `UIMercenaries.CalculatePriceMercenaryLevel`
  + `UINpcTrading.CalculatePurchaseItemPrice` + `Charisma.GetDiscountPurchaseBonus`.

## Math / logic module — `$lib/utils/merc-stats.ts`

Direct port of the prototype `.merc-mock/merc-stats.mjs` to TypeScript with types. Engine-faithful:
`f32` via `Math.fround` and banker's rounding (`iround`), because JS `Math.round` disagrees with
the C# engine on `.5` boundaries. During prototyping this math was checked against the original
script across many level/veteran combinations with no mismatches. The one change from the
prototype is that `computeAll` takes the DB-loaded curves as a parameter instead of hardcoding
them.

```ts
type Curve = { hp_base: number; hp_per: number; mana_base: number; mana_per: number };
type Curves = Record<string, Curve>; // keyed by type_monster

// pure stat matrix for one query
function computeAll(level: number, veteran: number, curves: Curves): ClassResult[];
// ClassResult = { cls, role, hasMana, attrs, hpCurve, manaCurve, resource, rows }
// rows[] = { race, eligible, hp:[lo,hi], mana:[lo,hi]|null, atk:[lo,hi], spell:[lo,hi] }

// cost helpers (pure)
function hirePrice(level: number, veteran: number, charismaDiscount?: number): number;
function charismaDiscount(charisma: number): number;        // min(0.25, charisma*0.002)
function pRaceInZone(cls: string, race: string, zoneId: number | null): number;
function raceHomeZone(race: string): number | null;
function pAtLeast(range: [number, number], target: number): number;          // discrete (base-combat)
function pHealthAtLeast(cd: ClassResult, race, veteran, target): number;     // continuous, exact inversion
function pManaAtLeast(cd: ClassResult, race, veteran, target): number;       // continuous, exact inversion
```

Constants exported: `RACES`, `RACE_ORDER`, `CLASSES`, `ZONE_RACES`, `ZONE_NAMES`,
`VET_MULT_PER_POINT`. The tavern **list** is loaded from the DB, then combined with `ZONE_RACES`
at the call site.

### Probability model (already implemented and reasoned in the prototype)

- Each hire rolls independently and uniformly: race, Health multiplier, resource multiplier,
  base-combat value. The resource multiplier is inert for Warrior/Rogue (Rage ignores it), so
  energy classes have **2** meaningful rolls (Health, base-combat) and casters **3** (Health,
  Mana, base-combat).
- Attack Power and Spell Power share the **same** base-combat roll (`num3` drives both
  `baseDamage` and `baseMagicDamage`).
- HP/Mana are continuous (affine in a continuous multiplier), so `pHealthAtLeast`/`pManaAtLeast`
  invert the rounded formula against the multiplier band (exact, including the top of the range).
  Base-combat is a discrete uniform, so `pAtLeast` counts over its integer range.
- `expected hires = 1 / (P(race) · ∏ P(meaningful rolls))`, `expected gold = price · hires`.

## Page UI & information architecture

Reproduce the prototype exactly. Top-to-bottom (orient, act, go deeper):

1. **Breadcrumb + Seo + Ko-fi `SupportButton`.** `Breadcrumb` items `Home` (link), `Tools` (no
   href), `Mercenary Stats`. `Seo` title/description/path. `SupportButton` top-right.
2. **H1 + lead.** Lead text (approved): "Compare the stat ranges every mercenary class and race can
   roll, at any level and veteran-point total. Hiring rolls a random race and hidden modifiers, so
   two mercenaries of the same class and level can still differ — the tables show every roll you
   might get."
3. **"How to read these ranges"** — a collapsed `<details>` callout (approved copy: roll mechanic,
   Health/Mana vs Attack Power/Spell Power, the `–`/Rage notes).
4. **Controls (sticky at ≥768px wide AND ≥720px tall, static otherwise).** Level 1–50 and Veteran
   points 0–200, each a big number input + `−`/`+` stepper + range slider. Multi-select class
   filter chips (`All` default).
5. **Per-class tables.** Flat sections (no cards). Header: class name + resource badge (Rage/Mana)
   + base health + STR/CON/DEX/INT/WIS/CHA strip. Borderless table, all six races as rows (`–` for
   ineligible, excluded from bar normalisation). Columns: Race, Health, [Mana for casters], Attack
   Power, Spell Power. Each numeric cell shows `lo – hi` plus a per-column "range bar" normalised
   across eligible races, colour-coded by stat. Column headers carry `title` tooltips.
6. **"Hiring odds & cost" explorer.** Two-column (inputs left, outputs right, stacks under 880px):
   - Inputs: Class, Race, Tavern (lists all six recruiters as `zone · npc — specialty`), Your
     Charisma (number) to a derived Hire discount (read-only `−X%`), and a target slider per
     meaningful roll. Each target row: name + `top X%` in the head, slider, then an explicitly
     labelled threshold below (`≥ value`, or `Attack Power ≥ X · Spell Power ≥ Y` for the shared
     combat roll). Target positions are stored as fractions (top-X%) and **preserved** across
     class/race/tavern changes.
   - Outputs: three big stats (Chance/hire, Avg hires, Avg gold), the `per hire = race A% × rolls
     B% · C gp each` equation, and the cost curve (inline SVG, log-y gold vs demanded quality,
     with a marker for the current targets). Impossible tavern+race combos show a plain message and
     `0% / ∞ / ∞` instead of a bogus number. Picking a race auto-selects its home tavern.

## Styling

Preserve the prototype's look on the project's stack:

- **Tokens already match** (`app.css` OKLCH shadcn tokens). Add the four stat-hue tokens used by
  the bars and badges to `app.css` (light + dark): `--stat-hp`, `--stat-mana`, `--stat-atk`,
  `--stat-spell`, exposed via `@theme inline` so they are usable as Tailwind colors.
- The bespoke pieces (range-bar cells, target sliders, cost chart SVG, the `<details>` callout, the
  control panel) are reproduced as Svelte markup + scoped `<style>` carrying over the prototype
  CSS. Native `range` inputs are styled to match (the design depends on the exact look, so keep
  them rather than swapping in `bits-ui` sliders).
- Reuse existing components where they fit cleanly without changing the look: `Breadcrumb`, `Seo`,
  `SupportButton`. Do **not** force shadcn `Card` (the design deliberately avoids card-soup).
- Svelte 5 runes throughout (`$state`, `$derived`, `$props`). Loaded curves/taverns come from
  `data` (`PageData`). Level/veteran/filter/cost-state are `$state`. Tables and cost outputs are
  `$derived`.

## Testing

Keep it proportionate. Test the one place subtle bugs hide and skip the rest.

- **`merc-stats.test.ts` (vitest, the only new test):** a small number of representative assertions
  against `computeAll` using inline expected values that were hand-verified during prototyping, for
  example Warrior/Dwarf at level 50 veteran 200 (Health `8875–9150`, Attack Power `16–50`, Spell
  Power `15–49`), Warrior/Felarii (Attack Power `16–63`), Wizard/Human (Health `3875–4000`, Mana
  `1595–1632`, Spell Power `38–82`), and one low-level case (Warrior/Dwarf level 20 veteran 0
  Health `2450–2560`). Plus a couple of one-line sanity checks for the pure cost helpers:
  `hirePrice(50, 0) === 420`, `charismaDiscount(125) === 0.25`, `pRaceInZone("Wizard","Human",4) === 1`
  and `=== 1/5` for the neutral zone.
- **No** fixture JSON, no Python in the test path, no snapshot of the full matrix.
- **No** tests for the server query (thin SQL passthrough), the Svelte rendering, or the SVG
  drawing. Those are covered by the build and a manual pass.

## Verification

- `merc-stats.test.ts` passes.
- `pnpm --filter website build` succeeds (route prerenders, sitemap regenerates with the new URL,
  no broken-link prerender errors).
- `pnpm --filter website check` (svelte-check) and `lint` clean for the new/changed files.
- Manual: load `/tools/mercenary-stats`, confirm tables update across several level/veteran values
  (50/200 matches the known reference, plus a low-level case), the cost explorer matches hand calc
  for a known config, light/dark both render, and mobile works (controls non-sticky, tables scroll,
  panel stacks). Screenshot desktop + mobile in both themes.
- Deploy via the existing `cf-deploy` pipeline (out of scope to change).

## File structure

- Create `website/src/routes/tools/mercenary-stats/+page.server.ts` — `prerender = true`, load
  curves + taverns, return typed `PageData`.
- Create `website/src/routes/tools/mercenary-stats/+page.svelte` — the UI.
- Create `website/src/lib/utils/merc-stats.ts` — ported module.
- Create `website/src/lib/utils/merc-stats.test.ts` — the focused unit test.
- Create `website/src/lib/queries/mercenaries.server.ts` — curves + taverns queries (new file keeps
  the tool self-contained, leaving the existing `pets.server.ts` recruiter query untouched).
- Modify `website/src/app.css` — add the four stat-hue tokens.
- Modify `website/scripts/build-sitemap-manifest.mjs` — add
  `` `${SITE_URL}/tools/mercenary-stats` `` to the `bareUrls` array (alongside
  `/tools/combat-simulator`).
- The prototypes in `.merc-mock/` and `build-pipeline/scripts/merc_stats.py` are not committed and
  are deleted once the port lands.

## Resolved decisions

1. **Sitemap:** add the route to `bareUrls` in `build-sitemap-manifest.mjs`. The page stays
   out of in-app navigation but is search-discoverable.
2. **Query home:** a new `mercenaries.server.ts`, not an extension of `pets.server.ts`.
