## MODIFIED Requirements

### Requirement: A sitemap manifest supplies the sitemap

The manifest SHALL include every prerendered, indexable, self-canonical page URL and the canonical home URL, except numbered list pages. The sitemap SHALL add every numbered list page with the date of its list's first page.

#### Scenario: Indexable page membership

- WHEN an indexable prerendered page has a self-canonical URL
- THEN the sitemap includes that URL

#### Scenario: A list has three pages

- WHEN the sitemap is built
- THEN it includes `/<list>/page/2` and `/<list>/page/3` with the date of `/<list>`
- AND it includes neither `/<list>/page/1` nor `/<list>/page/4`

### Requirement: Overview pages and breadcrumbs publish their visible structure

An overview that uses collection metadata SHALL emit a `CollectionPage` with an `ItemList` of its page entries on its first page, and its numbered pages SHALL NOT repeat it. Each list entry SHALL have its displayed name, canonical URL, and one-based position. A rendered breadcrumb SHALL emit a `BreadcrumbList` that follows its visible order; breadcrumb entries without links SHALL omit `item`. JSON-LD serialization SHALL prevent script-closing text from breaking out of its script element.

#### Scenario: An overview lists three entities

- **WHEN** its collection node renders
- **THEN** `numberOfItems` is three and positions follow the displayed entry order

#### Scenario: A numbered list page renders

- WHEN `/<list>/page/2` is prerendered
- THEN it emits no `CollectionPage`

#### Scenario: An entity name includes a closing script tag

- **WHEN** the name is serialized into JSON-LD
- **THEN** the text remains data and does not close the JSON-LD script

## ADDED Requirements

### Requirement: Lists that render one page have numbered pages

A top-level list whose HTML shows only its first page SHALL prerender every later page of its default order at `/<list>/page/<number>`, from 2 to its last page, with that page's rows in the HTML in the order the list shows them. Its first page SHALL stay at `/<list>`. The page count SHALL follow the list's current data and default page size.

#### Scenario: A list grows past a page boundary

- WHEN the list's rows grow past its last page
- THEN the next build prerenders the new page without a code change

#### Scenario: A crawler reads page 2 without JavaScript

- WHEN `/items/page/2` is fetched
- THEN its table links to the items the full list shows on page 2, in that order

#### Scenario: A page outside the range is requested

- WHEN `/items/page/1` or a page after the last is requested
- THEN no page is served under that URL

### Requirement: Page controls link the default view's pages

In a numbered list's default view, with no search, no active filter and its initial sort and page size, the page number, previous and next controls SHALL be links to the list's pages without a trailing slash and SHALL look as the buttons did. A plain click SHALL change the page in place and show the page's path in the address bar. With search, an active filter or another sort, the controls SHALL be buttons that keep the page in the list's query parameters on the list's first path.

#### Scenario: A visitor clicks page 2 on the first page

- WHEN the visitor clicks page 2
- THEN the table shows page 2 without loading a new document
- AND the address bar shows `/<list>/page/2`

#### Scenario: A visitor filters a numbered page

- WHEN the visitor applies a filter on `/items/page/2`
- THEN the address bar shows `/items` with the filter in its query
- AND the page controls are buttons

### Requirement: Numbered pages name themselves as canonical

Each numbered list page SHALL use its own URL as its canonical and Open Graph URL and SHALL keep the title and description of its list's first page.

#### Scenario: A crawler reads page 2 metadata

- WHEN a crawler reads `/items/page/2`
- THEN its canonical URL is `https://ancient-kingdoms.compendiums.org/items/page/2`
- AND its title is the item list's title
