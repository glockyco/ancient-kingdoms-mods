## 1. Prove storage consumers

- [ ] 1.1 Generate a schema table/column inventory and trace direct and indirect readers in website queries/scripts, pipeline SQL, FTS and redaction. Verify actual consumers rather than a word-search miss. Retain the four progression tables for their current and planned consumers.

## 2. Reuse the semantic sitemap cutover

- [ ] 2.1 Verify acquisition's explicit page-facing fingerprints replace storage-sensitive hashes for affected URLs. A published content change updates its date and a storage-only field change does not.
- [ ] 2.2 Verify acquisition's private one-time date reconciliation and strict new production format. Carry a published date only when its old hash reconciles and public semantics match. Do not introduce a production old-schema adapter, bridge CLI or receipt.

Acquisition owns this cutover. Its completion does not finish the unrelated pruning audit.

## 3. Prune and prove the release

- [ ] 3.1 Remove only proven-unread tables and columns from `schema.sql` and dependent inserts and references.
- [ ] 3.2 Compare old/new database-backed page data, search documents, redaction decisions, and sitemap URL set for the same export. Inspect representative pages in a browser at 1440x900 and 390x844. Verify unchanged content retains reconciled `lastmod`.
