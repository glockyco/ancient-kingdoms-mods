## Purpose

Defines how declared datasets reach SQLite exactly once in dependency order while retaining explicit loaders for data that needs custom composition or publication.

## ADDED Requirements

### Requirement: Registered datasets load in a checked order

The pipeline SHALL use one ordered dataset catalog for loading. Each entry SHALL declare its required inputs, output table ownership, and prerequisites. It SHALL reject duplicate ownership, a missing prerequisite, or a prerequisite listed after its dependent dataset.

#### Scenario: A prerequisite is listed after a dependent dataset

- **WHEN** catalog validation finds a prerequisite later in the ordered catalog
- **THEN** the build fails before loading the dependent dataset

#### Scenario: A dataset has no registered owner

- **WHEN** a schema content table is expected to receive exported rows but has no dataset owner
- **THEN** registration validation reports the table rather than silently leaving it empty

### Requirement: Simple datasets require only a descriptor

A simple dataset SHALL have one required JSON file, one validated model, one row per element, and one output table. A registered simple dataset SHALL load through the common validated insertion path without a new hand-ordered build call. Datasets with derived rows, junctions, multiple inputs or outputs, or file publication SHALL use explicit custom loaders.

#### Scenario: A simple dataset is added

- **WHEN** its file, model, table, and prerequisites are declared in the catalog
- **THEN** the build loads and validates every row without a second registration site

#### Scenario: An input file is missing

- **WHEN** a declared required input does not exist
- **THEN** the build fails and names the input rather than treating it as an empty dataset

### Requirement: Read-only composition does not publish files

An invocation without an output directory SHALL build the same database rows as a publishing invocation. It SHALL NOT encode or write public artwork, and it SHALL NOT mutate input files.

#### Scenario: A redaction check loads data without publication

- **WHEN** a scratch load runs without a public output directory
- **THEN** all required database records are available for inspection
- **AND** the public image set and source files remain unchanged
