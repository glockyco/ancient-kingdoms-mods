## Purpose

Define how the compendium identifies Halloween and the Winter Festival, which game content each season gates, and how that content is presented, labeled and linked across pages, lists, the map and the Seasonal Events page.

## ADDED Requirements

### Requirement: Seasons follow the game's dates

The compendium SHALL describe each season by the game's UTC date window with both endpoints included: Halloween from October 19 to November 1 and the Winter Festival from December 19 to January 6. It SHALL state that a season can begin or end up to an hour after its date boundary, because the game checks the date once an hour.

#### Scenario: The Winter Festival spans the new year

- **WHEN** a page states when the Winter Festival runs
- **THEN** it gives December 19 to January 6 as one window
- **AND** it does not split the window at the year boundary

### Requirement: Seasonal gates come from game data

A season SHALL gate exactly the content the game gates: monsters and NPCs the game marks as seasonal, the seasonal stock of repair merchants, drops of seasonal monsters, quests offered only by seasonal NPCs, and items whose every acquisition depends on that content. An entity's name SHALL NOT make it seasonal.

#### Scenario: A costume is named after a season

- **WHEN** a costume named after Christmas is sold all year
- **THEN** it carries no season

#### Scenario: A quest is completed at a year-round NPC

- **WHEN** a Winter Festival quest is completed at an NPC who is present all year
- **THEN** the quest is labeled with the Winter Festival because only a seasonal NPC offers it
- **AND** the completing NPC is not labeled as seasonal

#### Scenario: An item belongs to two seasons

- **WHEN** an item can be bought during Halloween and during the Winter Festival
- **THEN** it is labeled with both seasons

### Requirement: Gated content names its season wherever it appears

Every surface that shows a seasonal entity, method or item SHALL name the season and link to that season on the Seasonal Events page. This includes detail pages, list rows, map markers' tooltips and popups, search results and meta descriptions.

#### Scenario: A Halloween drop on an item page

- **WHEN** an item page lists Pumpkin Head as a source
- **THEN** the row names Halloween and links to the Halloween section

#### Scenario: A seasonal monster in a zone table

- **WHEN** a zone page lists Witch among its monsters
- **THEN** the row names Halloween

### Requirement: Seasonal content stays visible all year

Seasonal entities SHALL appear in their normal lists and marker groups in every season, with their season named. A page SHALL NOT hide or show seasonal content based on the visitor's current date.

#### Scenario: The map outside the Winter Festival

- **WHEN** a visitor opens the map in July with quest givers shown
- **THEN** Santa Claus's marker is present
- **AND** its tooltip and popup say that he is there only during the Winter Festival

### Requirement: Zone level statistics describe year-round play

A zone's level range and median SHALL exclude spawns of seasonal monsters. Zone pages SHALL still list seasonal monsters and NPCs, with their season named, in a section about seasonal events in that zone.

#### Scenario: Halloween spawns in The Lone-lands

- **WHEN** The Lone-lands' median level is computed
- **THEN** Pumpkin Head and Witch spawns do not contribute
- **AND** the zone page lists both monsters in its seasonal section

### Requirement: Repair merchants show seasonal stock

An NPC page and its map popup SHALL list the NPC's seasonal stock separately from its year-round stock, naming each offer's season, price and currency in the form the surface uses for year-round stock. Offers of the same item in two seasons SHALL remain two rows.

#### Scenario: A firework pack in both seasons

- **WHEN** a repair merchant sells Pack 10 Skyflares during Halloween and during the Winter Festival
- **THEN** the seasonal stock lists it once for each season with its price

### Requirement: Lists filter by season

The monster, NPC, quest and item lists SHALL label seasonal rows and SHALL offer a filter that selects the content of one season.

#### Scenario: Filtering items by Halloween

- **WHEN** a visitor filters the item list to Halloween
- **THEN** the list shows the Halloween treats, costumes, tokens and fireworks
- **AND** it does not show year-round items with seasonal names

### Requirement: Quest pages state seasonal availability and repetition

A seasonal quest's page SHALL state that it can be accepted only during its season. A repeatable quest's page SHALL state that it can be accepted again 8 hours after it is completed.

#### Scenario: Keeping the Winter Peace

- **WHEN** a visitor opens Keeping the Winter Peace
- **THEN** the page names the Winter Festival and links to it
- **AND** it says the quest can be repeated 8 hours after completion

### Requirement: Event buffs state how they are granted

The page of a season's Double XP buff SHALL state that every online player has the buff while the season runs. It SHALL NOT present the buff as learned or ranked, and SHALL NOT present the buff's refresh interval as its duration.

#### Scenario: Halloween Event skill page

- **WHEN** a visitor opens the Halloween Event skill
- **THEN** the page says every player has it during Halloween
- **AND** it shows no learning rank or one-hour duration

### Requirement: The Seasonal Events page answers player questions

The Seasonal Events page SHALL state, from the shared data: each season's dates; what Double XP covers and that it does not stack; where seasonal monsters spawn by zone with level ranges, spawn hours in game and real time, and currency drop chances; where the seasonal NPC stands and each quest's objective, recommended level, rewards and repeat interval; and every seasonal shop item with its effect and price. A fact shared by both seasons SHALL appear once.

#### Scenario: Choosing where to hunt

- **WHEN** a level 20 player reads the Halloween section
- **THEN** they can find which zones have Halloween monsters near level 20 and how many spawn there

#### Scenario: Fireworks are sold in both seasons

- **WHEN** the page lists the firework packs
- **THEN** they appear once, stating that both seasons sell them for Festival Tokens
