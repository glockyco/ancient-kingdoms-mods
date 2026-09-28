## Why

The website already shares entity identity across links, search, artwork, and sitemap routes. No main specification owns this shipped contract, so a later change can unknowingly split identity across registries.

## What Changes

- Document the website entity manifest and typed registry as shipped.
- Record the registry's route, search, sitemap, image, and identity behavior without changing code.
- Leave map marker registration to the map-registry change.

## Capabilities

### New Capabilities

- `entity-registries`: Current website entity identity and its consumer-facing route and presentation metadata.

### Modified Capabilities

- None.

## Impact

Only OpenSpec artifacts. Evidence comes from `website/src/lib/entities/registry.ts`, `entity-manifest.json`, the sitemap generator, and existing registry tests. No implementation change is authorized.
