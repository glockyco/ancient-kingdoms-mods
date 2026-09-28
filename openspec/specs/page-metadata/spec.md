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

The manifest SHALL include every prerendered, indexable, self-canonical page URL and the canonical home URL. It SHALL omit prerendered fishing-family aliases whose canonical tag points to a placement. The generated sitemap SHALL list each manifest URL in sorted order. A hashed entry SHALL publish its stored `lastmod`; an un-hashed entry SHALL omit `lastmod`. Unchanged hashed entries SHALL keep their earlier date, changed hashed entries SHALL receive the current date, and removed entries SHALL disappear.

#### Scenario: One page changes while another does not

- **WHEN** the manifest is rebuilt after only one hashed page changes
- **THEN** the changed page receives the current `lastmod` and the unchanged page retains its prior date

#### Scenario: A page cannot have a meaningful content hash

- **WHEN** an un-hashed URL appears in the manifest
- **THEN** the sitemap contains that URL without `lastmod`

#### Scenario: A fishing landing alias points to its first placement

- **WHEN** a fishing family's unsuffixed page canonicalizes to a suffixed spot URL
- **THEN** the sitemap lists the canonical placement URL and omits the alias URL

### Requirement: IndexNow reports changed hashed URLs

After deployment, the IndexNow ping SHALL compare the previous live manifest with the current manifest. It SHALL submit new, changed, and removed hashed URLs. It SHALL omit unchanged URLs and un-hashed entries. Without a previous live manifest or any changed URLs, it SHALL send no ping. A failed request SHALL report an error.

#### Scenario: A hashed page is removed

- **WHEN** the former manifest contains that URL and the new manifest does not
- **THEN** the removed URL appears in the IndexNow payload

#### Scenario: The live baseline cannot be fetched

- **WHEN** no prior manifest is available
- **THEN** the ping is skipped rather than presenting all current URLs as changed

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
