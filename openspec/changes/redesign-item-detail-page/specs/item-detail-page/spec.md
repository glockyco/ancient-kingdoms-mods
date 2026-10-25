# Spec Delta

## Purpose

Defines what an item detail page shows and in what order, so a player can see what an item is, where to get it and what it is for, with each fact stated once and no layout gaps.

## ADDED Requirements

### Requirement: The page opens with the tooltip beside the item's facts

An item page SHALL open with the in-game tooltip and one list of the item's facts side by side, both ending at the same height. An item without a tooltip SHALL show the fact list across the full width. On a narrow screen the tooltip SHALL come first and the fact list below it.

#### Scenario: A weapon page on a desktop screen

- **WHEN** a player opens Abyssal Tidehammer on a desktop screen
- **THEN** its tooltip and its fact list share the first row
- **AND** both end at the same height

#### Scenario: An item without a tooltip

- **WHEN** a player opens an item that has no tooltip, such as Cinderchant Armor Bonus Set
- **THEN** the fact list spans the full width and no empty tooltip column is reserved

#### Scenario: A phone screen

- **WHEN** a player opens an item page on a phone
- **THEN** the tooltip comes first, then the fact list, then the remaining sections in the desktop order

### Requirement: A stat is shown once

A stat the tooltip lists, through its placeholder or as a typed stat line with the stat's exact value, SHALL be shown only by the tooltip. Every other nonzero stat SHALL be listed in the fact list under a heading stating that the tooltip's stat list does not include it. An item without a tooltip SHALL list all its stats, except an armor set bonus entry, whose stats are the bonuses its set section shows.

#### Scenario: A stat the tooltip describes only in words

- **WHEN** a player opens Cinderchant Chestplate, whose tooltip describes Cinderchant Tempo without a number and whose Haste is 10%
- **THEN** the fact list shows Haste +10% under the heading for stats the tooltip's stat list does not include

#### Scenario: A stat the tooltip omits

- **WHEN** a player opens Cindersoul Sash, whose tooltip does not mention its 250 Mana
- **THEN** the fact list shows Mana +250

#### Scenario: Every stat is in the tooltip

- **WHEN** a player opens Abyssal Tidehammer, whose template has a placeholder for each of its stats
- **THEN** the page lists none of those stats outside the tooltip

#### Scenario: A stat line typed into the template

- **WHEN** a player opens Great Amethyst of Warding, whose template types "+10 Magic Resist" and whose Magic Resist is 10
- **THEN** the page lists no Magic Resist outside the tooltip

#### Scenario: A number inside an effect's description

- **WHEN** a player opens Advisor Robe, whose tooltip says its effect increases magic and poison resistance by 15
- **THEN** the fact list shows Magic Resist +15 and Poison Resist +15

### Requirement: Unused fields are not presented as stats

A field the game never applies to the item SHALL NOT be shown. A pickaxe, shovel or fishing rod SHALL NOT show an attack delay, because those tools cannot be equipped as weapons.

#### Scenario: A fishing rod

- **WHEN** a player opens Bamboo Fishing Rod
- **THEN** the page shows no Attack Delay

### Requirement: Sections follow the opening row in a fixed order at full width

After the opening row, every section SHALL span the full width, one below another. Sections describing what the item does SHALL come first, then sources, then uses. No two sections SHALL share a row.

#### Scenario: A material with sources and uses

- **WHEN** a player opens Arcane Essence
- **THEN** Dropped by appears above Used in Recipes, which appears above Required for Quests
- **AND** each section spans the full width

#### Scenario: A consumable

- **WHEN** a player opens Cold Dwarven Beer
- **THEN** Use Effects appears above Sold by

### Requirement: Relationship sections state their size

Each section listing sources or uses SHALL show its number of entries in its title.

#### Scenario: A treasure map

- **WHEN** a player opens Broken Map
- **THEN** the Dropped by title states how many monsters drop it

### Requirement: Long relationship lists are paged

A relationship list SHALL show at most ten rows at a time and offer the remaining rows on further pages. The first page SHALL be present in the page's static HTML. A list of ten rows or fewer SHALL show no paging controls.

#### Scenario: More than ten sources

- **WHEN** a player opens an item with more than ten drop sources
- **THEN** the first ten rows show, with controls to reach the rest

#### Scenario: Ten or fewer sources

- **WHEN** an item has at most ten drop sources
- **THEN** all rows show and no paging controls appear

### Requirement: Rows link to the map where the map can show them

A relationship row SHALL offer a map link when the map can show its monster, NPC, altar, chest, portal, gathering resource or quest for this item, using the same visible locations as the item's own map link. A row whose locations are suppressed or absent SHALL offer no map link.

#### Scenario: A monster in a mapped zone

- **WHEN** a player reads Dropped by on Arcane Essence
- **THEN** each monster row offers a map link

#### Scenario: A monster in a position-suppressed zone

- **WHEN** a player reads Dropped by on Broken Map
- **THEN** the rows for monsters in Temple of Valaark offer no map link

### Requirement: Drop rows name their zone

Each drop row SHALL name the zones of the placements that carry the drop, so that two chances for one monster in different zones are attributed to their zones. A drop with no placed source SHALL name no zone rather than a guessed one.

#### Scenario: One monster, two zones, two chances

- **WHEN** a player opens Black Pearl, which Fire Templars drop at 10% in Despair and at 1% in Molten Sanctuary
- **THEN** the 10% row names Despair and the 1% row names Molten Sanctuary

#### Scenario: A drop limited to one of a monster's zones

- **WHEN** a player opens Ashen Key Shard, which Fire Templars drop only in Molten Sanctuary
- **THEN** its Fire Templar row names Molten Sanctuary only

### Requirement: Set pieces state their set once outside the tooltip

A set piece SHALL describe its set in one section that links the pieces, the set bonuses and the set's own page. The fact list SHALL NOT repeat the set as a separate fact.

#### Scenario: A set piece

- **WHEN** a player opens Cinderchant Boots
- **THEN** one section names Cinderchant Regalia with links to its pieces and bonus skills
- **AND** the fact list has no Set Bonus row

### Requirement: Armor set bonus entries present a set, not an augment

An armor set bonus entry SHALL NOT show a quality badge, augment socketing rules or a no-known-source notice. It SHALL show the set's pieces and bonuses.

#### Scenario: A set bonus entry

- **WHEN** a player opens Cinderchant Armor Bonus Set
- **THEN** the page shows its pieces and bonuses
- **AND** shows no quality badge, no augment rules and no source notice

### Requirement: A recipe item names what it teaches

A recipe item SHALL link the item its recipe makes, with the recipe's level and materials.

#### Scenario: A potion recipe

- **WHEN** a player opens Cold Resistance Potion Recipe
- **THEN** the page links Cold Resistance Potion with the recipe's level and materials

### Requirement: Links name their destination

Every link on the page SHALL have visible text naming its destination. A link SHALL NOT be an icon alone.

#### Scenario: A recipe that uses the item

- **WHEN** a player reads Used in Recipes on Arcane Essence
- **THEN** the link to the Magic Resistance Potion recipe is named in text

### Requirement: The page does not repeat a section's explanation

A mechanics note SHALL NOT restate an explanation another section of the same page gives.

#### Scenario: A socketable augment

- **WHEN** a player opens Great Amethyst of Warding, which has a How to Use section on socketing
- **THEN** no mechanics note repeats the socketing explanation
