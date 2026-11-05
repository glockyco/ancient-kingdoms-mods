## MODIFIED Requirements

### Requirement: Alerts use the game's message

When a watched monster spawns, the mod SHALL raise the game's own important message and chat line naming it. While the General setting Undiscovered monsters is off, a watched monster the player has not discovered SHALL be named ??? in its alert, as on every other surface. A monster that is not watched SHALL NOT raise an alert.

#### Scenario: Watched boss spawns

- **WHEN** watched Xylevis respawns
- **THEN** the game's important message band and a chat line announce it

#### Scenario: Watched undiscovered monster spawns while hidden

- **WHEN** Undiscovered monsters is off and watched Vyriss the Withered, not yet discovered, spawns in Crescent Coast
- **THEN** the chat line reads "??? has spawned in Crescent Coast."
