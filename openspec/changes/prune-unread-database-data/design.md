## Context

The four progression tables remain required. `progression_rules` and `class_level_progression` already have website consumers, including the Experience page, and the shared character model needs the retained progression data. The remaining audit must establish other actual consumers rather than assume these tables are unread. Acquisition owns the semantic sitemap cutover and one-time private date reconciliation before removing its source projections.

## Goals / Non-Goals

**Goals:** Prove actual storage is unread and avoid false full-site sitemap changes.

**Non-Goals:** Delete original game-export fields, remove the progression tables, or assume a word-search miss proves absence.

## Decisions

1. **Audit before removal.** Enumerate every table and column from `schema.sql` and SQLite `PRAGMA table_info`; inspect explicit and dynamic SQL in website pages, query helpers, scripts, FTS, denormalizers, redaction reference traversal, and statistics. `SELECT *`, SQL JSON operations, dynamic table names, and hash inputs count as reads. The roughly 79 no-word-match columns are candidates, not approved deletions. Record a per-field decision before any schema edit.
2. **Keep the progression tables.** `progression_rules`, `race_progression`, `class_level_progression` and `level_budgets` stay in SQLite with their loader, validation and redaction reference rule. The audit records them as retained for the character model. Deleting them now would only mean restoring them when the rules change lands.
3. Preserve dates through the canonical metadata contract. Consume acquisition's semantic projector and strict version-2 manifest. Against a trusted version-2 baseline, equal public fingerprints retain their dates even when storage changes. The first historical conversion carries a published date only when the reproduced old hash matches the published manifest and old/new public semantics match. Unprovable legacy dates receive the generation date. Acquisition owns that one-time conversion. Keep no old-schema adapter, bridge CLI, receipt or notification dependency.
4. **Preserve owner boundaries.** Drop no output used by a current consumer. SQLite remains an internal build input outside `website/static`; original exports remain the source for read-only verification and later game updates.

## Risks / Trade-offs

- [A dynamic or nested reader escapes a word search] → Trace actual SQL and compare old/new page data, FTS results, redaction closure, and sitemap entries on the same export.
- [A historical date cannot be reconciled] Use the supplied generation date rather than invent continuity. Do not repeat historical conversion for later pruning against a trusted version-2 baseline.
- [Multiple source changes coincide with pruning] Compare public semantics against the trusted baseline. Real content changes receive the generation date.

## Migration Plan

Generate a table/column consumer inventory. Verify acquisition's semantic sitemap cutover is accepted before relying on it, without marking unrelated pruning work complete. Reuse its ordinary version-2 baseline rather than rerunning the historical conversion. Prune only proven-unread storage with dependent loader and redaction updates. Compare database-backed page data, search, redaction closure and sitemap URLs for the same export. Roll back schema/database and manifest together if comparison fails.
