---
title: "Entity Image Surfacing"
type: spec
status: in-progress
created: 2026-07-31
parent: 2026-07-31-ancient-kingdoms-overview
superseded_by:
archived:
---

# Entity Image Surfacing

Finish the remaining item-detail artwork surface. NPC details, skill details, class skill tables,
and item overview rows now render the exported artwork through shared components.

## Current state

Counts measured from the Ancient Kingdoms 0.9.31.1 database:

| Domain | Kind | Assets | Entities | Named surface state |
| --- | --- | --- | --- | --- |
| item | `icon` | 1,655 | 1,678 | Overview complete; detail route loads the row but has no prominent icon surface |
| npc | `primary` | 234 | 234 | Detail complete |
| skill | `icon` | 695 | 698 | Detail and class tables complete |
| monster | `primary` | 361 | 361 | Existing reference surfaces remain complete |
| pet | `primary` | 5 | 11 | Detail complete for non-mercenary pets |
| item | `pet` | 12 | — | Summoned-pet card complete |

The pipeline now publishes deterministic WebP paths through
`build-pipeline/src/compendium/visual_assets.py`. It reconciles artwork after redaction and uses one
shared `entityImageUrl()` implementation. The remaining scope is UI-only.

## Design

Read optional existence and intrinsic dimensions through `visual_assets`. Use its `public_path` when
the query already has the row. Use `entityImageUrl()` only when a fixed-size surface already has an
explicit availability sentinel. Do not add a second path formatter.

The item detail loader already returns `visualAsset`. The remaining implementation must render that
record with its dimensions and a missing-art placeholder. It must not add another database query or
construct a separate URL.

## Acceptance

- Item, NPC and skill art renders at the surfaces listed under Tasks, sized from
  `visual_assets` so no layout shift occurs on load.
- Fixed image slots use the existing domain-appropriate placeholder when art is absent. Optional NPC and skill appearance sections remain omitted when no asset exists; do not add empty cards solely for parity.
- No new call site builds an image path from an id.

The shared `entityImageUrl()` helper remains valid for fixed-size surfaces with an availability
sentinel. This rule prohibits local sanitizers and path formatters, not that shared implementation.
`finish-entity-image-surfacing` owns the item-detail implementation and its present/absent-art checks.
The artwork pipeline plan references this owner rather than scheduling the same UI work.

## Tasks

- [ ] Render the item icon prominently on the item detail page from its existing `visualAsset` row.
- [x] Item icon on the items overview rows.
- [x] NPC portrait on the NPC detail page.
- [x] Skill icon on the skill detail page.
- [x] Skill icon in the class skill tables.
