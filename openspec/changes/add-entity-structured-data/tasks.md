## 1. Build a truthful graph

- [ ] 1.1 Add typed `WebPage`/entity builders to `website/src/lib/seo/jsonld.ts` with distinct absolute `#webpage` and `#entity` IDs; verify a rendered item graph links its `mainEntity` to the node and `isPartOf` to `#website`.
- [ ] 1.2 Implement the conservative `Thing`/verified `Place` mapping without commercial products, non-culinary recipes, or invalid containment; verify representative item, chest, recipe, and zone graphs against Schema.org semantics.
- [ ] 1.3 Reuse `serializeJsonLd` for every new node and omit missing optional values; verify a `</script>` entity name cannot inject markup and a no-artwork entity emits no `image` property.

## 2. Cover all detail routes

- [ ] 2.1 Wire item, monster, NPC, quest, zone, and skill detail loaders/pages using their already-loaded fields; verify each prerendered family has a correct page/entity pair and no new metadata-only query.
- [ ] 2.2 Wire summons, mercenaries, altars, gathering resources, factions, classes, chests, recipes, and professions; verify one page per family has a canonical pair and absent or invalid entity IDs keep existing 404 behavior.
- [ ] 2.3 Keep the layout's existing WebSite, Organization, Person nodes and overview/breadcrumb JSON-LD unchanged; verify no rendered page gains `SearchAction` or duplicate site identities.

## 3. Validate rendered semantics and presentation

- [ ] 3.1 Build and inspect representative prerendered detail pages from every family; verify absolute IDs, canonical references, names, descriptions, actual artwork links, and omitted optional properties against visible content.
- [ ] 3.2 Submit representative published pages to https://validator.schema.org/ and review the reported properties and types; verify no unsupported rich-result or ranking claims are made.
- [ ] 3.3 Inspect representative detail pages in a browser at 1440 × 900 and 390 × 844; verify visible identity matches the source data used by the graph without layout regressions.
