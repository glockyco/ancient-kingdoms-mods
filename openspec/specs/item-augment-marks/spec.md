# item-augment-marks Specification

## Purpose
Pocket Compendium shows on each item slot which augment the item carries, so players see their augments without hovering over every piece.

## Requirements

### Requirement: An augmented item's slot shows its augment

While augment marks is on, every slot that draws an augmentable item's icon SHALL show, for an item that has an augment, the augment's icon in a small frame in the slot's top-right corner. This covers the inventory window with its equipment slots, the combined backpack, the bank, the house chest, the equipment window of a mercenary or an inspected player, both offers of a player trade, the Augmenter's list, a merchant's sell, buyback and repair lists, an essence trader's list, the Sacrifice shrine's item list and offerings, and the skillbar. The icon SHALL fill the frame with its visible part, leaving out the transparent padding of the game's icon. The frame SHALL take 22 of an inventory slot's 58 units and the same share of any other slot. The frame SHALL take the augment's quality colour as the game colours items: green for Uncommon, blue for Magic, purple for Epic and orange for Legendary.

#### Scenario: A Great augment on worn armour

- **WHEN** the player wears a chestplate with a Great Titanite Shard and opens the inventory
- **THEN** the chest slot shows the Titanite Shard's icon in a purple frame in its top-right corner

#### Scenario: Gear in the bank

- **WHEN** the player opens the bank, where a ring with a Small Mana Shard is stored
- **THEN** the ring's slot shows the Mana Shard's icon in a green frame

#### Scenario: A flat icon fills the mark

- **WHEN** a ring carries a Mana Shard, whose icon fills 25 by 16 of its 32 pixels
- **THEN** the shard spans the width of the mark

#### Scenario: A mercenary's gear

- **WHEN** the player opens the equipment window of a mercenary whose ring carries a Mana Shard
- **THEN** the ring's slot shows the Mana Shard's icon in a blue frame

#### Scenario: A merchant's list

- **WHEN** the player opens a merchant's sell list while carrying a ring with a Great Mana Shard
- **THEN** the ring's entry shows the Mana Shard's icon in a purple frame

#### Scenario: Gear on the skillbar

- **WHEN** the skillbar holds a ring whose first copy in the inventory carries a Small Mana Shard
- **THEN** the skillbar slot shows the Mana Shard's icon in a green frame sized to the skillbar slot

### Requirement: Only augments get a mark

A slot whose item has no augment, or whose stored name is not an augment, such as a pet's name, SHALL show no mark.

#### Scenario: An item without an augment

- **WHEN** the player's pants carry no augment
- **THEN** the pants' slot shows no mark

### Requirement: Marks follow the items

A mark SHALL follow its item as it moves between slots and windows, and SHALL disappear when the augment is removed or the item leaves the slot.

#### Scenario: Removing an augment

- **WHEN** the Augmenter removes the augment from the player's sword
- **THEN** the sword's slot shows no mark

#### Scenario: Moving an item

- **WHEN** the player drags an augmented chestplate from the inventory into the bank
- **THEN** the mark shows on the bank slot and no longer on the inventory slot

### Requirement: Switching augment marks off removes them

Switching augment marks off SHALL remove every mark it drew.

#### Scenario: Switching off

- **WHEN** the player switches augment marks off with the inventory open
- **THEN** no slot shows a mark
