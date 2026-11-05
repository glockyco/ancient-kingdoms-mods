# Spec Delta

## MODIFIED Requirements

### Requirement: Dead portraits show progress

In the boss list's list style, a dead monster's portrait SHALL be dimmed in full while its row shows the time or state. In the compact style, a dead monster's portrait SHALL stay as it is, with only its time or state on the tile. No portrait SHALL show a sweep of the share of time still to run.

#### Scenario: Recently killed boss

- **WHEN** Xylevis is dead with 12% of its respawn time left and the boss list shows the list style
- **THEN** its portrait is dimmed in full and its row shows the time left

#### Scenario: Recently killed boss in the compact style

- **WHEN** Xylevis is dead with 12% of its respawn time left and the boss list shows the compact style
- **THEN** its portrait shows as it does while it is up, with the time left on the tile

### Requirement: The Bestiary counts down

In the Bestiary grid, a dead monster's portrait SHALL stay as it is, with its remaining time in bold on a shade at the bottom of the tile and no dim or sweep. On its page, a plate on the split between the facts and the lore SHALL say "Respawns in" with the time and a bar that fills, without covering the lore or the facts. The grid's countdowns and the page's plate SHALL each have their own switch, both on at first start.

#### Scenario: Opening a dead boss's page

- **WHEN** the player opens Xylevis's Bestiary page with 4:19 left
- **THEN** the grid portrait shows 4:19 without a dim or a sweep, and the page shows "Respawns in 4:19"

#### Scenario: Only the page counts down

- **WHEN** the player switches off the grid's countdowns and opens Xylevis's page with 4:19 left
- **THEN** the grid portrait shows no time and the page still shows "Respawns in 4:19"
