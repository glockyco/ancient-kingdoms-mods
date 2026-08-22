## Purpose

Defines what the build guarantees about the artifacts it publishes: that unchanged input produces unchanged output, and that a step which only reads the data publishes nothing.

## ADDED Requirements

### Requirement: A build is reproducible

Building twice from the same export and the same configuration SHALL produce the same published values. A value that is estimated SHALL be estimated from a fixed starting point, and that starting point SHALL NOT depend on the order in which entities are processed.

Rationale: drop chances currently move by up to 0.0032 between builds with no data change. A reader cannot tell a real change from noise, and a comparison against a recorded baseline reports differences that mean nothing.

#### Scenario: Unchanged input

- **WHEN** the export and the configuration are unchanged
- **THEN** a second build publishes the same values as the first

#### Scenario: An estimate is reported as an estimate

- **WHEN** a published value comes from a simulation rather than a calculation
- **THEN** its name and its description say that it is an estimate

#### Scenario: One entity changes

- **WHEN** the input of one estimated entity changes
- **THEN** the published values of the other entities are unchanged

### Requirement: Recording an asset is separate from publishing it

The build SHALL record a visual asset in the database and publish its file as two separate steps. A caller that needs the recorded manifest SHALL be able to obtain it without writing any file.

Rationale: the two were one step, so a read-only verification republished six image files that redaction had deleted. It also spent 126 seconds encoding images into a temporary directory in order to read database rows.

#### Scenario: A recomputation publishes nothing

- **WHEN** a command recomputes decisions from the export without building the site
- **THEN** the published image set is unchanged
- **AND** no image is encoded

#### Scenario: A build publishes the files

- **WHEN** the build runs
- **THEN** every recorded asset has its file published

### Requirement: Encoding settings are chosen against measured cost

An encoding setting SHALL be justified by a measured effect on the published output. A setting that increases build time without a measurable benefit SHALL NOT be used.

Rationale: the slowest lossless setting cost 125 seconds per build and produced output about 1.3 percent smaller than a setting 27 times faster.

#### Scenario: A setting is changed

- **WHEN** an encoding setting changes
- **THEN** the change records the measured effect on encode time and on output size

### Requirement: Published output is stable across a run

For a fixed toolchain, encoding the same source with the same settings SHALL produce the same bytes.

Rationale: the encoder is already deterministic, and the dependency on the pinned image library is not obvious to a reader. Stating the guarantee makes an upgrade that breaks it a visible event rather than a silent one.

#### Scenario: The same source is encoded twice

- **WHEN** one source image is encoded twice with the same settings
- **THEN** both results hold the same bytes
