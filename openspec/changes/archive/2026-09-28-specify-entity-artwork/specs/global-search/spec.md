## ADDED Requirements

### Requirement: Search results show recorded entity artwork when available

The search index SHALL carry the recorded artwork path for a searchable entity whose family has an image kind. A result without a recorded image SHALL use its entity-type glyph. Page and filtered-list results SHALL use their own glyphs. The palette SHALL NOT infer artwork existence from an entity identifier.

#### Scenario: A result has recorded artwork

- **WHEN** a search returns an item, monster, NPC, zone, skill, class, chest, gathering resource, mercenary, summon, achievement, or profession with a matching asset row
- **THEN** the result displays that row's image in its fixed-size image slot

#### Scenario: A result lacks recorded artwork

- **WHEN** a search returns an entity without a matching asset row
- **THEN** the result displays the glyph for its entity kind instead of a missing image

#### Scenario: A result represents a page or a filtered list

- **WHEN** a search returns a page or filtered-list result
- **THEN** the result displays its page or list glyph rather than an entity image
