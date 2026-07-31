---
title: "Entity Image Surfacing"
type: spec
status: draft
created: 2026-07-31
parent: 2026-07-31-ancient-kingdoms-overview
superseded_by:
archived:
---

# Entity Image Surfacing

Show the item, NPC and skill art the export pipeline already ships. Monsters are the only
domain whose images reach the UI. Everything else is extracted, trimmed, copied into
`website/static/` and indexed in `visual_assets`, then never rendered.

## Current state

| Domain | Kind | Assets | Entities | UI consumers |
| --- | --- | --- | --- | --- |
| item | `icon` | 1,638 | 1,658 | `lib/components/ItemTooltip.svelte:12-14` only |
| npc | `primary` | 229 | 229 | none |
| skill | `icon` | 686 | 689 | none |
| monster | `primary` | 361 | 361 | 3 — the reference pattern |

The pipeline behind them:

- `mods/DataExporter/VisualAssetRegistry.cs` extracts PNGs at runtime and writes
  `visual_assets.manifest`.
- `DataExporter.cs` passes one registry to the Monster, Npc, Item and Skill exporters.
- `load_visual_assets` in `build-pipeline/src/compendium/loaders/core.py` trims transparent
  padding with PIL, copies into `website/static/images/<domain>/`, and inserts
  `visual_assets` rows.

So no exporter, loader or schema work is needed. This is UI work only.

## Design

**Read images through the `visual_assets` table, not by path convention.** The table
carries `public_path`, `width` and `height`, so the markup can reserve space and avoid
layout shift. The path-convention read in `ItemTooltip.svelte` cannot, because it builds
`/images/items/{id}/icon.png` as a string and knows neither the real path nor the
dimensions.

The pattern to copy is the monster detail page: the query at
`routes/monsters/[id]/+page.server.ts:839`, keyed on `domain = ? AND entity_id = ? AND
kind = ?`, plus the missing-image placeholder that page renders. Do not copy
`ItemTooltip.svelte`'s string building into new call sites.

The coverage gaps — 20 items and 3 skills without art — resolve to that placeholder, so no
special-casing is needed anywhere.

## Acceptance

- Item, NPC and skill art renders at the surfaces listed under Tasks, sized from
  `visual_assets` so no layout shift occurs on load.
- Entities without an asset render the monster page's placeholder.
- No new call site builds an image path from an id.

## Tasks

- [ ] Item icon on the item detail page.
- [ ] Item icon on the items overview rows.
- [ ] NPC portrait on the NPC detail page.
- [ ] Skill icon on the skill detail page.
- [ ] Skill icon in the class skill tables.
