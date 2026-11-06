## ADDED Requirements

### Requirement: The loader download omits generated assemblies

The site's MelonLoader zip SHALL contain the locally patched loader without generated game assemblies.

#### Scenario: A player downloads the loader

- **WHEN** the player extracts the site's MelonLoader zip
- **THEN** it contains the patched loader and no generated game assemblies

### Requirement: Hovers match the surface they belong to

Hovers on Pocket Compendium's own panels and map SHALL use the panels' look. Hovers within the game's windows SHALL use the game's frame.

#### Scenario: Comparing a boss-list hover with a Bestiary hover

- **WHEN** the player hovers an entry in each surface
- **THEN** the boss-list hover matches the panel and the Bestiary hover uses the game's frame

### Requirement: Bestiary tiles do not acquire boss-list state icons

Bestiary sidebar tiles SHALL NOT show state icons such as the boss list's random-spawn dice. Drop collection SHALL follow the game's save-wide found-drop record, not a separate character-local record.

#### Scenario: Another character found a drop

- **WHEN** the save records a drop found by another character
- **THEN** the Bestiary collection bar counts it as found

#### Scenario: A random-spawn monster has a Bestiary tile

- **WHEN** its tile renders in the sidebar
- **THEN** the tile has no random-spawn dice icon

### Requirement: Augment feature pictures make the marks readable

Augment-mark feature pictures SHALL use a level-50 best-in-slot Warrior with Great augments and endgame bags. The mods-page card SHALL show the equipment grid alone, large enough to read its marks. The README picture SHALL show the inventory and its first two bag rows.

#### Scenario: A reader compares the feature pictures

- **WHEN** the reader sees the mods card and the README picture
- **THEN** the card isolates the equipment grid and the README retains the first two bag rows

### Requirement: The mod's download owns the gold emphasis

On the mods page, gold download emphasis SHALL identify Pocket Compendium's own download rather than other downloads.

#### Scenario: A reader chooses a download

- **WHEN** the mods page shows both the loader and Pocket Compendium
- **THEN** the gold download emphasis belongs only to Pocket Compendium
