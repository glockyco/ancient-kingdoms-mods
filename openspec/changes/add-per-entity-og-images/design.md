## Context

`Seo.svelte:23-47` uses one `/og-default.png` URL and alt text on every page. `website/scripts/generate-og-image.mjs:18-77` renders a 1200 × 630 PNG with `@resvg/resvg-js`; its `loadSystemFonts: true` is unsuitable for reproducible per-entity bytes. The prerender has 1,719 item pages and 361 monster pages. The database has 1,693 item icons and 361 monster primary images in `visual_assets`; valid artwork absence affects 26 items.

Cloudflare Workers Static Assets permits 100,000 files per Worker version and 25 MiB per file on the paid plan; the free plan permits 20,000 files. The current deploy bundle has 16,250 files: 5,379 tiles, 3,278 images, approximately 7,300 page files, and 215 application files. One PNG per item and monster adds at most 2,080 files, for about 18,330 files before other growth. One PNG per detail page would add roughly 3,700 and reach about 19,950; this is near the free cap but far below the paid cap. The paid plan is the active limit. Each extra map tile zoom level can multiply the tile count for that level by about four. Per-entity map crops, such as the parked mini-map proposal, compete for the same file budget. The file budget must be recalculated before expanding families or tile coverage.

## Goals / Non-Goals

**Goals:** Item and monster social images that remain accurate, cache-safe, reproducible, and bounded by the actual deploy limit. Use the existing renderer and pipeline-owned artwork.

**Non-Goals:** Generate cards for other detail families or overview pages; build a second artwork exporter; prescribe future templates before measuring their file costs.

## Decisions

**Start with items and monsters.** They are the two requested families and the two most numerous supported families with stable names and art associations. Items contribute 1,719 pages and monsters 361. Other routes keep the default card; expanding toward the free cap is not a prerequisite. A valid item without art gets a motif/text card. A missing registered art file is a build error, not a signal to use that variant.

**Render cards from existing inputs.** Extend the existing resvg image generation convention in `website/scripts/generate-og-image.mjs:18-77` or add a sibling generator under the same build step. Query the built database and its `visual_assets` association. Use only pipeline-owned `public_path` assets, with no runtime image discovery. Render item name, a reviewed item-type label and quality; render monster name and verified classification and level or range where available. The `WeaponDagger` enum means a light one-handed category, not every object's literal weapon name. For repeated names with identical labels, add verified discriminating context or a visible stable identity. Use the shared dark-card language and source artwork when present. Match artwork scale to its dimensions and avoid distortion. Treat the text card as a valid absence policy only, not an exception handler.

**Fix text safety and deterministic typography.** Escape `&`, `<`, `>`, quotation marks, and apostrophes before inserting database values into SVG text or attributes. Embed art bytes rather than allowing external `href` access. Bundle a specific licensed font file, set `loadSystemFonts: false`, and verify coverage for accented names and punctuation. Keep one wrapping and overflow policy for long names, using measured rendered text and two or more lines as needed; do not clip or print unreadably small text. Pin renderer input, dimensions, font bytes, templates, artwork, and canvas colors so identical inputs produce identical PNG bytes on two hosts.

**Make asset identity follow rendered bytes.** Write to generator-owned `website/static/og/{item,monster}/` files whose names contain the final PNG's content hash, with an entity slug if needed for inspection. Produce a server-only identity-to-path-and-alt lookup, not a shared import from `site.ts:8-33`. Build cards and lookup together in a temporary owned location. Validate every database ID, PNG signature, dimensions, matching lookup, and file existence before replacing the previous generated set; clean stale owned files only after successful generation. Do not modify the default card or pipeline-owned source art. Integrate generation before SvelteKit prerender through `website/package.json:10-12` and pass lookup output via the item/monster server loaders. Extend `Seo` with optional resolved image path and alt; use those for both OG and Twitter, and keep defaults for other callers. Require absolute URLs and 1200 × 630 tags for all cards. An unknown supported ID is a normal 404, while a missing lookup for an existing supported ID fails the build.

**Budget and benchmark.** Run complete generation, not a sample. Measure the full deploy bundle file count, each PNG's byte size, total added PNG bytes, and full-build elapsed time against the existing build. Block publication above the paid-plan 100,000-file limit or 25 MiB per file. Use 100 MB generated-OG storage and 60 seconds added full-build time as provisional project budgets; confirm feasible thresholds from a measured full run before freezing them. No known platform limit supplies these latter two numbers. A failed build leaves the previous successful deployment in place.

**Alternatives rejected:** A second artwork-path convention duplicates the pipeline. Hashing templates alone misses art or font changes; hashing final PNG bytes covers all changes. System font discovery changes bytes by host. Silently using the default card when a referenced image disappears conceals a broken export. Including every family immediately spends file budget without evidence of share value or art coverage.

## Risks / Trade-offs

- [The generator expands the static bundle and build time] → Measure all generated cards and the complete deploy output before acceptance.
- [A font lacks a game-name glyph] → Check a sampled card set and the full text corpus against the bundled font; fail unsupported glyphs.
- [A partial run leaves orphaned PNGs or lookup entries] → Stage, verify, then atomically replace generator-owned assets and lookup.
- [A game update changes artwork paths] → Treat missing registered art as a build failure and regenerate from the new built database.

## Migration Plan

Integrate generation before route prerender, build complete item/monster cards, inspect representative examples, and verify page metadata points to existing assets. Deploy only if size and time gates pass. Rollback retains the preceding deployment and its default image; failed generation does not publish a partial card set.
