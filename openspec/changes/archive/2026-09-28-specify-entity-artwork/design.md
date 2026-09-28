## Context

The source exporter writes PNG files and `visual_assets.json`. The pipeline records or publishes those files through `visual_assets` (`mods/DataExporter/Exporters/VisualAssetRegistry.cs:45-109,275-285`; `build-pipeline/src/compendium/loaders/core.py:71-161`). The database uses `(domain, entity_id, kind)` as the asset key (`build-pipeline/schema.sql:28-44`). Existing `compendium-build` requirements already cover read-only recording, measured encoding changes, and deterministic bytes (`openspec/specs/compendium-build/spec.md:28-65`).

## Goals / Non-Goals

**Goals:** Preserve the observed contract and the decisions that explain it. Keep the source export separate from the website's delivery format.

**Non-Goals:** No exporter, pipeline, UI, or new image family is implemented here. The profession runtime gap and remaining UI consumers belong to `complete-entity-artwork-pipeline`.

## Decisions

### Source images are not delivery images

The game exporter captures real sprites as source PNG files, and the pipeline publishes WebP (`mods/DataExporter/Exporters/VisualAssetRegistry.cs:81-109`; `build-pipeline/src/compendium/visual_assets.py:130-224`). This allows encoding changes without another game session. Lossless WebP preserves sprite pixels; photographic achievement images and zone crops use quality 80 (`build-pipeline/src/compendium/visual_assets.py:63-89`; `build-pipeline/src/compendium/loaders/core.py:477-528`; `build-pipeline/src/compendium/zone_artwork.py:174-193`). The measured batch reduced 7,723,611 source bytes to 3,744,058 published bytes. PNG optimization increased item and skill output, so it was rejected. A visual check found quality-80 achievement art acceptable at its published size.

The method-4 setting is deliberate (`build-pipeline/src/compendium/visual_assets.py:63-77`). A 400-icon sample took 0.64 seconds at method 4 and 16.91 seconds at method 6. Method 6 saved 7.5 KiB, about 1.3% of the sample. Existing `compendium-build` requirements protect measured encoding settings and stable bytes, so this change adds no duplicate requirement.

### One row has one reproducible public path

The build validates path segments and uses entity identifiers unchanged (`build-pipeline/src/compendium/visual_assets.py:25-61,101-127`). Its website counterpart uses the same directory and suffix rule (`website/src/lib/utils/entityImage.ts:1-38`). A separate sanitizer could make two entity identifiers collide. An optional image remains absent unless a row confirms it (`website/src/lib/components/EntityLink.svelte:69-84`; `website/src/lib/server/search/documents.ts:272-299`). The build stores published image dimensions after transparent padding is trimmed (`build-pipeline/src/compendium/visual_assets.py:130-143,175-181`).

### Entity redaction owns artwork existence

The build publishes runtime and Steam images, derives zone thumbnails, denormalizes, and then reconciles (`build-pipeline/src/compendium/commands/build.py:82-95,157-170`). Reconciliation removes an orphan's row and file and verifies surviving public paths and files (`build-pipeline/src/compendium/visual_assets.py:267-339`). A second artwork exclusion list would drift from the entity redaction rules. The stitched map crop excludes redacted zones before publication (`build-pipeline/src/compendium/zone_artwork.py:129-193`).

### The exporter does not invent sprites

The exporter uses real item sprites, with a non-default collection-icon fallback only when a named icon resolves (`mods/DataExporter/Exporters/ItemExporter.cs:123-124,159-183`). Mercenaries have a static party emblem but runtime-composed appearance; their icon is exported, not a prefab portrait (`mods/DataExporter/Exporters/PetExporter.cs:133-152`). Gathering resource icons come from `journalIcon`, not the TextMeshPro glyph index (`mods/DataExporter/Exporters/GatherItemExporter.cs:229-257`). The build uses unlocked achievement art; it does not publish a second locked variant (`build-pipeline/src/compendium/loaders/core.py:457-488`). No quest, faction, trap, portal, station, altar, or house art is invented without an authoritative source and a named consumer.

### Sparse lists retain semantic glyphs

Sparse lists use semantic glyphs. The measured database has 19 art rows for 49 gathering resources; an all-image gathering list would mix placeholders with artwork. Compact map chips and mechanics tables keep category glyphs when those identify a category more clearly than tiny sprites. A consumer must not infer nonexistent art.

## Risks / Trade-offs

- [Risk] The encoding measurements come from one export batch. → Remeasure a new setting against current output.
- [Risk] A runtime icon can be unavailable during export even when it has a name. → Probe runtime availability before concluding that the game has no sprite. Never substitute a generic icon as game art.
