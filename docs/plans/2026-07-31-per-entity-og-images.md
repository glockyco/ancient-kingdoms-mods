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

## Goal

Generate branded Open Graph images for high-traffic entity detail pages so shared
links identify the entity with its name, type information, and artwork instead of
showing the generic site logo. Version one covers items and monsters.

## Current state

`lib/seo/site.ts` defines one `OG_IMAGE_PATH = "/og-default.png"`. `ogImageUrl()`
takes no arguments, and `Seo.svelte:25` has no `ogImagePath` prop. The same default
image is therefore used for every page that emits Open Graph metadata.

The source-art pipeline provides usable artwork for 1,638 items, 686 skills, 361
monsters, and 229 NPCs. The image coverage and loading path are documented in
`2026-07-31-entity-image-surfacing`. Quests, zones, altars, recipes, gather
resources, and classes have no source art and would need motif templates. Skills
and NPCs have source art but remain outside the first version.

## Version-one scope

Generate entity-specific images for items and monsters only. These two domains cover
about 90% of share traffic. All other entity types continue to use `/og-default.png`
through the existing fallback, including entities whose source art is available but
which are not in this version.

The fallback must also apply when an entity image is unavailable or generation fails.
A generic preview is preferable to a broken Open Graph image URL.

## Generation pipeline

Use `@resvg/resvg-js`, following the pattern in
`website/scripts/generate-og-image.mjs`, to render parameterized SVG templates to
1200x630 PNGs. The generator reads entity data from the built database and source
art from the visual-asset output. Each template receives the entity name, a subtitle
such as type or level, and an optional icon or portrait. Compose the result with the
existing background card design from `og-default.png` so entity cards remain part of
the site's visual system.

Write generated files beneath `static/og/{entity-type}/` using content-hashed names
such as `/og/items/{id}.{hash}.png`. The hash covers the rendered inputs, including
the entity data, selected source art, and template version. This makes a changed
entity produce a new URL without leaving social platforms dependent on an old cached
file.

Add `website/scripts/generate-og-images.mjs` to the website `prebuild` chain beside
`generate-og-image.mjs`. The script should emit only the version-one item and monster
images, while the default image remains available for every other route.

## Templates

| Entity | Visual elements |
| --- | --- |
| Item | Large icon on the left, name on the top right, type suffix as the subtitle, and a quality-colored stripe along the bottom |
| Monster | Portrait when available, otherwise a silhouette, plus name and level with classification |
| NPC | Sprite or silhouette, name, and primary role |
| Quest | Scroll motif, name, and tier with level |
| Zone | Map crop or zone preview, name, and type with level range |
| Skill | Skill icon, name, and class with tier |
| Pet | Sprite, name, class, and kind |
| Altar | Generic altar motif, name, and type |
| Recipe | Result-item icon, `Recipe: {result}`, and recipe family |
| Gather resource | Tier-colored ore or plant icon, name, and type with tier |
| Class | Class crest, name, role, and resource |

Only the item and monster templates are required for version one. The remaining
rows define the visual contract for later entity coverage and do not require source
art generation in this version.

## SEO integration

Change `ogImageUrl()` to accept an entity type and identifier, returning the hashed
entity path when a generated image exists and `OG_IMAGE_PATH` otherwise. Keep the
Open Graph image dimensions at 1200 by 630 for both generated and default images.

Add an optional `ogImagePath` prop to `Seo.svelte` and use it for the image metadata
when supplied. Detail-page loaders pass the generated path through to `Seo` for item
and monster routes. Overview pages, unsupported detail routes, and failed or missing
asset lookups omit the prop and retain the default image.

## Cache invalidation and fallback

A content hash belongs in every generated filename, for example
`/og/items/{id}.{hash}.png`, so a change to an entity, its art, or its template
produces a fresh URL. This is necessary because social platforms cache Open Graph
images aggressively, especially Twitter and Facebook. Old hashed files can be
removed during the next build once no deployed page references them.

Generation failures, missing artwork, and absent entity rows must resolve to the
same default image rather than emitting a 404. The generator should report failures
for the build while preserving a valid fallback path for metadata.

## Static-asset budget

The current deployment contains 15,579 files. The 1,638 item images plus 361
monster images add approximately 2,000 files, well below the approximately 5,000
extra-file concern for the deployment plan. The implementation must still measure
build time and generated output size. The version-one output should keep total OG
image storage under 100 MB and increase a full-scale build by less than 60 seconds.

## Acceptance

- Item and monster detail pages emit entity-specific 1200x630 images with the
  expected name, type or level information, and artwork when available.
- Every other route continues to emit `/og-default.png` unless a later template is
  explicitly enabled.
- Missing artwork and generation failures never produce a broken image URL.
- Hashed filenames change when the rendered entity inputs or template change.
- The prebuild pipeline generates the version-one images from the built data and
  stays within the build-time, output-size, and static-file budgets.

## Tasks

- [ ] Add the item and monster SVG templates and wire `generate-og-images.mjs` into the website `prebuild` chain.
- [ ] Update `ogImageUrl()` and add `Seo.svelte` `ogImagePath` plumbing with the default fallback.
- [ ] Wire item and monster detail routes to pass the generated image path through `Seo`.
