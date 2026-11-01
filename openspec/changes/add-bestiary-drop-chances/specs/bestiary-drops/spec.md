# Spec Delta

## Purpose

Defines what a Bestiary page shows about each drop beyond the item itself, so a player can choose what to farm: the chance per kill, a Fatecharm's effect on it, and whether the player has found the drop.

## ADDED Requirements

### Requirement: Each drop shows its chance per kill

While drop chances are on, each drop on a Bestiary page SHALL show its chance per kill without a Fatecharm. The chance SHALL equal the website's chance per kill for the same monster and item, which counts a boss's guaranteed equipment piece. It SHALL be marked as a chance per kill, because everyone who may loot a corpse shares one roll.

#### Scenario: Boss equipment

- **WHEN** the player opens Xylevis's page, whose table lists Amulet of the False King at 30%
- **THEN** the amulet's slot shows 49.2% per kill, as the website does, because the boss's guaranteed equipment piece raises it

#### Scenario: Elite drop

- **WHEN** an elite's table lists an item at 15%
- **THEN** the page shows 15% per kill, because elites have no guaranteed piece

### Requirement: A Fatecharm's effect shows on the drops it improves

A drop whose chance per kill the zone's Fatecharm raises SHALL carry that Fatecharm's icon. Its tooltip SHALL give the chance without and with the Fatecharm, name the Fatecharm, and say that a kill uses it up.

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

A drop the game records as found for this character SHALL be marked on the page. A drop not found yet SHALL keep its full colour and its tooltip.

#### Scenario: A drop found earlier

- **WHEN** the player looted Amulet of the False King from Xylevis before and opens his page
- **THEN** the amulet's slot carries the found mark and the drops not found yet do not

### Requirement: Chances can be switched off

The Bestiary pages settings SHALL have a switch for drop chances, on at first start. While it is off, pages SHALL show drops as they do without this capability, and found marks SHALL stay.

#### Scenario: Chances off

- **WHEN** the player switches drop chances off
- **THEN** the drops show without chances and Fatecharm icons, in the game's order with every listed entry

### Requirement: Discovery can be kept

The Bestiary pages settings SHALL have one switch for pages of monsters the player has not discovered and one for drops the player has not found, both on at first start. While the first is off, a monster without an entry in the game's Bestiary record SHALL show as the game shows it. While the second is off, a drop not found yet SHALL show as the game's black silhouette without its item tooltip, and SHALL keep its chance and Fatecharm icon while chances show. The Skills panel SHALL keep its own switch.

#### Scenario: Keeping drops hidden

- **WHEN** the player switches off drops not found yet and opens Verdant Glacius's page without having found any of its drops
- **THEN** every drop shows as a black silhouette

#### Scenario: Keeping monsters hidden

- **WHEN** the player switches off undiscovered monsters and opens the page of a monster they have not discovered
- **THEN** the page shows "???" as the game does
