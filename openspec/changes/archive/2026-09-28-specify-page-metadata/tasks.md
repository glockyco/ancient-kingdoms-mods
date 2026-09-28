## 1. Verify published head and graph metadata

- [x] 1.1 Compare `website/src/lib/components/Seo.svelte:12-48`, `website/src/lib/seo/site.ts:8-33`, `website/src/lib/server/meta-description.ts:122-125`, and the prerendered Winter Orange item head; verify title, description, canonical URL, default 1200 × 630 image, and Twitter metadata.
- [x] 1.2 Compare `website/src/lib/seo/jsonld.ts:3-170`, `website/src/routes/+layout.svelte:20-22,74-76`, `website/src/lib/components/Breadcrumb.svelte:32-51,81-87`, and prerendered item and overview JSON-LD; verify shared, collection, and breadcrumb node types and script-safe serialization.

## 2. Verify discovery policy

- [x] 2.1 Read `website/static/robots.txt:1-9` and canonical metadata for an unsuffixed fishing route; verify `/map?` is blocked, bare `/map` is allowed, and the fishing alias points to its selected first spot.
- [x] 2.2 Verify the corrected sitemap manifest contains every self-canonical prerendered URL and home, omits four noncanonical fishing aliases, and preserves hashed `lastmod` across unchanged builds; check `website/scripts/build-sitemap-manifest.mjs`, generated manifest, and its focused tests.
- [x] 2.3 Run the focused `website/scripts/indexnow-ping.test.mjs` checks and verify the deployed-manifest comparison sends changed/deleted hashed URLs but skips bare URLs and a missing live baseline.
