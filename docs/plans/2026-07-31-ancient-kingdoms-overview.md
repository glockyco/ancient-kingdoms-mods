---
title: "Ancient Kingdoms Mods — Project Overview"
type: overview
status: active
created: 2026-07-31
parent:
superseded_by:
archived:
---

# Ancient Kingdoms Mods — Project Overview

This repo extracts Ancient Kingdoms game data and publishes it as a public compendium:
`Game (IL2CPP Unity) → Mods (JSON export) → Build Pipeline (SQLite) → Website`.

**This document is forward-looking only.** It holds the website backlog and the map of
legacy child records. Active OpenSpec changes own project implementation priorities and task status.
When an item ships, it leaves this queue.

## Strategy sequence

1. Complete the active combat-verification and planner changes under `openspec/changes/`.
2. Finish the global search interface and remaining discovery links.
3. Complete the remaining entity-art and SEO surfaces.

## Priority queue

P1 is the best value per unit of effort. Evidence for every number below lives in the
owning spec, not here.

| Rank | Item | Doc | Scope |
| --- | --- | --- | --- |
| P1.1 | Global entity search interface | `2026-08-09-map-marker-and-search-registry` | `search.db`, `searchEntities()`, and map search use the unified index; `+layout.svelte` still has no global palette |
| P1.2 | Compact map links on list pages | — (small item) | 2 of 11 target surfaces are complete; current position data covers 361 monsters, 234 NPCs, 7 altars, and 49 resources |
| P2.1 | Finish entity image surfacing | `2026-07-31-entity-image-surfacing` | Four of five named surfaces render art; item detail loads `visualAsset` but has no prominent item-icon surface |
| P2.2 | Pack and random sources in item popups | — (small item) | Both junction tables are populated, but the map popup still does not query both source families |
| P2.3 | Detail-page title suffixes | `2026-07-31-detail-page-title-suffixes` | `itemTitle` remains the only contextual title generator |
| P3.1 | Recipe materials off JSON | — (small item) | Three website readers still parse recipe-material JSON; ordering remains the only schema decision |
| P3.2 | Profession links on gather items and crafted items | — (small item) | Fishing is implemented; the remaining profession relationships are not |
| P3.3 | Entity structured data | `2026-07-31-entity-structured-data` | Shared and overview nodes exist; no detail route emits an entity node |
| P3.4 | Per-entity OG images | `2026-07-31-per-entity-og-images` | Every route still uses `/og-default.png`; source art now covers more entity families |

## Independent implementation owners

The migration creates separate changes for map registry completion, global search, and wayfinding.
Global search owns its palette artwork; the artwork pipeline is not a prerequisite once its assets exist.
Export-session integrity, pipeline loader registration, and server read models also have separate owners.
The migration ledger names these changes. None is created by this planning revision.

The active planner must correct shared-target effect ownership and keep search gaps separate from model
score ordering. The profession migration must repair Slayer's static row coverage before it passes its
validation gate. These are open implementation requirements, not completed fixes.

## Small items — no separate legacy doc needed

- **Compact map links** — add `<MapLink … compact />` to the monsters, npcs, altars,
  gather-items and quests overviews plus the hunter, slayer, herbalism and mining
  profession pages, copying `routes/chests/+page.svelte:212-216`. There is no `foraging`
  profession page: the routes are `adventuring`, `alchemy`, `cooking`, `exploring`,
  `fishing`, `herbalism`, `hunter`, `lore_keeping`, `mining`, `radiant_seeker`,
  `scroll_mastery`, `slayer`, `treasure_hunter`, of which adventuring, alchemy, cooking,
  fishing, scroll_mastery and treasure_hunter already have links. `MapLink` emits
  `?entity=<id>&etype=<type>` and the map fits its view to that entity when no `x`/`y`/`z`
  is given, so no URL work is needed per row.
- **Pack and random popup sources** — `ItemPopupDetails` (`lib/queries/popup.ts`, the
  interface near line 1050) has no pack or random fields and `loadItemPopupDetails` never
  queries `item_sources_pack` / `item_sources_random`. Add both queries and two sections to
  `lib/components/map/ItemPopup.svelte` alongside the ten that exist (lines ~105-518).
  `lib/server/obtainability.ts` already reads both tables for detail pages — copy its
  queries.
- **Recipe materials off JSON** — three readers still parse recipe-material JSON:
  `lib/server/obtainability.ts:442-467` (`getRecipeMaterials`),
  `lib/queries/popup.ts:1359-1401`, and `routes/recipes/+page.server.ts:10-68,91-97`.
  `item_usages_recipe` (`build-pipeline/schema.sql:648-657`) already holds
  item/recipe/type/amount and a join to `items` supplies names. First decide whether
  material display order is contractual: the JSON array is ordered, the junction table has
  no position column and its `id` order is incidental. If order matters, add a `position`
  column to the junction and populate it in `denormalizers/items/usages.py:31-105` before
  swapping the readers; if not, swap the three readers and add `ORDER BY id`. Leaving the
  `materials` JSON columns in place is fine — they are recipe-owned data, unlike the
  removed per-item source columns.
- **Profession links** — link gathering resources and crafted items to their profession
  page, copying the fishing conditional at
  `routes/gather-items/[id]/+page.svelte:536-550`. Flag-to-profession mapping: `is_plant`
  → herbalism, `is_mineral` → mining, `is_fishing_spot` → fishing, `is_radiant_spark` →
  radiant_seeker. For crafted items branch on recipe type (crafting / alchemy / scribing).
  The other three original cases are settled: item → producing recipe and zone ↔
  monsters/NPCs both already work bidirectionally, and ingredient → recipe is reachable in
  two hops via the item page, which is where that relationship belongs. The design
  question is closed by precedent — four typed link components (`ItemLink`,
  `MechanicsLink`, `FactionLink`, `MapLink`) all render contextual inline links in one
  style.

## Parked

- **Mini-maps on detail pages** — the live map costs a 16.1 MiB client-side
  `compendium.db` fetch (`lib/db.ts`, sql.js-fts5), a 1.2 MB WASM runtime and ~1.58 MB of
  deck.gl chunks, and `routes/map/+page.svelte` owns the initialization (`preloadDb()`,
  the deck.gl dynamic imports, view fitting), so there is no reusable component. Detail
  pages currently ship none of it. Revive only as a static tile crop: a build-time crop of
  the existing `/tiles/{z}/{x}/{y}.webp` pyramid centred on the entity, rendered as an
  `<img>` linking to `/map?entity=<id>&etype=<type>`. Every detail page already carries a
  `MapLink` and the map deep-links to the entity with the view fitted, which covers the
  underlying need.

## Reference map — design authorities, read on demand

- `2026-06-13-compendiums-site-design` *(spec)* — the apex-domain directory site.
- `2026-05-27-website-design-system-audit-consolidation` *(plan)* — design-system
  consolidation.
- `2026-05-28-compendium-data-contract-design` *(spec)* — entity-addition architecture and
  the exporter → pipeline → website data contract.

## Pointers

- Repository constraints: `AGENTS.md`. Setup and commands: `README.md`. Navigation: `docs/plans/INDEX.md`.
