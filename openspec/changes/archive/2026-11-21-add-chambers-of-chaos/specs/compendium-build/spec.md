# Spec Delta

## ADDED Requirements

### Requirement: Placeless zones retain required shot coverage

A published zone without authored geometry SHALL still require a zone shot with explicit procedural capture mode, run seed, chamber index, trial kind and room-relative camera position. The build SHALL check mode, dimensions, timestamp and image digest. Frames SHALL be reviewed by eye for layout variety, framing and publication safety.

#### Scenario: Valid Chambers zone shot

- **WHEN** a real Chambers capture has valid procedural mode, dimensions, timestamp, image digest and required provenance
- **THEN** the build accepts it without requiring world bounds or a zone trigger
- **AND** it publishes it as the zone's shot through the shared artwork manifest

#### Scenario: Missing procedural evidence

- **WHEN** a placeless-zone capture lacks its seed, chamber index, trial kind or room-relative camera position
- **THEN** the build fails before replacing published outputs

#### Scenario: An ordinary zone uses the procedural mode

- **WHEN** an authored world zone attempts to bypass its normal containment checks with a procedural capture
- **THEN** capture or build validation refuses it
- **AND** existing authored-zone and position-suppressed-zone checks remain intact

### Requirement: Procedural captures preserve a real entered run

Procedural zone capture SHALL require a scratch character that entered through the keeper and owns the loaded chamber. It SHALL frame the live room without teleporting into an unentered zone, creating a showcase room or replacing its environment. It SHALL refuse an expired, changing or mismatched run and restore temporary rendering state without warping into an unloaded room.

#### Scenario: Capturing a live chamber

- **WHEN** the character has entered the Chambers through Mordrath with the required level and seal
- **THEN** capture verifies ownership and readiness before and after readback
- **AND** it preserves the live chamber art and environment

#### Scenario: A run changes during capture

- **WHEN** the run ends or changes chamber before readback completes
- **THEN** no successful capture receipt is written
- **AND** cleanup restores rendering state without restoring obsolete player coordinates

### Requirement: Several procedural layouts have distinct artwork identities

Chambers artwork SHALL include at least three genuinely different generated layouts from real runs, reviewed by eye. One SHALL serve as the zone shot and at least two others as rules-page illustrations. Every illustration SHALL have its own source, framing, provenance and recorded artwork identity, with the same image integrity and redaction rules as the primary shot.

#### Scenario: Publishing multiple chamber illustrations

- **WHEN** three selected live layouts pass validation
- **THEN** the zone shot and two illustration files coexist without overwriting each other
- **AND** consumers read their recorded availability and dimensions

#### Scenario: A source image or receipt changes

- **WHEN** an illustration is missing, has mismatched dimensions or disagrees with its receipt identity or digest
- **THEN** validation fails rather than silently using another image

#### Scenario: Reviewing the selected layouts

- **WHEN** the zone shot and rules illustrations are selected
- **THEN** visual review confirms at least three distinct layouts and suitable framing
- **AND** no withheld challenge content or excluded item name or icon is visible
