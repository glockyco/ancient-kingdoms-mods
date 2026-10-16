## ADDED Requirements

### Requirement: Successful export sessions declare all required runtime outputs

An export SHALL register each required runtime output under one exporter ID and one relative path. A successful session SHALL declare each file's exporter ID, path, byte size, top-level record count, and SHA-256 digest. It SHALL record the game version, build provenance, and selected locale. Referenced runtime images SHALL be included in the session's integrity check. Curated input files SHALL NOT be registered as runtime outputs.

#### Scenario: A complete export runs

- **WHEN** all registered exporters succeed and all declared files pass integrity checks
- **THEN** a session manifest lists every required runtime file and its verified content
- **AND** no output path or exporter ID has more than one owner

#### Scenario: A declared file is missing or changed

- **WHEN** a required file is missing or its contents disagree with its manifest entry
- **THEN** the session is refused as incomplete

#### Scenario: A file remains from a removed exporter

- **WHEN** a prior directory still holds `doors.json` or `interactive_objects.json` after those exporters are removed
- **THEN** neither file appears in the current session's artifact collection
- **AND** the collector reports only paths owned by the current manifest

### Requirement: Export promotion is atomic for a complete session

An export SHALL write a fresh staging session. It SHALL expose a new immutable session only after every required exporter and integrity check succeeds. A failed run SHALL leave the previous promoted session unchanged.

#### Scenario: One exporter fails after other exporters wrote files

- **WHEN** a required exporter fails during a new run
- **THEN** the new run is not promoted
- **AND** the last promoted session remains byte-for-byte unchanged

#### Scenario: A successful session is promoted

- **WHEN** all required exporters and output checks succeed
- **THEN** downstream readers can select exactly that completed session
- **AND** no later export mutates any file inside it
