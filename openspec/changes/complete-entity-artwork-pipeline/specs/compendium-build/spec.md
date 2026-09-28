## ADDED Requirements

### Requirement: Profession pages use verified game icons when available

After a game-backed export proves the icons readable and repeatable, the build SHALL publish those icons through `visual_assets`. The profession overview and detail pages SHALL display each recorded icon. A profession without a recorded icon SHALL keep its existing semantic glyph.

#### Scenario: A verified profession icon exists

- **WHEN** a visitor opens the professions overview or that profession's guide
- **THEN** the page displays the recorded profession icon
- **AND** no page constructs an unverified icon path

#### Scenario: No real icon is available

- **WHEN** the game-backed export provides no icon for a profession
- **THEN** its overview and guide show the existing profession glyph

### Requirement: Existing zone and treasure-map artwork appears in context

A zone detail page SHALL show its recorded zone thumbnail. A treasure-map item's detail page SHALL show its recorded map art beside the treasure-location information. Each image SHALL use its recorded public path and intrinsic dimensions. An absent asset SHALL leave the section usable without a broken image.

#### Scenario: A zone has a derived thumbnail

- **WHEN** a visitor opens a zone with a recorded `zone/thumbnail` asset
- **THEN** the zone page shows that thumbnail with space reserved from its recorded dimensions

#### Scenario: A treasure-map item has source art

- **WHEN** a visitor opens a treasure-map item with a recorded `item/treasure_map` asset
- **THEN** the treasure-location section shows that map image with space reserved from its recorded dimensions

#### Scenario: An entity has no matching asset

- **WHEN** either detail page has no matching recorded artwork
- **THEN** the existing text and links remain visible without a fabricated image
