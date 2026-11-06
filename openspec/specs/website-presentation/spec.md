# website-presentation Specification

## Purpose
Preserve the website's established presentation and navigation choices so future changes retain the player's context and the intended scope of each page.

## Requirements

### Requirement: Navigation preserves established page names

A page SHALL carry its visible heading's name. Mechanics index and menu names SHALL use "and", while group and card names such as "Cost & Timing" SHALL retain "&". The mercenary stat page SHALL be "Mercenary Stats". The recipe list SHALL remain "Crafting Recipes", while the top bar SHALL retain "Map", "Mods" and "Recipes", and the home recipe section SHALL remain "Recipes". The threat a hit adds SHALL be "Threat Added".

#### Scenario: Opening the recipe list

- **WHEN** a reader follows Recipes in the top bar
- **THEN** the destination's heading is Crafting Recipes
- **AND** the home section above Crafting, Alchemy, Cooking and Scribing stays Recipes

#### Scenario: Finding party mechanics

- **WHEN** a reader finds the party mechanics page in the index or menu
- **THEN** it is named Party and Loot

### Requirement: Pages use game art and meaningful visual structure

Pages SHALL use the game's art and visual structure rather than only tables. An embedded map of a place SHALL be cropped from the stitched world screenshot using the zone-thumbnail approach. World-map markers SHALL use glyphs rather than game art.

#### Scenario: A page illustrates a place

- **WHEN** a page needs a local map
- **THEN** it uses a crop of the stitched world screenshot rather than an independently recreated map

### Requirement: The home page keeps its content-first composition

The home page SHALL have no introductory prose in, below or after the title-screen composition. The logo SHALL remain the pixel-art crowned book, with the gold crown the focal point at favicon size. The home title SHALL retain Guides, and the default share image SHALL remain the shared site image.

#### Scenario: A reader opens the home page

- **WHEN** the title-screen layout renders
- **THEN** no introductory paragraph pushes its useful content farther down

### Requirement: Map controls do not add a stacked-marker picker

The world map SHALL NOT introduce a picker for stacked markers. The existing wander circle SHALL remain.

#### Scenario: Markers are close together

- **WHEN** two markers nearly overlap
- **THEN** the map does not replace direct marker interaction with a stacked-marker picker

### Requirement: Retained entity layouts do not gain unsolicited features

Monster, NPC and zone pages SHALL retain their established layouts, including the phone monster layout. Quest pages SHALL NOT add a what-to-bring block above the chain. The experience page SHALL NOT add a level-range total. Virtue tiles SHALL NOT add a selection mark, and filter buttons SHALL retain their choice counts without an additional row of controls.

#### Scenario: A virtue tile is selected

- **WHEN** a reader chooses a virtue
- **THEN** the tile gains no extra selection mark

### Requirement: Existing game-context details stay intact

Set-piece tooltips SHALL retain their piece counts such as "(1/5)". The Ranger guide SHALL NOT add the bow deduction that is absent from its current presentation.

#### Scenario: A set piece has one of five pieces

- **WHEN** its tooltip is shown
- **THEN** it retains the (1/5) count

### Requirement: Search content does not require client execution

Indexable page content SHALL remain in prerendered HTML for search engines. Interactive functionality need not work without JavaScript. Existing requirements for complete content without JavaScript SHALL be interpreted as requirements on prerendered content, not a second no-JavaScript interface.

#### Scenario: A search crawler fetches an entity page

- **WHEN** the crawler reads the HTML without executing scripts
- **THEN** the page's indexable content is present
