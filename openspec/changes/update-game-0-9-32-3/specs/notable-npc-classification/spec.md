## MODIFIED Requirements

### Requirement: The export preserves the authoritative classification

The NPC export SHALL publish the game's Notable NPC field as a separate classification. It SHALL NOT infer this classification from an NPC's name, level, services, or faction.

#### Scenario: A Notable NPC is exported

- **WHEN** the game marks an NPC as notable
- **THEN** the exported NPC record marks that NPC as notable

#### Scenario: Archmage Illidan is exported

- **WHEN** the current game data marks Archmage Illidan as notable
- **THEN** the exported NPC record marks Archmage Illidan as notable
- **AND** compendium NPC and map surfaces present the Notable classification

#### Scenario: An ordinary NPC is exported

- **WHEN** the game does not mark an NPC as notable
- **THEN** the exported NPC record marks that NPC as not notable
