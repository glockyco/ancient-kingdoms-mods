## 1. Prove storage consumers

- [ ] 1.1 Generate a schema table/column inventory and trace direct and indirect readers in website queries/scripts, pipeline SQL, FTS and redaction. Verify actual consumers rather than a word-search miss. Retain the four progression tables for their current and planned consumers.

## 2. Reuse the semantic sitemap cutover

- [ ] 2.1 Verify acquisition's accepted page-facing fingerprints replace storage-sensitive hashes for affected URLs. Against a trusted version-2 baseline, public content changes update dates and storage-only changes retain equal fingerprints and dates.
- [ ] 2.2 Verify acquisition's acceptance record includes the private historical reconciliation and strict version-2 production cutover. Do not repeat the conversion. Historical dates carry only when the old published hash reconciles and public semantics match. Unprovable legacy dates receive the generation date. Do not introduce a production old-schema adapter, bridge CLI or receipt.

Acquisition owns this cutover. Its completion does not finish the unrelated pruning audit.

## 3. Prune and prove the release

- [ ] 3.1 Remove only proven-unread tables and columns from `schema.sql` and dependent inserts and references.
- [ ] 3.2 Compare old/new database-backed page data, search documents, redaction decisions, and sitemap URL set for the same export. Inspect representative pages in a browser at 1440x900 and 390x844. Verify unchanged public fingerprints retain `lastmod` against the trusted version-2 baseline.
