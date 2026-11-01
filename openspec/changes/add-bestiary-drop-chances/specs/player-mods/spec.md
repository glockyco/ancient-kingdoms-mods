# Spec Delta

## MODIFIED Requirements

### Requirement: Bestiary pages list every drop

The page SHALL show every drop the game lists for the monster. When a monster has more drops than the page's 12 slots, the icons SHALL shrink so that all drops fit in the loot area, in the game's drop order. While drop chances are on, an item the game lists several times SHALL show in one slot, at the position of its first entry.

#### Scenario: Boss with 17 drops

- **WHEN** the player opens the page of a boss with 17 listed drops
- **THEN** all 17 items appear, and each can be hovered for its tooltip

#### Scenario: An item listed twice with chances on

- **WHEN** drop chances are on and a boss's table lists the same item twice
- **THEN** the item appears once, where its first entry stands
