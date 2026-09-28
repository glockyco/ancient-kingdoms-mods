## 1. Verify shipped identity behavior

- [x] 1.1 Verify `website/src/lib/entities/entity-manifest.json:1-40` declares unique website entity IDs, routes, searchability, artwork fields, and sitemap participation; `registry.test.ts:9-31` checks identity uniqueness and selected sitemap entries.
- [x] 1.2 Verify `website/src/lib/entities/registry.ts:64-153` assigns icons, derives ordered searchable families, handles detail and special links, and selects sitemap families.
- [x] 1.3 Verify `website/scripts/build-sitemap-manifest.mjs:11-18` reads the entity manifest and `entity-routes.test.ts:28-45` checks declared route paths. Keep marker behavior outside this change.

## 2. Confirm specification scope

- [x] 2.1 Compare the added `entity-registries` scenarios against the listed implementations. Verify the spec states only observed behavior and does not require implementation work.
