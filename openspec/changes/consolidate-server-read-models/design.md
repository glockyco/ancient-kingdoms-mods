## Context

`website/src/lib/queries/items.server.ts:9-74` and `classes.server.ts:14-45` already place SQL behind server-only functions. The achievements route is thin (`routes/achievements/+page.server.ts:1-6`) and delegates projection to its server module. The altar overview and detail routes still own SQL, JSON parsing, and conversion (`routes/altars/+page.server.ts:24-83`; `routes/altars/[id]/+page.server.ts:17-237`). Their page-data types already exist in `$lib/types/altars`.

## Goals / Non-Goals

**Goals:** Migrate one complete domain without changing URL, page data, or visible output; keep all SQL server-only.

**Non-Goals:** A generic entity page renderer, migration of every route, or a browser-importable database module.

## Decisions

1. **Use an altar-specific read model.** Expose `listAltarEntries`, `getAltarsPageData`, and `getAltarDetailPageData` from `$lib/queries/altars.server.ts`. Implement SQL, JSON parsing, boolean conversion, reward and boss lookups, and description projection there. The route files keep only prerender, entry adaptation, page parameters, and the 404 HTTP boundary. Reuse the established `.server.ts` query convention rather than inventing an ORM.
2. **Preserve projection exactly.** Keep existing final-wave filtering, duplicate boss elimination, reward tier order, null handling, ordering, and meta description. Detail currently uses many dependent item/monster queries (`routes/altars/[id]/+page.server.ts:55-185`). Batch only where a focused result comparison proves equivalent behavior; query speed is not the reason for this change.
3. **Keep capability registries narrow.** `website/src/lib/entities/registry.ts:104-153` owns links and identity. Server read models own SQL and page projection. Search documents and map markers keep their own capabilities. A cross-runtime master manifest would mix different data-lifecycle boundaries and hide game-specific mapping.
4. **Check reachable website capabilities without a master manifest.** Compare normal entity detail routes against the website entity manifest, and verify declared searchable and sitemap families have their required consumers. Keep map-only families and achievement anchors in their existing route categories. Assert that browser import graphs do not include `.server.ts` or `better-sqlite3`. These checks detect accidental dual ownership without coupling C#, Python, and TypeScript registries.

## Risks / Trade-offs

- [A 404 becomes a null page] → Return an explicit absence from the read model and keep `error(404)` in the adapter.
- [A database exception leaks an open connection] → Close connections in `finally`, and compare observable page data for multiple altar types.

## Migration Plan

Compare current overview and detail page-data output on fixed database fixtures. Switch both altar routes together, check the prerendered overview and two different altar details in browser at 1440×900 and 390×844. Recheck URL and page-data shape; remove obsolete route-local mapping afterward.
