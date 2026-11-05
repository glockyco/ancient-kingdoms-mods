## MODIFIED Requirements

### Requirement: Mod hovers leave the game's tooltip alone

Pocket Compendium SHALL show the hover texts of its own elements in a tooltip of its own. Over its own panels and the map, the tooltip SHALL have the panels' look: the boss list, the Boss skills panel, map pins and dungeon cards. Inside the game's windows, the tooltip SHALL copy the game's tooltip frame: the Skills window beside a Bestiary page and the Fatecharm icon on the target frame. It SHALL NOT move, show or change the game's tooltip object. The game's own items, including the Bestiary page's drop slots, SHALL keep the game's tooltip.

#### Scenario: Changing servers after hovering the boss list

- **WHEN** the player hovers a boss list row, logs out, enters a world again and hovers a Bestiary drop
- **THEN** the drop shows its full item tooltip

#### Scenario: Hovering a boss list row

- **WHEN** the player hovers Ancient Cyclops's row
- **THEN** a tooltip in the panels' look gives its respawn rule

#### Scenario: Hovering a Skills window card

- **WHEN** the player hovers Strong Knockback on Ancient Cyclops's Skills window
- **THEN** a tooltip in the game's frame gives the skill's full mechanics
