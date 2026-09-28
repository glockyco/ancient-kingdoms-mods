## ADDED Requirements

### Requirement: Each item and monster has a distinct share card

Every published item and monster detail page SHALL reference a valid 1200 × 630 PNG card. Each card SHALL show the entity name and accurate family context. Item cards SHALL state the verified item type and quality. Monster cards SHALL state a verified level or level range and classification only when supported by the data. Available source artwork SHALL appear on the corresponding card. Open Graph and Twitter metadata SHALL use the same absolute public image URL and accurate descriptive alt text.

#### Scenario: A monster has primary art

- **WHEN** its detail page is prerendered
- **THEN** both social image tags point to its generated card with the correct monster name and available art

#### Scenario: An item has no artwork

- **WHEN** an otherwise valid item has no source artwork
- **THEN** its share card remains legible using text and a motif, not a broken image URL

### Requirement: Share cards are safe and deterministic

Entity text SHALL not inject SVG markup or escape the rendered card. Long names SHALL wrap or fit without clipping; required glyphs SHALL render consistently across build hosts. A public card path SHALL change whenever its final PNG bytes change. The same input set SHALL produce the same card bytes across build hosts.

#### Scenario: An entity name contains SVG markup characters

- **WHEN** the card is generated
- **THEN** those characters appear as text and do not modify the card markup

#### Scenario: Source art or font changes

- **WHEN** the final PNG bytes change
- **THEN** its public image URL changes so caches cannot serve the old card

### Requirement: Generation failures stop publication

A supported detail page SHALL never publish a missing image or missing identity lookup. Missing required artwork files, failed rendering, invalid output, and absent lookup entries SHALL fail the build. A valid entity without an artwork association SHALL use the text-card variant. Missing entities SHALL follow ordinary route-not-found behavior.

#### Scenario: A referenced artwork file is missing

- **WHEN** card generation tries to read that file
- **THEN** the build fails instead of using a generic fallback

#### Scenario: A failed generation run produces partial output

- **WHEN** generation fails before all cards and lookup entries are ready
- **THEN** partial output is not published as a valid release

### Requirement: Generated cards remain within the deployment budget

The complete build SHALL stay below the active Worker asset-count and per-file-size limits. The build SHALL report generated image bytes and added generation time so the card family can be reviewed against its storage and build-time budgets.

#### Scenario: A complete card build exceeds an active limit

- **WHEN** its output exceeds the deployment file count, per-file byte limit, or accepted generation budget
- **THEN** publication fails with the measured limit and output in the diagnostic

## MODIFIED Requirements

### Requirement: Pages share a default social image

Pages without an item or monster share card SHALL use the absolute URL of `/og-default.png` for both Open Graph and Twitter images. Both image descriptions SHALL use the site logo/title-card alt text. Open Graph image dimensions SHALL be 1200 × 630 for the default image and supported entity cards.

#### Scenario: A crawler reads a quest detail page

- **WHEN** the crawler reads Open Graph and Twitter metadata for an unsupported detail family
- **THEN** both image tags point to the same default image and describe it as the site logo/title card

#### Scenario: A crawler reads an item page

- **WHEN** the crawler reads Open Graph and Twitter metadata for a published item
- **THEN** both image tags point to that item's generated card and describe the item accurately
