## Context

`schema.sql:184-220` holds four progression tables that `load_progression` validates and inserts (`loaders/core.py:308-410`). No website code reads them yet. `plan-shared-game-model` makes them inputs of the character rules, which replace the experience page's hardcoded copy of the same rules. The sitemap hashes whole rows through `SELECT *` (`website/scripts/build-sitemap-manifest.mjs:108-117,538-560`). `mergeManifests` bumps `lastmod` for every changed hash (`:71-91`), and IndexNow selects those URLs (`website/scripts/indexnow-ping.mjs:11-28`).

## Goals / Non-Goals

**Goals:** Prove actual storage is unread and avoid false full-site sitemap changes.

**Non-Goals:** Delete original game-export fields, remove the progression tables, or assume a word-search miss proves absence.

## Decisions

1. **Audit before removal.** Enumerate every table and column from `schema.sql` and SQLite `PRAGMA table_info`; inspect explicit and dynamic SQL in website pages, query helpers, scripts, FTS, denormalizers, redaction reference traversal, and statistics. `SELECT *`, SQL JSON operations, dynamic table names, and hash inputs count as reads. The roughly 79 no-word-match columns are candidates, not approved deletions. Record a per-field decision before any schema edit.
2. **Keep the progression tables.** `progression_rules`, `race_progression`, `class_level_progression` and `level_budgets` stay in SQLite with their loader, validation and redaction reference rule. The audit records them as retained for the character model. Deleting them now would only mean restoring them when the rules change lands.
3. **Migrate sitemap hashes by content, not storage layout.** Replace whole-row input for affected routes with explicit fields or stable page-facing projections. Bridge the existing hash algorithm to the new one: on an *old-schema* database with the same exported data, compute both legacy hashes and new projection hashes. Compare each old hash to the prior live manifest. Carry its previous `lastmod` only when the old hash matches the live manifest and the projected old/new page content matches; otherwise bump it. Fail the migration if the old reference database or live manifest is unavailable rather than silently preserving dates. After migration, normal hashes use the projected page content. Verify `indexnow-ping.mjs:11-28` selects only genuinely changed or removed URLs. A direct switch from `SELECT *` would mark every detail page changed despite identical rendering.
4. **Preserve owner boundaries.** Drop no output used by a current consumer. SQLite remains an internal build input outside `website/static`; original exports remain the source for read-only verification and later game updates.

## Risks / Trade-offs

- [A dynamic or nested reader escapes a word search] → Trace actual SQL and compare old/new page data, FTS results, redaction closure, and sitemap entries on the same export.
- [No credible old-site baseline exists] → Stop migration until a prior manifest and old-schema database can be generated and their hashes reconciled. Never invent dates.
- [Multiple source changes coincide with pruning] → Only preserve `lastmod` where both baseline checks pass; publish changed pages with new dates.

## Migration Plan

Generate a table/column consumer inventory. Keep the prior database and live manifest as read-only comparison inputs. Create and test the hash bridge before schema removal. Prune proven-unread tables and columns with dependent loader and redaction updates. Compare database-backed page data and sitemap URL sets before and after; review the IndexNow URL list before deployment. Roll back to the previous schema/database and manifest together if comparison fails.
