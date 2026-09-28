## ADDED Requirements

### Requirement: Removing unused database storage preserves all published consumers

The build SHALL retain all data used by the website, search, sitemap, redaction, and other database consumers. Removing an unused table or column SHALL NOT discard required export validation or change published page data. A source-name search alone SHALL NOT establish that a field is unused.

#### Scenario: A progression table has no database reader

- **WHEN** a progression table has no reader after all pipeline and website consumers are checked
- **THEN** its data may be removed from SQLite
- **AND** exported progression remains validated for verification payload generation

#### Scenario: A column has an indirect reader

- **WHEN** a candidate column contributes through `SELECT *`, a JSON expression, a generated field, or a sitemap hash
- **THEN** the consumer is considered before that column can be removed

### Requirement: Sitemap dates reflect content changes rather than schema removal

The sitemap SHALL preserve `lastmod` for pages whose published content has not changed. Schema-only storage removal SHALL NOT trigger a full-site IndexNow submission.

#### Scenario: A field removed from SQLite was not published

- **WHEN** a removed field does not affect a page's public content
- **THEN** its URL retains its previous `lastmod`
- **AND** the URL is not submitted to IndexNow solely because of that removal

#### Scenario: A page's published content changes

- **WHEN** a database change alters the page's public content
- **THEN** its `lastmod` changes and the URL is eligible for IndexNow submission
