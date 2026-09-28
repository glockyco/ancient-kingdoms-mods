## Why

Shared site and collection JSON-LD exists, but detail pages do not identify the entity they describe. A conservative page/entity graph can make their meaning explicit without misrepresenting game objects as real-world commercial goods.

## What Changes

- Add a canonical `WebPage` and primary entity node to each detail family.
- Link each page to the existing `WebSite` and connect its `mainEntity` reference to the entity node.
- Use verified, conservative schema types and omit unsupported claims.
- Verify rendered graphs and representative pages with the Schema.org validator.
- Do not emit `SearchAction` without a public search URL.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `page-metadata`: Add detail-page JSON-LD with truthful entity identity and relationships.

## Impact

`website/src/lib/seo/jsonld.ts`, its serializer/component, detail loaders and routes for items, monsters, NPCs, quests, zones, skills, summons, mercenaries, altars, gathering resources, factions, classes, chests, recipes, and professions.
