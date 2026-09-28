## Context

`website/src/lib/seo/jsonld.ts:3-170` already owns stable site IDs, shared builders, collection nodes, and `serializeJsonLd`. The shared layout emits `WebSite`, `Organization`, and `Person` (`website/src/routes/+layout.svelte:20-22,74-76`). Overview routes emit `CollectionPage` with `ItemList`; `Breadcrumb.svelte:32-51,81-87` emits breadcrumb JSON-LD from visible trails. Detail routes emit no primary entity nodes. Page canonical URLs come from `site.ts:25-29`.

## Goals / Non-Goals

**Goals:** Connect each detail page to one accurate fictional entity in the existing site graph. Validate the rendered result, not just the builder's return value.

**Non-Goals:** Force every relational game mechanic into Schema.org, claim rich-result eligibility, publish a dataset, or introduce a public search route for structured data.

## Decisions

Use a pair of nodes per detail route: `WebPage` at `{canonical URL}#webpage` and entity at `{canonical URL}#entity`. Set page `url` to the same absolute URL as `<link rel="canonical">`, `isPartOf` to the shared `#website`, and `mainEntity` to the entity `@id`. Keep the existing collection-page `#page` convention unchanged; detail and overview routes have distinct paths and node roles. Build nodes beside the existing builders in `jsonld.ts`; loaders compose them from data already selected for visible content. Use `JsonLd.svelte` and its serializer rather than interpolating raw JSON. Reject a nonexistent primary entity via the route's existing 404 policy.

For items, monsters, NPCs, quests, skills, summons, mercenaries, altars, gathering resources, factions, classes, chests, recipes, and professions, default to `Thing`. A verified geographical zone can use `Place`. A location relation such as `containedInPlace` is valid only between two `Place` nodes; do not put it on a chest, resource node, or generic page. `Product` means an offerable product, not every loot item; culinary `Recipe` does not describe a crafting formula for equipment. Do not infer an NPC's occupation from faction membership. Do not encode quest chains, ingredients, player requirements, or item sources as invented schema properties. A future narrower type needs a property-by-property semantic review, not a similarly named game category.

Use the existing page name and generated description when accurate. Use absolute canonical paths for links and actual primary artwork for `image` only if the loader has it. A generic default OG image is site artwork, not evidence of entity artwork. Omit missing optional artwork, descriptions, associations, or gameplay claims instead of supplying placeholders. Reuse server-loaded records and visual-asset associations; add no extra metadata-only database joins. For recipe variants, respect their unique canonical IDs and do not imply that a non-food recipe is the culinary Schema.org `Recipe`.

**SearchAction omission:** The current search palette (`website/src/routes/+layout.svelte:12-13,82`) has no public search-result URL. The existing `buildWebSite` deliberately omits `SearchAction` (`jsonld.ts:44-54`). Google retired the sitelinks search box in November 2024. Do not add a route just for markup; reconsider only when a public search URL and named consumer exist. Source: https://developers.google.com/search/blog/2024/10/sitelinks-search-box.

**Validation:** Parse one prerendered output from each family, check both IDs, references, absolute canonical URLs, and agreement between JSON-LD and visible title/description/image. Verify missing optional artwork and a `</script>` name using output HTML. Submit representative rendered page URLs to https://validator.schema.org/ and review semantics as well as syntax. The Schema.org validator does not promise search features, so do not substitute Google's rich-results eligibility for this check.

**Alternatives rejected:** Assign `Product` to all items; this implies commercial semantics. Assign `Place` to all entities with a zone; this gives chests false location semantics. Emit one page/entity node without distinct IDs; downstream graph links become ambiguous. Duplicate a JSON-LD builder module; that would split ownership from `jsonld.ts`.

## Risks / Trade-offs

- [A type appears valid but implies a real-world product or service] → Keep `Thing` until a semantic review proves a narrower type.
- [Metadata duplicates visible data with a stale source] → Pass already-loaded page fields, then compare prerendered JSON-LD with the page.
- [Schema.org validator accepts syntactic JSON with misleading assertions] → Review claims manually on representative pages across every family.

## Migration Plan

Add the shared page/entity builders and wire every detail family. Check each rendered graph before deployment. The last successful deployment remains available if a build or semantic check fails; rollback removes only the new detail nodes and leaves existing shared, overview, and breadcrumb nodes intact.
