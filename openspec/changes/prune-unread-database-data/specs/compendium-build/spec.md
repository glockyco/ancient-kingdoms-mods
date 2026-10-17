## ADDED Requirements

### Requirement: Removing unused database storage preserves all published consumers

The build SHALL retain all data used by the website, search, sitemap, redaction, and other database consumers. Removing an unused table or column SHALL NOT discard required export validation or change published page data. A source-name search alone SHALL NOT establish that a field is unused.

#### Scenario: A table has no database reader

- **WHEN** a table has no reader after all pipeline and website consumers are checked
- **AND** no open OpenSpec change names it as an input
- **THEN** its data may be removed from SQLite
- **AND** the exported data it came from remains validated

#### Scenario: A table is the input of a planned change

- **WHEN** a table has no current reader but an open OpenSpec change names it as an input
- **THEN** it stays in SQLite with its loader and validation

#### Scenario: A column has an indirect reader

- **WHEN** a candidate column contributes through `SELECT *`, a JSON expression, a generated field, or a sitemap hash
- **THEN** the consumer is considered before that column can be removed

### Requirement: Sitemap dates reflect content changes rather than schema removal

The sitemap SHALL follow the canonical page-metadata contract. Against a trusted version-2 baseline, equal public semantic fingerprints SHALL retain `lastmod`. Schema-only storage removal SHALL NOT be treated as a public content change. The first historical conversion SHALL NOT promise preservation of a legacy date whose published hash and unchanged public semantics cannot both be reconciled.

#### Scenario: A field removed from SQLite was not published

- **WHEN** a removed field does not affect a page's public content
- **AND** the page has an equal public fingerprint in a trusted version-2 baseline
- **THEN** its URL retains its previous `lastmod`

#### Scenario: A page's published content changes

- **WHEN** a database change alters the page's public content
- **THEN** its `lastmod` changes

#### Scenario: A historical date cannot be proved

- **WHEN** the first historical conversion cannot reconcile a page's published legacy hash or unchanged public semantics
- **THEN** its hashed entry receives the supplied generation date
- **AND** subsequent storage-only updates use the trusted version-2 baseline without repeating that conversion
