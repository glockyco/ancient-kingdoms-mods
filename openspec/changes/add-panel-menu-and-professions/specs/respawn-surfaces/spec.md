## MODIFIED Requirements

### Requirement: Compact style shows portraits with times

The compact style SHALL show one portrait tile per monster with its time or state on a dark band across the tile's bottom and a gold corner for watched monsters. Its header bar SHALL appear only while the pointer is over the panel and SHALL include a button that switches back to the list.

#### Scenario: Switching back

- **WHEN** the player points at a compact panel and clicks its list button
- **THEN** the panel shows the list style

#### Scenario: A light portrait

- **WHEN** Spirit of the Forest waits 3 minutes for its hours in the compact style
- **THEN** its gold "3m" stands on the dark band, readable over the light portrait

## ADDED Requirements

### Requirement: The boss list hides without stopping its tracking

The boss list SHALL show while its switch in the panel menu is on, which it is at first start. Hidden, it SHALL draw nothing, and watched monsters SHALL stay watched and raise their alerts.

#### Scenario: A watched boss spawns while the list is hidden

- **WHEN** the list is hidden and watched Xylevis respawns
- **THEN** the game's message band and chat announce it
