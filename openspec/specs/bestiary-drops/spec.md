# bestiary-drops Specification

## Purpose
Defines what a Bestiary page shows about each drop beyond the item itself, so a player can choose what to farm: the chance per kill, a Fatecharm's effect on it, and whether the player has found the drop.

## Requirements

### Requirement: Each drop shows its chance per kill

While drop chances are on, each drop on a Bestiary page SHALL show its chance per kill. The chance SHALL equal the website's chance per kill for the same monster and item, which counts a boss's guaranteed equipment piece. It SHALL be marked as a chance per kill, because everyone who may loot a corpse shares one roll.

#### Scenario: Boss equipment

- **WHEN** the player opens Xylevis's page, whose table lists Amulet of the False King at 30%
- **THEN** the amulet's slot shows 49.2% per kill, as the website does, because the boss's guaranteed equipment piece raises it

#### Scenario: Elite drop

- **WHEN** an elite's table lists an item at 15%
- **THEN** the page shows 15% per kill, because elites have no guaranteed piece

### Requirement: A Fatecharm's effect shows on the drops it improves

A drop whose chance per kill the zone's Fatecharm raises SHALL carry that Fatecharm's icon. While the Fatecharm is in the player's main inventory, the first 24 slots, the icon SHALL be lit and the slot SHALL show the raised chance. Otherwise the icon SHALL be dimmed and the slot SHALL show the chance without it. Its tooltip SHALL give both chances, name the Fatecharm, and say that a kill uses it up.

#### Scenario: The charm in the main inventory

- **WHEN** the Catacombs Fatecharm is in the player's main inventory and the player opens Captain Aerendyl's page
- **THEN** his three equipment drops show their raised chances under a lit icon, and a Fatecharm in the backpack shows the chances without it under a dimmed icon

#### Scenario: A dungeon boss

- **WHEN** the player hovers a boss's equipment drop in a dungeon with an Ice Fatecharm
- **THEN** the tooltip gives both chances, names the Ice Fatecharm and says that the kill uses it up

#### Scenario: A boss outside a dungeon

- **WHEN** the player opens Xylevis's page in Crescent Coast, which has no Fatecharm
- **THEN** no drop carries a Fatecharm icon

### Requirement: Chances read true at the extremes

A chance above zero SHALL never read as 0%, and a chance below certainty SHALL never read as 100%.

#### Scenario: A rare drop

- **WHEN** a drop's chance per kill is 0.04%
- **THEN** the page shows a value above zero

### Requirement: Each item shows once

While drop chances are on, an item the monster's table lists several times SHALL show in one slot with the chance of at least one copy, and its tooltip SHALL say how many copies one kill can give.

#### Scenario: An item listed twice

- **WHEN** a boss's table lists the same item twice
- **THEN** the page shows one slot for it with the chance of at least one copy

### Requirement: Found drops are marked

A drop the game records as found SHALL be marked on the page. The game's record holds the drops that any character in the save has found. While undiscovered drops show, a drop not found yet SHALL keep its full colour and its tooltip.

#### Scenario: A drop found earlier

- **WHEN** the player looted Amulet of the False King from Xylevis before and opens his page
- **THEN** the amulet's slot carries the found mark and the drops not found yet do not

### Requirement: Chances can be switched off

The Bestiary pages settings SHALL have a switch for drop chances, on at first start. While it is off, pages SHALL show drops as they do without this capability, and found marks SHALL stay.

#### Scenario: Chances off

- **WHEN** the player switches drop chances off
- **THEN** the drops show without chances and Fatecharm icons, in the game's order with every listed entry

### Requirement: Discovery can be kept

The Bestiary pages settings SHALL have a switch for drops the player has not found, on at first start. While it is off, a drop not found yet SHALL show as the game's black silhouette without its item tooltip, and SHALL keep its chance and Fatecharm icon while chances show. Pages of monsters the player has not discovered SHALL follow the General setting Undiscovered. The Skills panel SHALL keep its own switch.

#### Scenario: Keeping drops hidden

- **WHEN** the player switches off drops not found yet and opens Verdant Glacius's page without having found any of its drops
- **THEN** every drop shows as a black silhouette

#### Scenario: Keeping monsters hidden

- **WHEN** the player switches off Undiscovered in General and opens the page of a monster they have not discovered
- **THEN** the page shows "???" as the game does

### Requirement: Altar rewards say when they drop

A Forgotten Altar elite's page SHALL show each quality of its reward, with the reward's chance per kill, and each one's tooltip SHALL say which level and veteran points of the player who starts the altar give that quality.

#### Scenario: An Epic reward

- **WHEN** the player hovers Vyriss the Withered's Epic Taloncrest Pendant
- **THEN** the tooltip says it drops only when the player who starts the altar is level 50 with 0 to 99 veteran points

### Requirement: A kill that uses a Fatecharm is announced before it

While a living dungeon boss is the target and its zone's Fatecharm is in the player's main inventory, the game's target frame SHALL show that Fatecharm beside the boss's level, and its hover SHALL say that the kill uses it up and how to keep it. Where the Fatecharm raises none of the boss's drops, the mark SHALL show in red and its hover SHALL say so. The warning SHALL be a feature of its own with its own switch, so it works with the Boss skills panel off.

#### Scenario: A boss the charm does not help

- **WHEN** the player targets Archivist Phaendar with the Archives Fatecharm in the main inventory
- **THEN** the target frame shows the charm in red, and its hover says the charm raises none of the drops

### Requirement: The Bestiary's list shows the drops found

While "Drops found" is on, each monster's tile in the Bestiary's list SHALL carry a bar along its top edge, filled by the share of the monster's drops that the game records as found, counted over the drops its Bestiary page shows. The bar SHALL be gold once every drop is found. A tile whose monster has no drop found SHALL show no bar.

#### Scenario: Some drops found

- **WHEN** the game records 2 of the 5 drops Archivist Phaendar's page shows as found
- **THEN** his tile carries a bar filled two fifths of its width

#### Scenario: Every drop found

- **WHEN** the game records all 4 of Gukavep's drops as found
- **THEN** his tile carries a full gold bar

### Requirement: A tile's hover counts the drops found

While "Drops found" is on, hovering a monster's tile in the Bestiary's list or selecting it with a gamepad SHALL show, in the game's tooltip frame, the monster's name and then "2 of 5 drops found", or "All 4 drops found" once every drop is found. While "Undiscovered monsters" is off, a monster without an entry in the game's Bestiary record SHALL show no hover.

#### Scenario: Hovering a monster with drops to find

- **WHEN** the player hovers Archivist Phaendar's tile with 2 of his 5 drops found
- **THEN** the hover reads "Archivist Phaendar" over "2 of 5 drops found"

#### Scenario: Hovering a complete monster

- **WHEN** the player hovers Gukavep's tile with all 4 of his drops found
- **THEN** the hover reads "Gukavep" over "All 4 drops found"
