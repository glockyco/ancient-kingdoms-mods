# page-metadata Specification

## Purpose

Describe the metadata, structured data, and discovery output that the Ancient Kingdoms Compendium already publishes for its pages.

## Requirements

### Requirement: Pages publish their supplied title and description

Each prerendered page SHALL publish its route-supplied title and plain-text description in HTML. Detail descriptions SHALL use available entity data; a generator MAY return the same description for distinct entities.

#### Scenario: A visitor loads an item detail page

- **WHEN** the item page renders
- **THEN** its `<title>` and description meta tag contain the page-supplied title and generated item description

### Requirement: Pages publish canonical and social metadata

A page SHALL publish its absolute canonical URL without a trailing slash, except for the home page. The canonical URL SHALL also appear as its Open Graph URL. Its Open Graph and Twitter title and description SHALL match its HTML metadata. Open Graph type SHALL be `website`, locale SHALL be `en_US`, and Twitter card SHALL be `summary_large_image`.

#### Scenario: A page uses a path with a trailing slash

- **WHEN** metadata is generated for `/items/`
- **THEN** canonical and `og:url` use `https://ancient-kingdoms.compendiums.org/items`

#### Scenario: A page uses the home path

- **WHEN** metadata is generated for `/`
- **THEN** canonical and `og:url` end with `/`

#### Scenario: An unsuffixed fishing-family route selects its first variant

- **WHEN** a visitor opens `/gather-items/calm_fishing_spot`
- **THEN** its canonical and Open Graph URLs identify the selected suffixed placement, not the unsuffixed alias

### Requirement: Pages share a default social image

Each page SHALL use the absolute URL of `/og-default.png` for both Open Graph and Twitter images. Both image descriptions SHALL use the site logo/title-card alt text. Open Graph image dimensions SHALL be 1200 × 630.

#### Scenario: A crawler reads an item page

- **WHEN** the crawler reads Open Graph and Twitter metadata
- **THEN** both image tags point to the same default image and describe it as the site logo/title card

### Requirement: Robots rules identify crawlable and disallowed paths

`robots.txt` SHALL permit normal page crawling, disallow `/sitemap-manifest.json` and `/map?` query variants, and advertise `https://ancient-kingdoms.compendiums.org/sitemap.xml`. The canonical bare `/map` page SHALL remain crawlable.

#### Scenario: A crawler reads the robots policy

- **WHEN** the crawler asks for the sitemap and map crawl policy
- **THEN** it finds the sitemap URL, the map-query disallow rule, and no rule blocking bare `/map`

### Requirement: A sitemap manifest supplies the sitemap

The manifest SHALL include every prerendered, indexable, self-canonical page URL and the canonical home URL.

#### Scenario: Indexable page membership
- WHEN an indexable prerendered page has a self-canonical URL
- THEN the manifest includes that URL

### Requirement: Sitemap URLs are sorted
The generated sitemap SHALL list URLs in sorted order.

#### Scenario: Manifest order differs
- WHEN manifest entries arrive in a different order
- THEN sitemap URLs are still sorted

### Requirement: Semantic fingerprints govern sitemap dates
Equal semantic fingerprints SHALL preserve dates, changed or new fingerprints SHALL receive the generation day's UTC date, and removed URLs SHALL disappear.

#### Scenario: One page changes while another does not

- **WHEN** only one page's public cost changes
- **THEN** that page receives the generation date
- **AND** an unchanged page retains its earlier date

#### Scenario: Recipe teaching items change

- **WHEN** a recipe's displayed teaching-item membership, name, tooltip or icon changes
- **THEN** its semantic fingerprint changes and it receives the generation date
- **AND** the page and fingerprint consume the same teaching-item projection

#### Scenario: Storage layout changes

- **WHEN** normalized storage changes without changing a page's public facts
- **THEN** its semantic fingerprint and reconciled date remain unchanged

#### Scenario: Shared representation does not expand the hash workload

- **WHEN** equivalent page-facing values use shared immutable subtrees or independent copies
- **THEN** their fingerprints agree without expanding repeated subtrees into page-sized strings
- **AND** object insertion order does not affect the result
- **AND** changed scalar values, ordered array positions and duplicate multiplicity remain distinguishable

### Requirement: Sitemap lastmod requires a stored hash date
Hashed entries SHALL publish their stored `lastmod`, and bare entries SHALL omit it.

#### Scenario: A page cannot have a meaningful content hash

- **WHEN** a bare URL appears in the manifest
- **THEN** the sitemap lists it without `lastmod`

### Requirement: Sitemap aliases are omitted
The manifest SHALL omit fishing-family aliases whose canonical tag points to a placement.

#### Scenario: A fishing landing alias points to its first placement

- **WHEN** a family's unsuffixed page canonicalizes to a suffixed spot URL
- **THEN** the sitemap lists the placement and omits the alias

### Requirement: Production rejects obsolete sitemap schemes
Production SHALL use only manifest version 2 with `hash_scheme:"compendium-page-v2"`. Old or mixed schemes SHALL fail without replacing the prior manifest.

#### Scenario: The baseline scheme is obsolete

- **WHEN** production encounters a version-1 or mixed-scheme baseline
- **THEN** generation fails rather than resetting all dates or using an old reader
- **AND** the previous manifest bytes remain intact

### Requirement: Shared site identity uses JSON-LD

Every page SHALL include `WebSite`, `Organization`, and `Person` JSON-LD nodes with stable distinct identities. The website SHALL reference the organization as publisher; the organization SHALL reference the person as founder. The organization SHALL include its absolute logo URL. No shared `SearchAction` SHALL claim a public search endpoint that does not exist.

#### Scenario: A detail page renders the shared layout

- **WHEN** the HTML is prerendered
- **THEN** the three nodes link by `@id` and use absolute public URLs

### Requirement: Overview pages and breadcrumbs publish their visible structure

An overview that uses collection metadata SHALL emit a `CollectionPage` with an `ItemList` of its page entries. Each list entry SHALL have its displayed name, canonical URL, and one-based position. A rendered breadcrumb SHALL emit a `BreadcrumbList` that follows its visible order; breadcrumb entries without links SHALL omit `item`. JSON-LD serialization SHALL prevent script-closing text from breaking out of its script element.

#### Scenario: An overview lists three entities

- **WHEN** its collection node renders
- **THEN** `numberOfItems` is three and positions follow the displayed entry order

#### Scenario: An entity name includes a closing script tag

- **WHEN** the name is serialized into JSON-LD
- **THEN** the text remains data and does not close the JSON-LD script
