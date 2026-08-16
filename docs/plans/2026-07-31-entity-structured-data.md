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

Add schema.org JSON-LD for entity detail pages so search engines can identify game-world entities, their relationships, and their navigation context. Each detail route should emit a primary entity node with a canonical `@id`, alongside the breadcrumb data already emitted by rendered breadcrumbs.

## Schema mapping

Use the closest first-party schema.org type for each entity. The primary node should include the listed properties when the loaded entity data provides them.

| Entity | Primary `@type` | Key properties to emit |
|---|---|---|
| Item | `Product` | `name`, `description`, `image` (icon), `brand: { "@type": "Brand", "name": "Ancient Kingdoms" }`, `category` (item type) |
| Monster | `CreativeWork` with `genre: "Monster"` | `name`, `description`, `image`, `isPartOf: { "@type": "VideoGame", "name": "Ancient Kingdoms" }` |
| NPC | `Person` | `name`, `description`, `worksFor: { "@type": "Organization", "name": faction }` when a faction is present |
| Quest | `CreativeWork` with `genre: "Quest"` | `name`, `description`, `position` (chain index when known), `isPartOf: { "@type": "VideoGame", "name": "Ancient Kingdoms" }` |
| Zone | `Place` | `name`, `description`, `containedInPlace: { "@type": "Place", "name": "Eratiath" }` |
| Skill | `CreativeWork` with `genre: "Skill"` | `name`, `description` |
| Pet | `CreativeWork` with `genre: "Pet"` | `name`, `description`, `isPartOf: { "@type": "VideoGame", "name": "Ancient Kingdoms" }` |
| Altar | `Place` | `name`, `description`, `containedInPlace` (zone) |
| Recipe | `Recipe` | `name`, `description`, `recipeIngredient`, `recipeYield`, `recipeCategory` |
| Chest | `CreativeWork` with `genre: "Chest"` | `description`, `containedInPlace` (zone) |
| Gather resource | `CreativeWork` with `genre: "Resource"` | `name`, `description` |
| Class | `CreativeWork` with `genre: "Class"` | `name`, `description` |

`Product` is the closest available schema.org type for an item, but it is a stretch because items are loot and game-world objects rather than goods being sold. Keep the mapping honest with a category such as `video-game-item` and do not imply commercial pricing or availability.

## Current structured-data surfaces

`lib/seo/jsonld.ts` exports `serializeJsonLd`, `buildWebSite`, `buildOrganization`, `buildPerson`, and `buildCollectionPage`. `lib/components/JsonLd.svelte` emits JSON-LD script tags using the shared helper. `routes/+layout.svelte` emits `WebSite`, `Organization`, and `Person` nodes site-wide. Sixteen overview routes emit `CollectionPage`. `lib/components/Breadcrumb.svelte:36-51,83-86` emits `BreadcrumbList` for every rendered breadcrumb trail, which covers every detail page.

## Remaining scope

Add the per-entity node builders beside the existing builders in `lib/seo/jsonld.ts`. Do not create a separate `structured-data.ts` module. Wire each detail route's loader to build the appropriate node and pass it to the page's JSON-LD output. Add `potentialAction.SearchAction` to the homepage `WebSite` node once a real search route exists. This search action is gated on `2026-08-09-map-marker-and-search-registry`. The entity builders and detail-route wiring are independent of that search dependency.

All nodes should include `@context: "https://schema.org"` and a stable canonical URL in `@id`. Entity-specific structured data should add relationships such as factions, zones, quest-chain position, and recipe ingredients rather than merely duplicating the page description meta tag.

## Tasks

- [ ] Add typed per-entity JSON-LD node builders to `lib/seo/jsonld.ts` for items, monsters, NPCs, quests, zones, skills, pets, altars, recipes, chests, gather resources, and classes using the mapping above.
- [ ] Ensure each builder emits the schema context, a canonical `@id`, the entity name, available descriptions and images, and the applicable structured relationships.
- [ ] Wire every entity detail route loader to build and provide its corresponding JSON-LD node through `JsonLd.svelte`.
- [ ] Add `potentialAction.SearchAction` to the homepage `WebSite` node after `2026-08-09-map-marker-and-search-registry` provides a real search route, including its target and `query-input`.
