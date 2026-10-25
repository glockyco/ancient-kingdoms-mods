## ADDED Requirements

### Requirement: Seasonal definitions do not depend on the active season

The export SHALL record each season's identity, its Double XP buff skill and its shop items from the game's configuration, and each monster's and NPC's season from its definition. These values SHALL NOT depend on whether a season is active while the export runs. A missing season configuration SHALL fail the export.

#### Scenario: Exporting during Halloween

- **WHEN** one build is exported during Halloween and again in July
- **THEN** both exports write the same seasons, buff skills, shop items and actor seasons

#### Scenario: A season's shop list is missing

- **WHEN** the game configuration has no shop list for a season
- **THEN** the export fails and names the missing season list
