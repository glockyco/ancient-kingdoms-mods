---
title: "Entity Artwork: One Pipeline, One Path Rule, One Format"
type: spec
status: in-progress
created: 2026-08-10
parent: 2026-07-31-ancient-kingdoms-overview
supersedes:
superseded_by:
archived:
---

# Entity Artwork: One Pipeline, One Path Rule, One Format

## Goal

Complete the remaining export and consumer work after the artwork pipeline consolidation.
The pipeline owns one manifest, one path rule, one delivery format, and post-redaction reconciliation.

## Current state

Audit baseline: Ancient Kingdoms 0.9.31.1.

Implemented:

- `visual_assets` owns game, derived, and Steam artwork metadata.
- Published paths are `images/{domain_plural}/{entity_id}/{kind}.webp`.
- Entity identifiers are used verbatim and validated before publication.
- Sprites use lossless WebP. Photographic achievement art uses quality 80.
- Reconciliation removes rows and files whose owning entity did not survive redaction.
- `entityImageUrl()` is the single authored URL formatter.
- Achievement art, zone thumbnails, item icons, monster sprites, NPC sprites, skill icons, pet art,
  class icons, chest art, gathering art, and treasure-map art use the shared pipeline.
- `EntityLink` owns the common artwork-plus-name treatment for eligible entity references.
- Item lists, NPC details, skill details, class skill tables, map popups, and several related-entity
  tables consume shared artwork.

Current database coverage:

| Domain | Kind | Rows |
|---|---|---:|
| achievement | `icon` | 38 |
| chest | `primary` | 133 |
| class | `icon` | 6 |
| gathering_resource | `icon` | 19 |
| item | `icon` | 1,655 |
| item | `pet` | 12 |
| item | `treasure_map` | 9 |
| monster | `primary` | 361 |
| npc | `primary` | 234 |
| pet | `icon` | 6 |
| pet | `primary` | 5 |
| skill | `icon` | 695 |
| zone | `thumbnail` | 24 |

The exporter has a profession-icon path, but the current database has no `profession` artwork rows.
Treat profession output as unresolved until a game-backed export proves the source is available.

## Invariants

1. Every manifest row references a readable source file.
2. Every surviving `visual_assets` row references a surviving entity.
3. `(domain, entity_id, kind)` is unique.
4. Every published path equals the shared path function result.
5. Every entity identifier and artwork kind is a safe path segment.
6. A missing row means that art is unavailable. Consumers do not infer existence from a path.
7. Fixed-size consumers may use `entityImageUrl()` only with an explicit availability sentinel.
8. Intrinsic-size consumers read `public_path`, `width`, and `height` from `visual_assets`.

## Durable decisions

### The pipeline chooses the delivery format

The mod exports lossless source images. The pipeline publishes WebP, so an encoding change does not
require a game session. Lossless WebP preserves sprite pixels.

A measured 2026-08-10 sweep reduced the audited 7,723,611-byte source set to 3,744,058 bytes.
PNG optimization increased the item and skill sets, so it is not an alternative to WebP.
Quality 80 reduced unlocked achievement art by 59 percent without a visible change at its rendered size.

`SPRITE_ENCODE_METHOD = 4` remains intentional. A 400-icon sample took 0.64 seconds at method 4 and
16.91 seconds at method 6. Method 6 saved only 7.5 KiB, approximately 1.3 percent of the sample.

### Redaction owns existence

Artwork publication occurs before denormalization. Reconciliation runs afterward and removes artwork
for entities excluded by redaction. The artwork system has no independent exclusion list.

### Mercenaries use emblems, not portraits

A mercenary has no stable portrait. The game composes race, gender, appearance, and equipment at
runtime. `pet/icon` is the static party emblem. `pet/primary` remains limited to fixed non-mercenary
pets.

### Export real art only

`GatherItem.spriteIconIndex` addresses a TextMeshPro glyph and is not an exportable entity image.
Gathering resources use `journalIcon`.

When `ScriptableItem.image` is absent, `IconCollection.GetIcon(icon_path)` may provide real item art.
The exporter must not publish `DefaultItemIcon` as entity art.

Locked achievement art is deliberately absent. The website documents the achievement and renders the
unlocked image. Publishing a second obscured variant adds files without a consumer.

### Coverage controls list adoption

A list uses entity art only when nearly every row has it. Sparse families keep a semantic family glyph.
Compact map chips and mechanics tables also keep glyphs because category recognition is more useful
than miniature artwork there.

## Related implementation owners

`finish-entity-image-surfacing` owns the item-detail artwork surface. `add-global-entity-search` owns
palette artwork. Their implementation tasks and acceptance checks do not belong to this checklist.

## Remaining work

- [ ] Run a current game export that proves whether all 13 profession icons are readable.
- [ ] Repeat the profession export from the same game state and compare source identity, dimensions, and
  content hashes to prove repeatability.
- [ ] If profession icons are readable, publish them through `visual_assets` and consume them on profession surfaces.
- [ ] If profession icons are unreadable, record the runtime reason and retain semantic profession glyphs.
- [ ] Complete class, zone, recipe-result, treasure-map, chest, and gathering-art adoption where the current route still uses only a glyph.
- [ ] Verify every new intrinsic-size surface reserves layout from database dimensions.
- [ ] Run the pipeline twice against identical exported and curated inputs. Compare the artwork
  manifest, paths, dimensions, and content hashes to prove repeatability.
- [ ] Run a full pipeline build and assert the artwork invariants against the published database and files.
- [ ] Measure final output bytes and perform browser checks for each adopted family.

## Boundaries

- Do not add a second path formatter or a second artwork manifest.
- Do not infer artwork existence from a predictable path.
- Do not export a representation without a named consumer.
- Do not add portraits for runtime-composed mercenaries.
- Do not add art for quests, factions, traps, portals, crafting stations, altars, or houses without source evidence.
