## MODIFIED Requirements

### Requirement: An augmented item's slot shows its augment

While augment marks is on, every slot in the inventory window, including its equipment slots, the combined backpack, the bank, the house chest and the active mercenary's equipment window SHALL show, for an item that has an augment, the augment's icon in a small frame in the slot's top-right corner. The icon SHALL fill the frame with its visible part, leaving out the transparent padding of the game's icon, so a flat icon such as the Mana Shard's reads as clearly as the others. The frame SHALL take the augment's quality colour as the game colours items: green for Uncommon, blue for Magic, purple for Epic and orange for Legendary.

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
