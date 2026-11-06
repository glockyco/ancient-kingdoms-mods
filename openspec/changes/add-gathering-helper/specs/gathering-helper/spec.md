# Spec Delta

## Purpose

Defines Pocket Compendium's Gathering panel, how players watch herbs, ores, fish and Radiant Sparks, and how watched types show on the map, the minimap and the screen's edge.

## ADDED Requirements

### Requirement: The panel lists every gathering type by category

The Gathering panel SHALL show one tab per category, herbs, ores, fishing and sparks, and each tab SHALL show every type of its category in the game as a compact tile. The current zone's types SHALL come first with how many nodes are ready, or the time until the next one when none is. Types of other zones SHALL follow dimmed and without a number, and a tile's tooltip SHALL name the zones where the type grows. Tiles SHALL use the boss list's compact look, with the gold corner for watched types.

#### Scenario: Herbs in The Lone-Lands

- **WHEN** a player in The Lone-Lands opens the herbs tab
- **THEN** Chamomile, Spike and Violet come first with their ready counts
- **AND** the other 16 herbs follow dimmed

### Requirement: A tile's tooltip says whether a type is worth the walk

Hovering a tile, or focusing it with a gamepad, SHALL show Pocket Compendium's tooltip in the boss list's layout: the name, then the kind, level and zone in grey, then how many nodes here are ready, the regrow time and the player's chance from the game's own formula with their skill and best tool, then the click line. Below the game's floor it SHALL say that the skill is too low.

#### Scenario: Chamomile in The Lone-Lands

- **WHEN** a character with 0% Herbalism hovers the watched Chamomile tile while all 32 are ready
- **THEN** the tooltip reads "Chamomile", "Herb · Level 2 · The Lone-lands", "32 of 32 ready", "Grows back in 5m", "Your chance 30%" and "Click to stop watching."

#### Scenario: Ironjaw Catfish

- **WHEN** the player hovers Ironjaw Catfish in The Lone-Lands
- **THEN** the tooltip names the 2 of 5 spots there that list it and the fishing chance at them

#### Scenario: A herb out of reach

- **WHEN** that character hovers Azurevein
- **THEN** the tooltip says "Your chance 0%. Your Herbalism is too low."

### Requirement: Fishing tiles are fish

The fishing tab SHALL show one tile per fish that a fishing spot's catch list names. A tile in the current zone SHALL show how many of the zone's spots list the fish, and watching it SHALL mark those spots.

#### Scenario: Ironjaw Catfish in The Lone-Lands

- **WHEN** a player watches Ironjaw Catfish in The Lone-Lands
- **THEN** the two Calm spots that list it are marked, and the Calm spot that lists Blue Dartfish is not

### Requirement: A round button on the minimap shows and hides the panel

A round button in the minimap's own frame, on the minimap's lower left, SHALL show and hide the Gathering panel, and its icon SHALL be gold while the panel shows. Hiding the panel SHALL NOT change what is watched. Whether the panel shows SHALL persist across sessions.

#### Scenario: Hiding while gathering

- **WHEN** a player watching Chamomile clicks the round button while the panel shows
- **THEN** the panel hides, and the Chamomile pins, minimap icons and arrow stay

### Requirement: Clicking a tile watches its type

Clicking a tile SHALL toggle whether its type is watched. Watched types SHALL persist across sessions and worlds, apart from the boss list's watched monsters.

#### Scenario: Watching Iron Ore

- **WHEN** the player clicks the Iron Ore tile
- **THEN** the tile gets the gold corner, and Iron Ore nodes show on the map and minimap

### Requirement: Watched types show on the local map

For each watched type, the local map SHALL show a pin on every node of the current zone in its view, dimmed with its time while it grows back. The pins SHALL leave the player's own marker visible.

#### Scenario: Chamomile and Iron Ore on the map

- **WHEN** Chamomile and Iron Ore are watched and the player opens the local map in The Lone-Lands
- **THEN** the map shows a pin on each Chamomile and Iron Ore node in its view, and the player's marker above them

#### Scenario: Temple of Valaark

- **WHEN** the player is in Temple of Valaark, where the game closes the map
- **THEN** the mod draws no pins or minimap icons there

### Requirement: Watched types show on the minimap

The minimap SHALL show each watched type's icon on the nodes it covers, dimmed while they grow back.

#### Scenario: A growing Chamomile nearby

- **WHEN** a watched Chamomile on the minimap is growing back
- **THEN** its icon there is dimmed

### Requirement: One arrow points to the next node

One edge arrow SHALL point to the nearest ready node of any watched type that is off screen, with its name and distance in yd. When no watched node is ready, it SHALL point to the one that grows back first, with its time. Nothing SHALL be drawn on nodes in view, because the game shows their growth and time itself.

#### Scenario: Two watched types in The Lone-Lands

- **WHEN** Chamomile and Iron Ore are watched and the nearest ready Chamomile is 30 yd away off screen
- **THEN** one arrow at the screen's edge reads "Chamomile" and "30 yd"

### Requirement: The Gathering page switches each part

The gathering helper SHALL have one row in the settings window's Gathering group, and its page SHALL have a switch each for the map pins, the minimap and the arrow, on at first start. Each switch SHALL remove only its own part.

#### Scenario: Turning the arrow off

- **WHEN** the player switches Arrow off on the Gathering page
- **THEN** the arrow goes, and the list, pins and minimap icons stay

### Requirement: The list can keep to the current zone

The Gathering page SHALL have Zones with This zone and All zones, All zones at first start. With This zone, each tab SHALL list only the current zone's types, and its count SHALL count only those.

#### Scenario: Herbs in The Lone-Lands with This zone

- **WHEN** Zones is This zone in The Lone-Lands
- **THEN** the herbs tab shows Chamomile, Spike and Violet, and its count reads 3

### Requirement: Growing nodes can be hidden

The Gathering page SHALL have Growing nodes with Show and Hide, Show at first start. With Hide, the map and the minimap SHALL leave out nodes that are growing back.

#### Scenario: After a gathering run

- **WHEN** Growing nodes is Hide and half the watched Chamomile is growing back
- **THEN** the local map shows pins only on the ready Chamomile

### Requirement: Undiscovered types show as the game's journal shows them

While General's Undiscovered switch is off, a herb, ore or fish the character has not gathered SHALL show on its tile as the game journal's black silhouette, and SHALL still be watchable. Radiant Sparks SHALL always show.

#### Scenario: A new character with Undiscovered off

- **WHEN** a character who has gathered nothing opens the herbs tab with Undiscovered off
- **THEN** every herb tile is a black silhouette, and Chamomile can still be watched

### Requirement: The list starts hidden

At first start the list SHALL be hidden, and only the round button SHALL show.

#### Scenario: First start

- **WHEN** a player starts the version that adds the gathering helper for the first time
- **THEN** the minimap shows the round button and the list is hidden

### Requirement: Sparks behave like the other types

Radiant Sparks SHALL count, pin and point like herbs and ores. A spark that has not appeared SHALL count as growing, with the time until it appears where the mod knows it.

#### Scenario: No spark is out

- **WHEN** a player watching sparks in a world they host has no spark out in the zone
- **THEN** the spark tile shows the time until the next one appears, and the arrow points to it

### Requirement: The helper only reads, and costs little per frame

The gathering helper SHALL only read node positions and ready times and display them. It SHALL NOT gather, move the player or change a node. It SHALL find nodes with one scene search when a world session starts and learn of later nodes from their start, and its work in a frame SHALL depend on the watched types' nodes in the current zone, not on every node in the world.

#### Scenario: Walking through a zone

- **WHEN** the player walks across The Lone-Lands with every type watched and the list shown
- **THEN** no long frame recurs from the helper
