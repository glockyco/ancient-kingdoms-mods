## MODIFIED Requirements

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
