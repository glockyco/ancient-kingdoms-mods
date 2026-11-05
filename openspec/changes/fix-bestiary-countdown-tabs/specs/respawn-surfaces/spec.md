## MODIFIED Requirements

### Requirement: The Bestiary counts down

In the Bestiary grid, a dead monster's portrait SHALL be dimmed, with a dark sweep over the share of its time still to run and its remaining time in bold on top. On its page, a plate on the split between the facts and the lore SHALL say "Respawns in" with the time and a bar that fills, without covering the lore or the facts. The grid's countdowns and the page's plate SHALL each have their own switch, both on at first start. The grid's countdowns SHALL show only while the Journal shows the Bestiary, and SHALL keep working after the player switches to another Journal tab and back.

#### Scenario: Opening a dead boss's page

- **WHEN** the player opens Xylevis's Bestiary page with 4:19 left
- **THEN** the grid portrait shows 4:19 and the page shows "Respawns in 4:19"

#### Scenario: Only the page counts down

- **WHEN** the player switches off the grid's countdowns and opens Xylevis's page with 4:19 left
- **THEN** the grid portrait shows no time and the page still shows "Respawns in 4:19"

#### Scenario: Another Journal tab and back

- **WHEN** a dead monster counts down in the Bestiary grid and the player opens Herbalism and then the Bestiary again
- **THEN** Herbalism shows no countdowns, and the Bestiary shows the monster's countdown again
