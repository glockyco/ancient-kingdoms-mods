## Purpose

Lets players move from a gathering resource or crafted item to the profession that uses or produces it, without claiming ordinary crafting is a profession.

## ADDED Requirements

### Requirement: Gathering resources link to their professions

A resource detail page SHALL link each applicable gathering profession from its resource classification: plant to Herbalism, mineral to Mining, fishing spot to Fishing, and Radiant Spark to Radiant Seeker. Links SHALL remain available without JavaScript.

#### Scenario: Player opens a plant

- **WHEN** a player opens a resource classified as a plant
- **THEN** the resource header links to `/professions/herbalism`

#### Scenario: Player opens a mineral

- **WHEN** a player opens a resource classified as a mineral
- **THEN** the resource header links to `/professions/mining`

#### Scenario: Player opens a spark

- **WHEN** a player opens a resource classified as a Radiant Spark
- **THEN** the resource header links to `/professions/radiant_seeker`

#### Scenario: Player opens an existing fishing spot

- **WHEN** a player opens a fishing spot
- **THEN** its existing link to `/professions/fishing` remains available

### Requirement: Crafted item links follow the producing recipe

A crafted item detail page SHALL link to Alchemy when an alchemy recipe makes the item, Scroll Mastery for a scribing recipe, and Cooking for a crafting recipe at a cooking station. Plain crafting SHALL not produce a profession link. Multiple applicable recipes SHALL show every distinct applicable profession once.

#### Scenario: Player opens an alchemy output

- **WHEN** a player opens an item with an alchemy recipe source
- **THEN** the page links to `/professions/alchemy`

#### Scenario: Player opens a scribed scroll

- **WHEN** a player opens an item with a scribing recipe source
- **THEN** the page links to `/professions/scroll_mastery`

#### Scenario: Player opens cooking output

- **WHEN** a player opens an item with a crafting recipe source at a cooking station
- **THEN** the page links to `/professions/cooking`

#### Scenario: Player opens a plain crafted item

- **WHEN** its only recipe sources are plain crafting recipes
- **THEN** no profession link claims that a Crafting profession exists

### Requirement: Profession links preserve item navigation

Adding profession links SHALL not remove links to producing recipes, resource maps, or other contextual destinations.

#### Scenario: Player follows a recipe source

- **WHEN** an item has a producing recipe and a profession link
- **THEN** the recipe link and the profession link both remain available
