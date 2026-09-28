## Context

`ProfessionExporter.TryUpdateIconsFromUI()` reads 13 named UI slots, but returns when `UIProfessions.singleton` is unavailable (`mods/DataExporter/Exporters/ProfessionExporter.cs:177-235`). The current `exported-data/professions.json` and website database contain 13 professions and no profession icons. The overview uses semantic glyphs (`website/src/routes/professions/+page.svelte:97-177,213-234`). The search index already looks up `profession/icon`; without rows it falls back to its glyph (`website/src/lib/entities/entity-manifest.json:198-209`; `website/src/lib/server/search/documents.ts:272-299`).

The current database has 24 zone thumbnails for 25 zones and nine `item/treasure_map` source images. The zone detail and treasure-map item detail routes do not read those kinds (`website/src/routes/zones/[id]/+page.server.ts:33-60`; `website/src/routes/items/[id]/+page.server.ts:255-305`). Their visible detail sections omit the artwork (`website/src/routes/zones/[id]/+page.svelte:400-550`; `website/src/routes/items/[id]/+page.svelte:904-945`). The shared image rule and encoding decisions are in `specify-entity-artwork/design.md`.

## Goals / Non-Goals

**Goals:** Prove any profession source with real runtime evidence. Display existing zone and treasure-map art in the page where it explains the entity. Preserve readable layouts and measurable output.

**Non-Goals:** Do not add an item-detail icon outside the tooltip. Do not add a generic icon to the export for missing item art. Do not alter search artwork, recipe-result links, class cards, chest tables, or gathering lists; those have existing art treatment or deliberate glyph use.

## Decisions

### Verify professions in the game before changing the site

Inspect `UIProfessions.singleton` and each of the 13 `UIProfessionSlot.Image.sprite` values after the game reaches the world. Run `DataExporter` twice from the same game build and UI state. Compare `(domain, id, kind)`, source name, dimensions, and source-content hash. Do not rely on a compile or an empty manifest as proof of missing sprites. If the UI is not initialized, determine whether opening the game's profession panel makes the slots available without changing their icons. Change exporter initialization only when this proves an authoritative source. Record the missing component or state for every remaining gap; do not infer a sprite from a display name. This follows `mods/DataExporter/Exporters/ProfessionExporter.cs:184-235` and the existing reproducibility requirement in `openspec/specs/game-data-export/spec.md:7-21`.

Use the existing `profession/icon` family and `visual_assets` pipeline. A page queries `public_path`, `width`, and `height` for its profession; do not render `professions.icon_path` as a URL. Once a verified set has entered a build, adopt it in overview cards and the corresponding existing guide header patterns. A missing icon keeps the current glyph and layout. Do not create a second icon registry for the 13 guide routes. Coordinate this adoption with `complete-profession-page-system`, which owns profession guide content but not artwork.

### Add only contextual, recorded image surfaces

Join `zone/thumbnail` by zone identifier in the zone detail loader and show the crop by the zone introduction. Fetch `item/treasure_map` in the item detail loader and show it in the existing treasure-location card. Both use `public_path`, `width`, and `height` from `visual_assets`; omit an image with no row. Never derive its existence from a predictable URL. The thumbnail already excludes redacted zones in `build-pipeline/src/compendium/zone_artwork.py:129-193`. A 24-of-25 zone list could also show thumbnails, but the identified need is the detail page; avoid turning a compact numeric table into an image list without a separate UX decision.

### Handle missing item icons by source class, not a blanket fallback

For 21 surviving armor-bonus-set augments and four `random_*` items, `icon_path` is empty and the runtime exporter records no direct sprite. The game class declarations provide no separate icon field (`server-scripts/ScriptableItem.cs:37-39`; `server-scripts/AugmentItem.cs:5-20`; `server-scripts/RandomItem.cs:3-7`). No authored icon is evidenced, so retain missing artwork and rely on the site's glyph/omission. The `helm_of_the_twilight` item differs: `icon_path` is `Basic/BanditArmor2`, but no `item/icon` was exported. `ItemExporter` calls `GetIcon(icon_path)` only if the named collection is registered and excludes its default sprite (`mods/DataExporter/Exporters/ItemExporter.cs:159-183`). Inspect the live collection registration, lookup result, and direct image. If a non-default sprite exists, correct the export and verify output. Otherwise document the precise runtime absence, not a claim that the game has no sprite.

### Use the existing verification gate

Run two pipeline builds with the same exported and curated input. Compare manifest rows, paths, published dimensions, source hashes, and image-content hashes. Assert no surviving row lacks an owning entity or published file. Measure total image bytes before and after and review affected pages at 1440×900 and 390×844 in a real browser. If a branch adds profession art, compare both runtime exports before the builds. Existing `build-pipeline/src/compendium/visual_assets.py:267-339` and `openspec/specs/compendium-build/spec.md:7-65` define the underlying invariant checks.

## Risks / Trade-offs

- [Risk] Profession slots may initialize only while a panel is visible. → Observe both world entry and panel opening; record which state produces each sprite.
- [Risk] A photo crop competes with other zone content on mobile. → Reserve intrinsic proportions and inspect the page at 390×844 before accepting the layout.
- [Risk] Extra image files affect transfer size. → Measure final bytes; do not expand sparse lists as a side effect.
- [Risk] The named helm icon may resolve only to the collection default. → Do not represent that default as item-specific game art.
