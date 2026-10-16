## Why

Many database columns lack a direct source-word match in website code. Removing data without a dependency audit could break hidden readers or cause every sitemap hash to change. The four progression tables have no website reader yet, but the character model planned in `plan-shared-game-model` reads them, so they stay.

## What Changes

- Audit database tables and candidate columns against queries, denormalizers, redaction, search, sitemap, and consumers.
- Remove only proven-unread database storage. Keep the progression tables, which the planned character model reads.
- Preserve all page data, sitemap URLs, and useful lastmod semantics. Account for one-time IndexNow impact before deployment.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `compendium-build`: Store only data required by a current consumer while retaining export validation and published page behavior.

## Impact

`build-pipeline/schema.sql`, any proven-unused model columns and inserts, redaction references, website SQL, sitemap hashing, database tests, and deployment checks. Column word-search results are candidates, not deletion authority.
