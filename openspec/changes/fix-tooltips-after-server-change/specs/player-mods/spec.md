## ADDED Requirements

### Requirement: Mod hovers leave the game's tooltip alone

Pocket Compendium SHALL show the hover texts of its own elements in a tooltip of its own that looks like the game's tooltip. It SHALL NOT move, show or change the game's tooltip object. The game's own items, including the Bestiary page's drop slots, SHALL keep the game's tooltip.

#### Scenario: Changing servers after hovering the boss list

- **WHEN** the player hovers a boss list row, logs out, enters a world again and hovers a Bestiary drop
- **THEN** the drop shows its full item tooltip

#### Scenario: Hovering a boss list row

- **WHEN** the player hovers Ancient Cyclops's row
- **THEN** a tooltip in the game's style beside the row gives its respawn rule
