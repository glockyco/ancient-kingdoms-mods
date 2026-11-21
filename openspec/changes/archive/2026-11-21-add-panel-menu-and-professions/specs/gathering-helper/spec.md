## MODIFIED Requirements

### Requirement: The panel lists every gathering type by category

The Gathering panel SHALL show one tab per category, herbs, ores, fishing and sparks, and each tab SHALL show every type of its category in the game as a compact tile. The current zone's types SHALL come first with how many nodes are ready, or the time until the next one when none is, on a dark band across the tile's bottom. Types of other zones SHALL follow dimmed and without a number, and a tile's tooltip SHALL name the zones where the type grows. Tiles SHALL use the boss list's compact look, with the gold corner for watched types.

#### Scenario: Herbs in The Lone-Lands

- **WHEN** a player in The Lone-Lands opens the herbs tab
- **THEN** Chamomile, Spike and Violet come first with their ready counts
- **AND** the other 16 herbs follow dimmed

### Requirement: The list starts shown on the ores tab

At first start the list SHALL show, on the ores tab, the shortest that still shows the list at work.

#### Scenario: First start

- **WHEN** a player starts Pocket Compendium for the first time
- **THEN** the Gathering list shows its ores tab at the bottom right

## RENAMED Requirements

- FROM: `### Requirement: The list starts hidden`
- TO: `### Requirement: The list starts shown on the ores tab`

## REMOVED Requirements

### Requirement: A round button on the minimap shows and hides the panel

**Reason**: The panel menu's Gathering switch shows and hides the list, with what is watched kept, as `mod-settings-layout` requires for every panel.

**Migration**: Whether the list shows carries over to the menu's switch.
