> Superseded. Do not implement this change independently. The later D7 change in [plan-shared-game-model](../plan-shared-game-model/design.md#order-of-work) must take over the remaining altar domain projections and website boundary checks before this standalone change is removed. That transfer is still open. [Acquisition](../archive/2026-10-18-unify-acquisition-usage-requirements/design.md) owns the migrated acquisition/setup/reward facts and scoped consumers, not the whole altar domain or route-registry audit.

## Why

Altar routes still contain domain SQL and page-data mapping. Their remaining consolidation belongs behind D7's injected-executor boundary, not a new server-only interpretation of canonical acquisition facts.

## What Changes

- Transfer the remaining altar overview/detail domain projection, thin route adapters and architecture-boundary checks into the concrete D7 successor.
- Preserve URLs, assets, page-data contracts, final-wave presentation and HTTP errors while consuming acquisition's canonical methods.
- Do not introduce a standalone server-only altar authority or restore removed source readers. The design and tasks record the untransferred work, not permission to execute it here.

## Capabilities

### New Capabilities

- None. This superseded change does not establish a separate consumer contract.

### Modified Capabilities

- None.

## Impact

The remaining work concerns the altar overview/detail routes, their domain projection and website route/import boundaries. Transfer and removal are tracked by `plan-shared-game-model` task 3.3. No implementation or acceptance is claimed here.
