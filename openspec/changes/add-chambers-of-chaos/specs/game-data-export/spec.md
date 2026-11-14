# Spec Delta

## ADDED Requirements

### Requirement: Chambers definitions come from game configuration

The export SHALL provide the Chambers keeper, seal and reward item identities, monster pool and named encounter groups with guard and optional support identities from game configuration. Required missing or inconsistent references SHALL fail export rather than produce an empty substitute.

#### Scenario: A configured encounter has no support

- **WHEN** an encounter group has guards and no support monster
- **THEN** the export preserves the guards and a nullable support reference
- **AND** it does not invent a support monster

#### Scenario: A required Chambers reference is missing

- **WHEN** the config, keeper, seal, reward, pool or a required group member cannot be resolved
- **THEN** export fails with the affected reference
- **AND** the previous promoted session remains unchanged

### Requirement: Chambers rule values use game calculations

Exported Chambers rules SHALL call the game's static calculations where callable, with deterministic declared input domains. They SHALL cover entry, timing, trial limits, enemy scaling, token rewards and experience. Exact stochastic distributions SHALL retain their rules rather than be inferred from samples. The exporting character and run SHALL NOT select the rule data.

#### Scenario: Exporting with another character

- **WHEN** two characters with different levels and veteran points export the same build
- **THEN** their Chambers definitions and rule tables are identical

#### Scenario: A callable scaling value changes

- **WHEN** the game's Health or Power calculation changes for an exported input
- **THEN** the export records the new calculated value without a handwritten replacement formula

#### Scenario: A requested input is outside the exported domain

- **WHEN** a downstream scaling request is not covered by the declared rule data
- **THEN** it fails explicitly instead of interpolating rounded values or silently clamping to a different input

### Requirement: The Chambers keeper has an explicit role

NPC role data SHALL carry `is_chambers_of_chaos_keeper` from the game's entry flag. The pipeline and website SHALL preserve it in role data, role filters, role bitmasks, search keywords, service descriptions and notable-NPC classification. They SHALL NOT infer it from the NPC's name or proximity.

#### Scenario: Exporting Mordrath

- **WHEN** Mordrath has the Chambers entry flag
- **THEN** its exported and published role identifies it as the Chambers keeper
- **AND** role searches and its description explain that service rather than treating it as a villager

### Requirement: Augment upgrade exports retain valid next-quality links

The export SHALL distinguish catalyst items as `item_type: "augment_upgrade"`. Augments SHALL carry `augment_next_quality_id` for the next augment only when the game permits the upgrade, otherwise null. The pipeline SHALL preserve the link and type, and website type lists SHALL provide a reviewed display label.

#### Scenario: A valid quality transition

- **WHEN** an augment's next-quality reference passes the game's upgrade eligibility check
- **THEN** the export identifies that exact next augment
- **AND** it does not infer a link from matching names

#### Scenario: Legendary or invalid transition

- **WHEN** the augment is already Legendary or its next-quality reference fails the game's check
- **THEN** `augment_next_quality_id` is null
- **AND** downstream consumers create no upgrade method for that input
