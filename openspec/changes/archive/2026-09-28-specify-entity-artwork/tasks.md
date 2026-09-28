## 1. Verify exported sources

- [x] 1.1 Verify direct and named item icon branches, excluded default icons, and extra item art in `mods/DataExporter/Exporters/ItemExporter.cs:123-124,159-196,580-595`; confirm the manifest has separate `item/icon`, `item/pet`, and `item/treasure_map` kinds.
- [x] 1.2 Verify actor, class, skill, mercenary, gather-resource, and chest source branches in `mods/DataExporter/Exporters/{BaseExporter,ClassExporter,SkillExporter,PetExporter,GatherItemExporter}.cs`; confirm those families have current manifest rows.

## 2. Verify published assets

- [x] 2.1 Verify PNG source export, unique database key, safe WebP paths, transparent padding, and lossless/quality-80 encoding in `VisualAssetRegistry.cs:45-109`, `build-pipeline/schema.sql:28-44`, and `build-pipeline/src/compendium/visual_assets.py:25-224`.
- [x] 2.2 Verify achievement and zone image derivation plus post-redaction reconciliation in `build-pipeline/src/compendium/{loaders/core.py,zone_artwork.py,commands/build.py,visual_assets.py}`; confirm the database contains 38 achievement and 24 zone artwork rows.

## 3. Verify consumer contract

- [x] 3.1 Verify `website/src/lib/utils/entityImage.ts:1-38` matches the publisher path and `EntityLink.svelte:69-84` checks availability before deriving a URL; confirm `ItemTooltip.svelte:14-49` renders its recorded path and dimensions only when present.
- [x] 3.2 Verify search image kinds in `website/src/lib/entities/entity-manifest.json:1-210`, row lookups in `website/src/lib/server/search/documents.ts:272-299`, serialization in `website/src/lib/search/engine.ts:96-120`, and palette fallback in `website/src/lib/components/search/SearchPalette.svelte:77-84,154-165`.
- [x] 3.3 Validate `specify-entity-artwork` with `openspec validate specify-entity-artwork --strict` and confirm the three delta files cover the exporter, publisher, and search requirements.
