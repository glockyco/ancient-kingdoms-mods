# Spec Delta

## ADDED Requirements

### Requirement: Seal drops come from monster drop tables

Seal of Chaos SHALL reach the acquisition model through the ordinary drop tables of the monsters that name it. Published monster drops SHALL show it as the existing redacted-item placeholder with the authored chance, not the excluded identity. The Chambers rules page SHALL list those monsters with their chances. Tower deaths SHALL NOT drop it.

#### Scenario: An elite that names the seal dies

- **WHEN** a monster whose drop table names Seal of Chaos at 5% dies in the normal player-loot path
- **THEN** the private acquisition model holds Seal of Chaos at 5% in that monster's loot pool
- **AND** the published monster drop shows "Redacted item" at 5% without the excluded name, icon, link or identifier

#### Scenario: The rules page names the sources

- **WHEN** the Chambers rules page is built
- **THEN** it lists every monster whose drop table names the entry item, with its chance, highest first

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
