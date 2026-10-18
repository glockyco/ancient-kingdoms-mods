## Disposition

Superseded and not independently executable. [The parent D7 milestone](../plan-shared-game-model/design.md#order-of-work) owns the successor boundary. Its concrete change has not yet taken over the work below. Keep this record until that transfer is complete, then remove the standalone change. Do not mark it implemented or create the former server-only altar module.

## Current ownership

[Acquisition](../archive/2026-10-18-unify-acquisition-usage-requirements/design.md) supplies canonical activation, setup, final-wave reward and provider facts to the scoped consumers. The altar overview still maps domain rows and waves locally, and the detail loader combines domain reads with canonical acquisition methods. Consolidating the rest of those projections is D7 work.

## Remaining work to transfer

1. Capture overview and detail page data for forgotten and avatar altars from the same fixed database. Preserve ordering, nulls, final-wave filtering, duplicate boss handling, reward-tier order and descriptions.
2. Move remaining domain SQL, row decoding and page projection behind D7's environment-neutral injected executor. Consume existing acquisition methods for migrated facts rather than re-deriving them. Keep prerender entries, parameter handling and HTTP 404 behavior in thin route adapters.
3. Preserve connection ownership in the host adapters, including failure cleanup. Keep browser import graphs free of server initialization, `.server.ts` dependencies and `better-sqlite3`.
4. Check normal detail-route reachability against the website entity manifest and declared search/sitemap capabilities. Preserve existing map-only families and achievement-anchor categories. Keep link, search and marker registries at their own capability boundaries rather than creating a cross-runtime master manifest.
5. Compare complete page data, generated URLs and rendered overview/detail surfaces at desktop and phone widths after the transfer. No new generic renderer, route family or visible redesign is implied.

## Transfer and acceptance boundary

The D7 successor must name and retain each remaining domain and architecture-boundary criterion before this change is removed. Acquisition's source/setup/reward cutover does not satisfy the remaining domain refactor, the route-registry checks or that successor's browser acceptance.
