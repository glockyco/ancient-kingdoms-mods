## 1. Prove storage consumers

- [ ] 1.1 Generate a schema table/column inventory and trace direct and indirect readers in website queries/scripts, pipeline SQL, FTS and redaction. Verify actual consumers rather than a word-search miss. Retain the four progression tables for their current and planned consumers.

## 2. Bridge sitemap hashes before pruning

- [ ] 2.1 Replace whole-row hashes for affected URLs with stable page-facing projections in `website/scripts/build-sitemap-manifest.mjs`. Verify a change to rendered content bumps its URL and a storage-only field change does not.
- [ ] 2.2 Generate both legacy and projected hashes on an old-schema database. Reconcile legacy hashes with a live baseline manifest before carrying `lastmod` into the projected manifest. Verify a missing baseline fails migration and a real content change still bumps `lastmod`.

The acquisition schema cutover requires this group first, not completion of the whole pruning audit. Record the bridge receipt for `unify-acquisition-usage-requirements` without marking unrelated pruning work complete.

## 3. Prune and prove the release

- [ ] 3.1 Remove only proven-unread tables and columns from `schema.sql` and dependent inserts and references.
- [ ] 3.2 Compare old/new database-backed page data, search documents, redaction decisions, and sitemap URL set for the same export. Inspect representative pages in a browser at 1440×900 and 390×844. Verify unchanged URLs retain `lastmod` and the reviewed IndexNow list excludes schema-only changes.
