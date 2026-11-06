## ADDED Requirements

### Requirement: Published recipe notes retain their game text

Monster-dropped recipe-note items SHALL remain published with their game text even when that text explains a recipe whose crafting method is redacted.

#### Scenario: A note describes a hidden recipe

- **WHEN** Steel of Ancient Dragons Notes, Valaark Ancient Coin Notes or Divine Essence Notes describe a recipe hidden by configuration
- **THEN** the note's item page keeps its text without publishing the hidden crafting method

### Requirement: Unencounterable escort prefabs stay hidden

The Compassion Escort NPC SHALL remain unpublished because its exported level and Health are prefab values rather than an NPC a player encounters.

#### Scenario: The export includes the escort prefab

- **WHEN** the Compassion Escort NPC appears in exported data
- **THEN** it receives no published NPC page with its prefab stats

### Requirement: Published zone names preserve the zone data

Zone names SHALL retain the spelling in the game's zone data when other in-game displays disagree. The build SHALL NOT override that spelling to resolve the disagreement.

#### Scenario: The minimap uses a different capital letter

- **WHEN** zone data names The Lone-lands and the minimap names The Lone-Lands
- **THEN** the compendium publishes The Lone-lands
