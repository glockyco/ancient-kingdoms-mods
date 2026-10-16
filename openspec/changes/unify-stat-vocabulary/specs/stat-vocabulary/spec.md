## ADDED Requirements

### Requirement: One catalogue names and formats every stat

The compendium SHALL keep one catalogue of the stats the game sums and of the effects it reads from buffs at hit or cast time. Each entry SHALL hold a fixed id, the character window's name, the item tooltip's name where the game has one, the display format and the clamp. Pages, popups, pipeline-built tooltips and calculators SHALL take stat names and formats from the catalogue and SHALL NOT define their own.

#### Scenario: Two contexts show the same stat

- **WHEN** an item list and a skill page both show a critical chance value
- **THEN** the item list names it with the catalogue's item tooltip name
- **AND** the skill page names it with the catalogue's character window name

#### Scenario: A new page shows a stat

- **WHEN** a page needs a stat's name or format
- **THEN** it reads the catalogue and adds no name, percent decision or formatter of its own

### Requirement: Stat names come from the game

The catalogue's names SHALL come from the game's own label code, read from the installed game when the data is exported. A name the site chooses differently SHALL be recorded in the catalogue with its reason.

#### Scenario: A game update renames a stat

- **WHEN** a game update changes a stat's label
- **THEN** the next export carries the new name
- **AND** every page shows it without a code change

#### Scenario: The site keeps its own name

- **WHEN** the site names a stat differently from the game
- **THEN** the catalogue records the override and its reason

### Requirement: Stats are formatted the way the game formats them

A stat the game stores as a fraction SHALL be shown as a percentage: the value times 100, with at most two decimals and without trailing zeros. Whole-number stats SHALL be shown with thousands separators. A bonus SHALL carry its sign, and a total SHALL NOT.

#### Scenario: The item list shows a chance stat

- **WHEN** the item list shows an item with a Critical Chance of 0.05
- **THEN** the cell shows 5%

#### Scenario: A fraction has more digits than the game shows

- **WHEN** a stat value is 0.05833
- **THEN** it is shown as 5.83%

### Requirement: Every stat field maps to one stat

Each stat field in the exported item, augment, armor set, skill, class and mercenary data SHALL map to exactly one catalogue stat and one kind of modifier: a flat amount, a percent of the stat, an amount per second, or a percent of the maximum per second. The export SHALL fail when a numeric stat field has no mapping or more than one.

#### Scenario: An item and a buff raise the same stat

- **WHEN** an item's `resist_fear_chance` and a buff's `fear_resist_chance_bonus` both raise Fear Resist
- **THEN** both map to the Fear Resist entry

#### Scenario: A game update adds a stat field

- **WHEN** a numeric stat field appears in the export model without a catalogue mapping
- **THEN** the exporter's tests fail and name the field
