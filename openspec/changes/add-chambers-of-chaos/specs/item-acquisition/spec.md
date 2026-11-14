# Spec Delta

## ADDED Requirements

### Requirement: Seal drops use eligible live-level contexts

Private acquisition data SHALL model Seal of Chaos as a separate corpse roll on non-boss elites with live level at least 40 in the normal death path, using exported game-calculated chance. Published elite drops SHALL retain that chance through the existing redacted-item placeholder, not the excluded identity. Provider locations SHALL include only qualifying contexts. Tower deaths SHALL NOT inherit the roll.

#### Scenario: Template level differs from spawn level

- **WHEN** an elite template is level 40 but its live spawn is level 33
- **THEN** that spawn supplies no Seal of Chaos source or source geometry

#### Scenario: An eligible elite dies

- **WHEN** a level 40 non-boss elite reaches the normal player-loot death path
- **THEN** the private acquisition model adds one Seal of Chaos at the exported 1% corpse-roll chance
- **AND** the published elite drop shows "Redacted item" at that chance without the excluded name, icon, link or identifier
- **AND** the native roll remains separate from the template's ordinary loot pool

#### Scenario: Excluded death contexts

- **WHEN** an elite is below 40, is also a boss or belongs to a private Chambers run
- **THEN** that context supplies no seal roll
- **AND** eligible summoned or event elites are not rejected solely because they are not authored spawns

### Requirement: Chaos Tokens are a conditional guardian corpse reward

Private acquisition data SHALL represent Chaos Tokens as a guardian-corpse reward after the preceding chambers and final objective. Published views SHALL retain entry-level/veteran quantity bands, delivery and run-entry cost through existing redacted-item placeholders without excluded identities. The model SHALL NOT create a fixed guardian spawn or ordinary template drop.

#### Scenario: Level 40 entry

- **WHEN** the character enters at level 40 and completes the run
- **THEN** the guardian reward shows a redacted-item placeholder with a uniform quantity of 1 to 2 on the corpse
- **AND** one redacted entry item is consumed at first-chamber entry, not charged again at looting

#### Scenario: Veteran reward boundary

- **WHEN** entry level is at least 50
- **THEN** the redacted guardian reward quantity is 1 to 3 below 100 total veteran points, 2 to 4 at 100 to 199 and 3 to 5 at 200 or more
- **AND** missing character facts show the bands rather than assume zero veteran points

### Requirement: Augment upgrades are canonical inventory transformations

The shared acquisition model SHALL support an `augment_upgrade` method for each valid next-quality link and catalyst definition. Each execution SHALL consume one catalyst and one eligible loose, unaugmented augment and yield one next-quality augment in inventory. Eligibility and destination space SHALL follow the game, without a vendor, recipe or map point being invented for the transformation.

#### Scenario: Upgrading an Epic augment

- **WHEN** an Epic augment has a valid exported link to its Legendary version
- **THEN** that Legendary augment has an upgrade source costing one catalyst and one Epic augment
- **AND** the method records both costs together and yields exactly one Legendary augment

#### Scenario: A target is socketed, augmented or already Legendary

- **WHEN** the requested instance is not a loose inventory augment, carries an augment itself or is already Legendary
- **THEN** the method does not claim that instance is eligible
- **AND** a missing instance fact remains unknown rather than an unconditional success

#### Scenario: Output needs space

- **WHEN** consumed input slots, a compatible output stack and empty inventory slots cannot accommodate the result
- **THEN** the method's requirements explain the space refusal
- **AND** it does not claim that a separate empty slot is always required when a consumed slot or stack is usable

### Requirement: The Chambers reward chain stays connected

Private source relationships SHALL preserve the guardian, Chaos Token, merchant offer, Chaos Catalyst and augment upgrade chain. Public source and use views SHALL preserve permitted action and cost facts through existing redacted placeholders without excluded identities. Upgrade links SHALL NOT create acquisition roots. Server and browser consumers SHALL agree on method facts.

#### Scenario: Inspecting a Legendary augment source

- **WHEN** the covered export has twelve Legendary augments whose only sources are upgrade links
- **THEN** all twelve have their valid upgrade source
- **AND** expansion reaches the predecessor augment and catalyst without claiming a direct monster drop

#### Scenario: Following the catalyst's token cost

- **WHEN** the export lists Chaos Catalyst for 10 Chaos Tokens at Adventurer Quirin, Valthir, Taryn, Argosh and Zion
- **THEN** public purchase sources show a price of 10 "Redacted item" and retain all five providers
- **AND** no excluded currency name, icon, link or identifier appears in the source graph or its payloads
- **AND** the guardian reward retains its conditional quantity through a redacted-item placeholder

#### Scenario: A prerequisite loses its only source

- **WHEN** a catalyst or predecessor augment has no surviving rooted source
- **THEN** an upgrade definition alone does not advertise the result as obtainable
- **AND** source-free upgrade cycles cannot create availability
