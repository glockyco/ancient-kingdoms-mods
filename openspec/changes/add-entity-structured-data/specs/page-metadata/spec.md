## ADDED Requirements

### Requirement: Every detail page identifies its primary entity

Every indexed detail page for items, monsters, NPCs, quests, zones, skills, summons, mercenaries, altars, gathering resources, factions, classes, chests, recipes, and professions SHALL emit a `WebPage` JSON-LD node and a distinct primary entity node. The page's canonical `url` SHALL match its HTML canonical link. The page SHALL reference the existing `WebSite` identity through `isPartOf`, and its `mainEntity` SHALL reference the entity node by absolute `@id`. Page and entity identities SHALL remain separate and stable.

#### Scenario: An item detail page renders

- **WHEN** the HTML is prerendered
- **THEN** the `WebPage` points to its item node through `mainEntity`, and both nodes use distinct absolute IDs

#### Scenario: A profession page renders

- **WHEN** the profession detail page is indexed
- **THEN** it emits one page node and one primary entity node rather than relying only on shared site JSON-LD

### Requirement: Entity claims match visible, verified data

An entity SHALL use `Thing` unless a narrower Schema.org type has a verified semantic fit. A verified fictional location MAY use `Place`; `containedInPlace` SHALL connect places only. Each entity SHALL include its displayed name and canonical page URL. It SHALL use an accurate page description and available, appropriate artwork when those values exist. Absent optional values SHALL be omitted, not invented. Game loot SHALL NOT be presented as commercial `Product` and non-culinary crafting SHALL NOT be presented as `Recipe`.

#### Scenario: A loot item lacks a primary image

- **WHEN** the item's record has no usable artwork
- **THEN** the entity node omits `image` and asserts no fabricated price, availability, or reviews

#### Scenario: A chest lies in a zone

- **WHEN** the chest node uses `Thing`
- **THEN** it does not carry `containedInPlace` as though the chest were a `Place`

#### Scenario: A zone has a verified location identity

- **WHEN** the zone is represented as `Place`
- **THEN** its place properties describe only verified location relationships

### Requirement: Rendered structured data stays safe and semantically valid

JSON-LD values SHALL preserve user-facing text without allowing that text to close a script element. URLs and references SHALL be absolute and canonical. Gameplay joins SHALL not become invented Schema.org properties. Emitting valid JSON-LD SHALL not be described as search-ranking or rich-result eligibility.

#### Scenario: An entity name contains `</script>`

- **WHEN** the name appears in JSON-LD
- **THEN** it remains data and no executable element is injected

#### Scenario: A representative detail page is validated

- **WHEN** its rendered HTML is checked against the Schema.org validator
- **THEN** its types, properties, and graph references pass semantic review

### Requirement: Search markup requires a real public endpoint

The site SHALL NOT emit `SearchAction` while search exists only as a client-side palette without a public search-result URL. A future search action requires a real public search URL and an identified consumer.

#### Scenario: A crawler reads a detail page

- **WHEN** no public search endpoint exists
- **THEN** the page and shared website graph contain no `SearchAction`
