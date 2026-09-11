---
title: "Entity Structured Data"
type: spec
status: draft
created: 2026-07-31
parent: 2026-07-31-ancient-kingdoms-overview
superseded_by:
archived:
---

# Entity Structured Data

## Goal

Describe entity detail pages without asserting unsupported real-world types or relationships.
The replacement owner is `add-entity-structured-data`.

## Current surfaces

`lib/seo/jsonld.ts` owns the shared builders and safe serialization. `JsonLd.svelte` emits their output.
The layout emits site, organization, and author nodes. Overview routes emit collection nodes, and
rendered breadcrumbs emit breadcrumb lists. Detail routes do not emit primary entity nodes.

## Design

Each detail page emits a `WebPage` node with a canonical `url`, a distinct `@id` ending in `#webpage`,
and `mainEntity` pointing to an entity node whose `@id` ends in `#entity`. Keep page identity separate
from the fictional entity it describes. Link the page to the existing website node with `isPartOf`.

Use `Thing` for game entities by default. Include their name, canonical page URL, accurate description,
and available artwork. A narrower type needs a verified semantic fit, not merely a matching word.
Do not label game loot as commercial products or non-food crafting as culinary recipes.

A verified fictional location may use `Place`. Use `containedInPlace` only between location nodes,
not on a generic chest or a `CreativeWork`. Do not infer employment from faction membership.
Keep recipe ingredients, quest chains, and other gameplay relationships in visible content unless a
verified schema property describes them accurately. Do not invent properties to encode every database join.

Builders stay beside existing builders in `lib/seo/jsonld.ts`; no parallel structured-data module.
Server loaders assemble nodes from already-loaded data. They do not add queries solely to decorate
metadata. Use the existing safe serializer, including protection against script-closing text.
Image URLs and graph references must be absolute and canonical. Omit optional absent values rather
than fabricating artwork, relationships, prices, availability, or reviews.

## Search action

`SearchAction` is not a prerequisite or acceptance criterion. Google removed the sitelinks search box
in November 2024. A future search action needs both a real public search URL and a named consumer.
Do not create a search route solely for unsupported search-result markup.

## Acceptance

- Every supported detail family emits distinct page and entity identities with a valid `mainEntity` reference.
- Names, descriptions, and images agree with the rendered page and loaded data.
- Specialized types and properties pass semantic review against Schema.org, not just JSON parsing.
- Missing optional values are omitted, and hostile text cannot terminate the JSON-LD script.
- Representative prerendered output passes the Schema.org validator.
- No claim of rankings or rich-result eligibility follows merely from valid markup.

## Tasks

- [ ] Add typed page/entity builders using the conservative type policy and existing serializer.
- [ ] Wire the item, monster, NPC, quest, zone, skill, pet, altar, recipe, chest, resource, and class detail loaders.
- [ ] Verify canonical graph references, absent values, and script-closing text through observable output checks.
- [ ] Validate representative rendered pages and compare metadata with visible content.

## References

- [Schema.org Recipe](https://schema.org/Recipe): culinary semantics and properties.
- [Schema.org containedInPlace](https://schema.org/containedInPlace): a containment relation between places.
- [Google sitelinks search box retirement](https://developers.google.com/search/blog/2024/10/sitelinks-search-box).
