## Why

Server-only query modules exist for several domains, but altar routes still own SQL, JSON conversion, and page-data projection. Adding another altar surface can repeat those transformations and drift from existing pages.

## What Changes

- Move the altar overview and detail reads into an altar-specific server-only read model.
- Keep route modules as thin adapters for entry generation, parameter handling, and HTTP errors.
- Preserve page-data shape, URLs, asset references, and existing renderings. Do not add a generic page renderer or browser-facing SQL module.

## Capabilities

### New Capabilities

- None; this is a server-only refactor with no changed consumer contract.

### Modified Capabilities

- None.

## Impact

`website/src/routes/altars/+page.server.ts`, `website/src/routes/altars/[id]/+page.server.ts`, an entity-specific module under `website/src/lib/queries/`, and focused tests. The change opts out of spec deltas because no user-facing requirement changes.
