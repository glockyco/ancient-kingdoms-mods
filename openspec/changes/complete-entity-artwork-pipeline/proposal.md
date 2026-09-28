## Why

The current database has 13 professions but no profession artwork rows. It also holds zone thumbnails and treasure-map images that their detail pages do not display. Complete the verified, useful consumers without inventing unavailable game art.

## What Changes

- Probe the profession UI slots in a current game export. If all 13 real icons are readable and repeatable, publish and show them on profession overview and detail surfaces. Otherwise record the runtime reason and retain the existing glyphs.
- Show recorded zone thumbnails on zone detail pages and recorded treasure-map images on their item detail pages. Preserve dimensions and omit images that lack an asset row.
- Check repeatability and the database/file invariants across two identical exports and builds. Measure published output and visually review the adopted surfaces.
- Investigate the one named-but-missing item icon in the live icon collection. Fix a verified export gap; do not create a generic or guessed icon.

The item-detail icon already appears in its tooltip. A second prominent icon was rejected by the owner and is not part of this change. Search-result artwork and class, chest, recipe-result, and applicable gathering artwork already have consumers.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-data-export`: Resolve the conditional profession-icon source and the named item icon if a real asset is available.
- `compendium-build`: Verify publication and show the recorded image on additional high-value detail surfaces.

## Impact

Potential changes in `mods/DataExporter/Exporters/ProfessionExporter.cs` and item-icon discovery, exported profession artwork, `visual_assets`, and the profession, zone, and treasure-map item pages. No new URL formatter, manifest, image format, or entity image source.
