# respawn-surfaces Specification

## Purpose
Defines where Pocket Compendium shows respawn state: the boss list in list or compact style, world markers, edge arrows, map pins, Bestiary countdowns and respawn alerts.

## Requirements

### Requirement: The boss list groups by zone

The boss list SHALL show monsters in the current zone first, then watched monsters from other zones under their zone's name. Each group header SHALL give its zone and count.

#### Scenario: Watched boss elsewhere

- **WHEN** the player is in Crescent Coast and watches Spirit of the Forest
- **THEN** the list shows Crescent Coast first and Spirit of the Forest under a Twilight Forest group with a pin

### Requirement: List rows stay short

Each list row SHALL show the portrait, the name, the level in the game's level colour, the state and, for monsters in the current zone, the distance in yd with an arrow. The arrow and distance SHALL lead to a monster that is up where the game shows it, and otherwise to its spawn point or altar. Kill times, roll results and the other rules SHALL appear only in the row's tooltip. A name too long for its row SHALL end in an ellipsis, and the tooltip SHALL give it in full.

#### Scenario: Long name

- **WHEN** a row's name is wider than the space before its state
- **THEN** the name ends in an ellipsis and does not overlap the state

#### Scenario: A boss that left its spawn point

- **WHEN** Forsaken Skeleton is in combat 15 yd west of the player, far from its spawn point in the east
- **THEN** its row's arrow points west and says 15 yd

### Requirement: A chance spawn shows its chance

A monster that spawns by chance SHALL show its chance after the level in its list row, such as "Lv 25 · 75% chance", and its Bestiary plate SHALL count down to its next roll with the chance, such as "75% chance in 15:33".

#### Scenario: A chance spawn's row

- **WHEN** the list shows Forsaken Skeleton, whose spawns each have a 75% chance
- **THEN** its row's second line reads "Lv 25 · 75% chance"

#### Scenario: A chance spawn's page

- **WHEN** the player opens Forsaken Skeleton's page with 15:33 to its next roll
- **THEN** the page shows "75% chance in 15:33"

### Requirement: A day or night monster shows its hours

A monster out only by day or by night SHALL show its hours after the level in its list row, in every state, written like the game's clock, such as "Lv 55 · 20:00 to 08:00".

#### Scenario: Spirit of the Forest up at night

- **WHEN** the list shows Spirit of the Forest, out from 20:00 to 08:00
- **THEN** its row's second line reads "Lv 55 · 20:00 to 08:00"

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

On the local map, each tracked monster SHALL show as a portrait pin. A pin SHALL sit where a monster that is up is, as far as the game shows it, and otherwise on its spawn point or altar. Dead monsters SHALL carry a small time tag and monsters that are up SHALL glow. Hovering a pin SHALL show its name, level and spawn rules in Pocket Compendium's tooltip.

#### Scenario: Hovering a pin

- **WHEN** the player hovers Xylevis's pin on the map
- **THEN** the tooltip says it respawns 35 min after each kill and when the next spawn is

#### Scenario: A boss that left its spawn point

- **WHEN** Forsaken Skeleton is up 15 yd west of its spawn point and the player opens the local map
- **THEN** its pin glows 15 yd west of the spawn point, where the skeleton is

### Requirement: Hover text states the spawn rule

A monster's hover text SHALL state its spawn rule in one paragraph, with a placeholder spawn's source state in the same sentence, such as "Spawns the next time Large Shade Beast dies.". Below it, the hover text SHALL add only state lines that say more than the row, and SHALL NOT repeat Up, In combat or Altar.

#### Scenario: A monster that is up

- **WHEN** the player hovers Urzak the Untamed's row while it is up
- **THEN** the hover text gives its rule and hours and no "Up now." line

#### Scenario: A source the mod cannot see

- **WHEN** a client without sharing hovers Keeper Remnant's row and Large Shade Beast is out of sight
- **THEN** the hover text says "Spawns when Large Shade Beast dies." and nothing about Large Shade Beast's state

### Requirement: Day or night monsters say when they come and leave

A day or night monster's hover text SHALL give its hours as "Only at night, from 20:00 until it leaves at 08:00.". While it waits for its hours, the hover text SHALL say "Next spawn in" and the Bestiary plate "Respawns in" with the wait.

#### Scenario: Waiting for the night

- **WHEN** the player opens Spirit of the Forest's page at 19:52
- **THEN** the plate shows "Respawns in 8 min" and its row's hover text says "Next spawn in 8 min."

### Requirement: The Bestiary counts down

In the Bestiary grid, a dead monster's portrait SHALL be dimmed, with a dark sweep over the share of its time still to run and its remaining time in bold on top. On its page, a plate on the split between the facts and the lore SHALL say "Respawns in" with the time and a bar that fills, without covering the lore or the facts. The grid's countdowns and the page's plate SHALL each have their own switch, both on at first start.

#### Scenario: Opening a dead boss's page

- **WHEN** the player opens Xylevis's Bestiary page with 4:19 left
- **THEN** the grid portrait shows 4:19 and the page shows "Respawns in 4:19"

#### Scenario: Only the page counts down

- **WHEN** the player switches off the grid's countdowns and opens Xylevis's page with 4:19 left
- **THEN** the grid portrait shows no time and the page still shows "Respawns in 4:19"

### Requirement: The grid counts down only on the Bestiary tab

The grid's countdowns SHALL show only while the Journal shows the Bestiary, and SHALL keep working after the player switches to another Journal tab and back.

#### Scenario: Another Journal tab and back

- **WHEN** a dead monster counts down in the Bestiary grid and the player opens Herbalism and then the Bestiary again
- **THEN** Herbalism shows no countdowns, and the Bestiary shows the monster's countdown again

### Requirement: Alerts use the game's message

When a watched monster spawns, the mod SHALL raise the game's own important message and chat line naming it. While the General setting Undiscovered monsters is off, a watched monster the player has not discovered SHALL be named ??? in its alert, as on every other surface. A monster that is not watched SHALL NOT raise an alert.

#### Scenario: Watched boss spawns

- **WHEN** watched Xylevis respawns
- **THEN** the game's important message band and a chat line announce it

#### Scenario: Watched undiscovered monster spawns while hidden

- **WHEN** Undiscovered monsters is off and watched Vyriss the Withered, not yet discovered, spawns in Crescent Coast
- **THEN** the chat line reads "??? has spawned in Crescent Coast."

### Requirement: Watching a monster

Clicking a row, tile or pin SHALL toggle whether the monster is watched. Shift-clicking it SHALL open its Bestiary page. The Bestiary page of a boss, elite or fabled monster SHALL have a Watch button beside the Skills button that toggles the same watch and reads "Watching" while the monster is watched.

#### Scenario: Watching from the list

- **WHEN** the player clicks Seer Kzhal's row
- **THEN** Seer Kzhal is watched and stays listed in every zone

#### Scenario: Watching from the Bestiary

- **WHEN** the player clicks Watch on Forsaken Skeleton's Bestiary page
- **THEN** the button reads "Watching", and Forsaken Skeleton's list row carries the gold corner

### Requirement: Dungeon entrances list their monsters

Hovering a dungeon's entrance on the local map SHALL show a card beside it with the dungeon's tracked bosses, elites and fabled monsters in the boss list's compact style: the dungeon's name, how many are up, and their tiles four to a line in the boss list's state order. A dungeon without tracked monsters SHALL get no card. Dungeon entrances SHALL be a feature with its own switch, apart from map pins.

#### Scenario: Hovering Sunken Temple's entrance

- **WHEN** the player hovers the Sunken Temple gate on Crescent Coast's map
- **THEN** a card titled Sunken Temple shows its eight bosses and elites, those that are up first

### Requirement: A dungeon card works like the boss list

A dungeon card SHALL stay while the pointer is on the entrance, on the card or between them, and SHALL close as soon as the local map stops showing, such as when the player switches to the world map. Its tiles SHALL work as the boss list's tiles do: hovering one gives its tooltip, clicking it toggles the watch and Shift-clicking it opens its Bestiary page.

#### Scenario: Watching from the card

- **WHEN** the player moves from Lost Archives's gate onto Archivist Phaendar's tile and clicks it
- **THEN** Archivist Phaendar is watched

#### Scenario: Switching to the world map

- **WHEN** Sunken Temple's card is open and the player switches to the world map
- **THEN** the card is gone from the world map
