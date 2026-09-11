---
title: "Per-Entity Open Graph Images"
type: spec
status: draft
created: 2026-07-31
parent: 2026-07-31-ancient-kingdoms-overview
superseded_by:
archived:
---

# Per-Entity Open Graph Images

## Goal and scope

Generate item and monster share images with accurate names, context, and available artwork.
`add-per-entity-og-images` owns this work. Other entity families and overview routes retain the default
image. Additional templates are not a prerequisite or a predesigned contract.

## Current state

`lib/seo/site.ts` owns `/og-default.png` and its dimensions. `Seo.svelte` uses the same image and generic
alt text for every page. `scripts/generate-og-image.mjs` already uses `@resvg/resvg-js` in `prebuild`.
The 0.9.31.1 database has artwork for 1,655 items and 361 monsters.

## Generation

Use the existing resvg dependency and default card visual language. Render 1200 by 630 PNGs from the
built database and pipeline-owned artwork. Do not create another artwork discovery or path convention.
Item cards show name, item type, and quality; monster cards show name and verified level/classification.

Escape every database-derived value before inserting it into SVG text or attributes. Use a deterministic
font asset rather than host font discovery. Define wrapping and overflow behavior for long names and
verify glyph coverage. The same inputs must produce the same image bytes across build hosts.

Write generated files under `static/og/{entity-type}/` with filenames derived from a hash of the final
PNG bytes. This includes changes from artwork, fonts, renderer, and templates without a separate manual
cache-version list. Publish a server-only lookup mapping entity identity to image path and descriptive
alt text. Complete generation and lookup validation before route prerendering.

The generator owns only its generated directory and lookup. Remove stale owned files without touching
the default image or pipeline-owned source art. Do not retain partial successful output from a failed
run as a valid release.

## Failure and absence policy

- An unsupported entity family uses the default image.
- A valid item or monster without source artwork gets a text/motif card, not a broken artwork reference.
- An absent entity follows the route's normal not-found behavior; it is not a metadata fallback case.
- An expected artwork file that is missing or unreadable is a build error.
- A rendering failure or missing generated lookup entry for a supported entity fails the build.
- The published site retains its previous successful deployment when a new build fails.

Fallback is a policy for valid absence, not a way to conceal generator defects.

## SEO integration

Resolve entity-image lookup entries in server loaders. Pass resolved image path and alt text through
page data into `Seo.svelte`. Keep `lib/seo/site.ts` limited to shared identity and pure URL formatting;
it must not import a server-only lookup, database, or filesystem module.

`Seo` uses the provided path and alt text for both Open Graph and Twitter metadata. Callers without an
entity image retain the existing default path and default alt text. Both image variants use the same
1200 by 630 dimensions and absolute public URLs.

## Asset and build budget

Measure the deployed file count, output bytes, and full build time before implementation. Run generation
against the complete database, not a sample. The provisional limits are 100 MB of generated OG storage
and 60 seconds of added full-build time; confirm them against the active deployment platform.

## Acceptance

- Every published item and monster has a valid generated image and a matching server lookup entry.
- Unsupported routes retain the default image and alt text.
- Valid absent artwork renders a readable card; required-input and generation failures stop the build.
- Names containing markup characters cannot inject SVG, and long names remain readable.
- Fonts and output hashes are deterministic; changed PNG bytes produce a changed public URL.
- Prerendered metadata points to existing images and describes each image accurately.
- A complete build stays within the confirmed platform, byte, and time limits.

## Tasks

- [ ] Implement the two templates, deterministic font loading, escaping, and name overflow rules.
- [ ] Add complete generation, content-hashed paths, owned-output cleanup, and the server-only lookup before prerendering.
- [ ] Wire loader-resolved image metadata into `Seo` without importing server data into shared modules.
- [ ] Exercise valid missing artwork, required missing files, hostile text, long names, and renderer failure.
- [ ] Inspect generated cards and prerendered metadata, then measure the complete output and build cost.
