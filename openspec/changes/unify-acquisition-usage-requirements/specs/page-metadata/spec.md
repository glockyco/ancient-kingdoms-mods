## REMOVED Requirements

### Requirement: IndexNow reports changed hashed URLs

**Reason**: Retire external change notifications and their deployment coupling. Ordinary crawling and the advertised sitemap remain.

**Migration**: Remove the client, tests, verification-key asset and deploy hooks. Do not replace them with a disabled stub or another notification provider.

## MODIFIED Requirements

### Requirement: A sitemap manifest supplies the sitemap

The manifest SHALL include every prerendered, indexable, self-canonical page URL and the canonical home URL. It SHALL omit fishing-family aliases whose canonical tag points to a placement. The generated sitemap SHALL list URLs in sorted order. Hashed entries SHALL publish their stored `lastmod`, and bare entries SHALL omit it. Equal semantic fingerprints SHALL preserve dates, changed or new fingerprints SHALL receive the generation day's UTC date, and removed URLs SHALL disappear.

Production SHALL use only manifest version 2 with `hash_scheme:"compendium-page-v2"`. Old or mixed schemes SHALL fail without replacing the prior manifest. The one-time private conversion SHALL preserve a published date only when its old hash reconciles with the published manifest and old/new public semantics match. It SHALL NOT become a production compatibility path.

#### Scenario: One page changes while another does not

- **WHEN** only one page's public cost changes
- **THEN** that page receives the generation date
- **AND** an unchanged page retains its earlier date

#### Scenario: Storage layout changes

- **WHEN** normalized storage changes without changing a page's public facts
- **THEN** its semantic fingerprint and reconciled date remain unchanged

#### Scenario: A page cannot have a meaningful content hash

- **WHEN** a bare URL appears in the manifest
- **THEN** the sitemap lists it without `lastmod`

#### Scenario: A fishing landing alias points to its first placement

- **WHEN** a family's unsuffixed page canonicalizes to a suffixed spot URL
- **THEN** the sitemap lists the placement and omits the alias

#### Scenario: The baseline scheme is obsolete

- **WHEN** production encounters a version-1 or mixed-scheme baseline
- **THEN** generation fails rather than resetting all dates or using an old reader
- **AND** the previous manifest bytes remain intact
