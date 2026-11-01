## Purpose

Defines where Pocket Compendium shows respawn state: the boss list in list or compact style, world markers, edge arrows, map pins, Bestiary countdowns and respawn alerts.

## ADDED Requirements

### Requirement: The boss list groups by zone

The boss list SHALL show monsters in the current zone first, then watched monsters from other zones under their zone's name. Each group header SHALL give its zone and count.

#### Scenario: Watched boss elsewhere

- **WHEN** the player is in Crescent Coast and watches Spirit of the Forest
- **THEN** the list shows Crescent Coast first and Spirit of the Forest under a Twilight Forest group with a pin

### Requirement: List rows stay short

Each list row SHALL show the portrait, the name, the level in the game's level colour, the state and, for monsters in the current zone, the distance in yd with an arrow. The arrow and distance SHALL lead to a monster that is up where the game shows it, and otherwise to its spawn point or altar. Kill times, roll results and rules SHALL appear only in the row's tooltip. A name too long for its row SHALL end in an ellipsis, and the tooltip SHALL give it in full.

#### Scenario: Long name

- **WHEN** a row's name is wider than the space before its state
- **THEN** the name ends in an ellipsis and does not overlap the state

#### Scenario: A boss that left its spawn point

- **WHEN** Forsaken Skeleton is in combat 15 yd west of the player, far from its spawn point in the east
- **THEN** its row's arrow points west and says 15 yd

### Requirement: Level colours follow the game

The level SHALL use the game's colour for the monster's level minus the player's: gray below -10, green from -10 to -2, white from -1 to 1, yellow from 2 to 4, red from 5 to 10, and red with a skull before the number above 10.

#### Scenario: Monster far above the player

- **WHEN** a level 14 player sees Ancient Cyclops at level 55
- **THEN** its row shows a red skull followed by Lv 55

### Requirement: Dead portraits show progress

A dead monster's portrait SHALL be darkened, with a sweep that clears as its respawn time runs out.

#### Scenario: Recently killed boss

- **WHEN** Xylevis has 12% of its respawn time left
- **THEN** its portrait is darkened except for 88% that has cleared

### Requirement: Compact style shows portraits with times

The compact style SHALL show one portrait tile per monster with its time or state on the tile and a gold corner for watched monsters. Its header bar SHALL appear only while the pointer is over the panel and SHALL include a button that switches back to the list.

#### Scenario: Switching back

- **WHEN** the player points at a compact panel and clicks its list button
- **THEN** the panel shows the list style

### Requirement: World markers sit on spawn points

A world marker SHALL show a dead monster's portrait on its spawn point, with a ring that fills until it respawns, and its name and time below in outlined text without a box.

#### Scenario: Dead boss nearby

- **WHEN** Xylevis is dead and its spawn point is on screen
- **THEN** its portrait, name and 4:19 appear on the spawn point

### Requirement: Edge arrows point to bosses that are up

When a monster that is up is off screen, an edge arrow SHALL show its portrait at the screen edge, pointing towards it, with its name and distance in outlined text.

#### Scenario: Boss up off screen

- **WHEN** Ancient Cyclops is up 208 yd west and off screen
- **THEN** its portrait arrow sits at the left edge with "Up · 208 yd"

### Requirement: Map pins show portraits only

On the local map, each tracked monster SHALL show as a portrait pin. Dead monsters SHALL carry a small time tag and monsters that are up SHALL glow. Hovering a pin SHALL show its name, level and spawn rules in the game's tooltip.

#### Scenario: Hovering a pin

- **WHEN** the player hovers Xylevis's pin on the map
- **THEN** the tooltip says it respawns 35 min after each kill and when the next spawn is

### Requirement: The Bestiary counts down

In the Bestiary grid, a dead monster's portrait SHALL be dimmed, with a dark sweep over the share of its time still to run and its remaining time in bold on top. On its page, a plate on the split between the facts and the lore SHALL say "Respawns in" with the time and a bar that fills, without covering the lore or the facts. The grid's countdowns and the page's plate SHALL each have their own switch, both on at first start.

#### Scenario: Opening a dead boss's page

- **WHEN** the player opens Xylevis's Bestiary page with 4:19 left
- **THEN** the grid portrait shows 4:19 and the page shows "Respawns in 4:19"

#### Scenario: Only the page counts down

- **WHEN** the player switches off the grid's countdowns and opens Xylevis's page with 4:19 left
- **THEN** the grid portrait shows no time and the page still shows "Respawns in 4:19"

### Requirement: Alerts use the game's message

When a watched monster spawns, the mod SHALL raise the game's own important message and chat line naming it. A monster that is not watched SHALL NOT raise an alert.

#### Scenario: Watched boss spawns

- **WHEN** watched Xylevis respawns
- **THEN** the game's important message band and a chat line announce it

### Requirement: Watching a monster

Clicking a row, tile or pin SHALL toggle whether the monster is watched. Shift-clicking it SHALL open its Bestiary page.

#### Scenario: Watching from the list

- **WHEN** the player clicks Seer Kzhal's row
- **THEN** Seer Kzhal is watched and stays listed in every zone
