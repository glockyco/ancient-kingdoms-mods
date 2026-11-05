# item-augment-marks Specification

## Purpose
Pocket Compendium shows on each item slot which augment the item carries, so players see their augments without hovering over every piece.

## Requirements

### Requirement: An augmented item's slot shows its augment

While augment marks is on, every slot in the inventory window, including its equipment slots, the combined backpack, the bank and the house chest SHALL show, for an item that has an augment, the augment's icon in a small frame in the slot's top-right corner. The frame SHALL take the augment's quality colour as the game colours items: green for Uncommon, blue for Magic and purple for Epic.

#### Scenario: A Great augment on worn armour

- **WHEN** the player wears a chestplate with a Great Titanite Shard and opens the inventory
- **THEN** the chest slot shows the Titanite Shard's icon in a purple frame in its top-right corner

#### Scenario: Gear in the bank

- **WHEN** the player opens the bank, where a ring with a Small Mana Shard is stored
- **THEN** the ring's slot shows the Mana Shard's icon in a green frame

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
