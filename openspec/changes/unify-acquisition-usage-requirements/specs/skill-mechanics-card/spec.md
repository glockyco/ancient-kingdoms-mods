## ADDED Requirements

### Requirement: Caster contexts follow explicit skill membership

Mechanics contexts and caster counts SHALL read actual skill memberships by canonical identity, preserving relevant order and initial-rank semantics. Counts SHALL distinguish distinct casters from repeated entries. NPC membership SHALL NOT disappear because a display object is compared with an identifier. NPC detail and skill consumers SHALL use the same membership facts.

#### Scenario: A skill has only NPC casters

- **WHEN** published NPCs explicitly use a skill that no monster uses
- **THEN** the NPC caster context is present
- **AND** its mechanics example is not omitted because the monster count is zero

#### Scenario: Ordered membership is projected for display

- **WHEN** an NPC's ordered skill IDs become display entries with names
- **THEN** caster counts still resolve each canonical skill identity
- **AND** list order and the applicable initial-rank rule remain intact

#### Scenario: One NPC repeats a skill entry

- **WHEN** an NPC's authored list contains the same skill more than once
- **THEN** its ordered memberships remain represented
- **AND** it contributes one distinct NPC to that skill's caster count

#### Scenario: A previously hidden guard has a real case

- **WHEN** normalized NPC membership includes a kind of skill that an existing mechanics guard does not support
- **THEN** that guard remains effective
- **AND** a false zero caster count does not suppress it
