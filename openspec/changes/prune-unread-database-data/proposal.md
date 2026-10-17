## Why

Many database columns lack a direct source-word match in website code. Removing data without a dependency audit could break hidden readers or cause every sitemap hash to change. Progression data has current website consumers and supports the character model planned in `plan-shared-game-model`, so it stays.

## What Changes

- Audit database tables and candidate columns against queries, denormalizers, redaction, search, sitemap, and consumers.
- Remove only proven-unread database storage. Keep the progression tables, which the planned character model reads.
- Preserve all page data, sitemap URLs and useful lastmod semantics through the shared semantic projector.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `compendium-build`: Store only data required by a current consumer while retaining export validation and published page behavior.

## Impact

`build-pipeline/schema.sql`, any proven-unused model columns and inserts, redaction references, website SQL, sitemap hashing, database tests, and deployment checks. Column word-search results are candidates, not deletion authority.
