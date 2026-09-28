## Why

The build and exporter already publish entity artwork, but the main specifications omit most of their observable contract. Search result artwork also shipped without a search requirement. Record these existing guarantees before planning further adoption.

## What Changes

- Document the game-backed artwork families and the absence of an invented sprite when no real source exists.
- Document one manifest, published WebP paths, source provenance, redaction reconciliation, and derived zone and achievement artwork.
- Document how the global search palette presents available artwork and falls back to an entity-type glyph.
- Verify each requirement against the current exporter, pipeline, database, and website. This change does not edit their implementation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-data-export`: Record the existing runtime artwork sources and source-image manifest.
- `compendium-build`: Record existing published-artwork invariants not covered by its manifest and encoding requirements.
- `global-search`: Record the existing artwork and fallback in search results.

## Impact

Specification only. Evidence is in `mods/DataExporter/Exporters/`, `build-pipeline/src/compendium/`, `build-pipeline/schema.sql`, `website/src/lib/`, and the current exported data. No runtime interface changes.
