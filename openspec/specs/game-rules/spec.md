# game-rules Specification

## Purpose
Defines where the compendium's game rules live: facts the game computes come from the export, a rule that depends on a character has one implementation that pages and the browser share, and every surface that states a rule's result states the same value.

## Requirements

### Requirement: A rule that depends on a character has one implementation

A game rule whose result depends on a character's level, veteran points, skills, gear or professions SHALL be implemented once, in the website's rules module, and SHALL run both when a page is prerendered and in the browser. A prerendered page SHALL state the baseline it computed for. The database SHALL store the rule's inputs and parameters and SHALL NOT store its result for a particular character. No rule SHALL be implemented in both the pipeline and the website.

#### Scenario: A page shows a chance that depends on a skill

- **WHEN** a prerendered page shows a chest reward chance that depends on the Treasure Hunter skill
- **THEN** it states the skill the chance assumes
- **AND** the page that offers a skill input recomputes the chance with the same function

### Requirement: Facts the game computes come from the game

A fact about an item that the game computes with its own function SHALL be exported by calling that function. The pipeline and the website SHALL NOT reimplement it.

#### Scenario: Primal essence

- **WHEN** the game accepts an item in trade for primal essence
- **THEN** the item's page shows the amount the game's function returns
- **AND** an item the game refuses shows no amount

### Requirement: Altar rewards follow level plus veteran points

The altar reward tier SHALL be chosen from the activating player's level plus total veteran points: the common reward below 40, magic from 40 to 49, epic from 50 to 149, and legendary from 150. Every page and popup that states a tier SHALL state its requirement from the exported thresholds, through one formatter.

#### Scenario: A veteran character activates an altar

- **WHEN** a level 50 character with 100 veteran points activates an altar
- **THEN** the pages state that this character receives the legendary reward

#### Scenario: A character below level 40

- **WHEN** a level 39 character activates an altar
- **THEN** the pages state that this character receives the common reward

### Requirement: Chest reward chances use the same computation on each surface

Item pages and the Treasure Hunter page SHALL compute a chest item reward's chance with one implementation of the game's reward loop, and SHALL state its exact probability rather than an estimate. The loop rolls the rewards in their configured order, awards each name at most once, stops at the chest's item count or after 10 passes, and adds the Treasure Hunter bonus to relic rolls on the Buried Treasure Chest.

#### Scenario: Two pages show the same chest reward

- **WHEN** an item page and its chest's page both show the item's chance from that chest at Treasure Hunter 0
- **THEN** both show the same value

### Requirement: Progression facts are read, not typed

A page that states the level cap, the veteran point cap or a class's attribute gains SHALL read them from the exported progression data.

#### Scenario: A game update raises the level cap

- **WHEN** the export carries a new level cap
- **THEN** the experience page states it without a code change
