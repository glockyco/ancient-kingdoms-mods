## Why

Every page currently shares the same Open Graph image. Items and monsters have enough identity and artwork for distinct share cards, and the paid Worker asset budget can hold the first two families.

## What Changes

- Generate deterministic 1200 × 630 PNG cards for every item and monster detail page.
- Give each card accurate text and available artwork, with a text card when artwork is legitimately absent.
- Publish content-hashed image paths and a validated server-only identity lookup before prerender.
- Feed image URL and alt text to both Open Graph and Twitter metadata; leave other pages on the default image.
- Measure added files, image bytes, and build time before accepting a release.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `page-metadata`: Use entity-specific share images for item and monster pages, with default images elsewhere.

## Impact

`website/scripts/generate-og-image.mjs`, build scripts, pipeline-owned artwork, a server-only lookup, item and monster loaders, `website/src/lib/components/Seo.svelte`, and prerendered image assets.
