## Purpose

Defines what the build guarantees about the artifacts it publishes: that unchanged input produces unchanged output, and that a step which only reads the data publishes nothing.

## Requirements

### Requirement: A build is reproducible

Building twice from the same export and the same configuration SHALL produce the same published values. A value that is estimated SHALL be estimated from a fixed starting point, and that starting point SHALL NOT depend on the order in which entities are processed.

Rationale: chest drop chances moved by up to 0.0032 between builds with no data change, because the simulation drew from an unseeded generator. A reader could not tell a real change from noise, and a comparison against a recorded baseline reported differences that meant nothing.

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

Rationale: the slowest lossless setting cost 126 seconds of a 135 second build and produced output 1.16 percent smaller than a setting that encodes 27 times faster.

#### Scenario: A setting is changed

- **WHEN** an encoding setting changes
- **THEN** the change records the measured effect on encode time and on output size

### Requirement: Published output is stable across a run

For a fixed toolchain, encoding the same source with the same settings SHALL produce the same bytes.

Rationale: the encoder is deterministic, and the dependency on the pinned image library is not obvious to a reader. Stating the guarantee makes an upgrade that breaks it a visible event rather than a silent one.

#### Scenario: The same source is encoded twice

- **WHEN** one source image is encoded twice with the same settings
- **THEN** both results hold the same bytes

### Requirement: Published artwork uses one manifest and path rule

The build SHALL record artwork from game sprites, unlocked achievement images, and derived zone thumbnails in `visual_assets`. Each row SHALL preserve its source path and identity, its published dimensions, and a unique `(domain, entity_id, kind)`. Its public path SHALL be `images/{domain_plural}/{entity_id}/{kind}.webp`, with unchanged, safe identifier and kind segments.

#### Scenario: A source sprite has transparent padding

- **WHEN** the build publishes a sprite whose outer pixels are fully transparent
- **THEN** it trims that padding
- **AND** the manifest dimensions match the published image

#### Scenario: A path contains an unsafe segment

- **WHEN** an entity identifier or artwork kind cannot appear unchanged as a safe path segment
- **THEN** publication fails rather than rewriting that segment

#### Scenario: An asset has no source file

- **WHEN** an exported manifest names a missing source image
- **THEN** the build fails rather than recording a broken asset

### Requirement: Published artwork uses WebP appropriate to its source

The build SHALL publish sprite artwork as lossless WebP and photographic artwork as quality-80 WebP. The exported source image SHALL remain separate from the published delivery format.

#### Scenario: A runtime sprite is published

- **WHEN** the build reads an exported sprite image
- **THEN** it publishes that image as lossless WebP

#### Scenario: A Steam achievement or zone crop is published

- **WHEN** the build publishes an unlocked Steam achievement image or a derived zone thumbnail
- **THEN** it publishes the image as quality-80 WebP

### Requirement: Artwork follows its entity through redaction

After entity redaction, the build SHALL remove each asset row and published file whose owning entity no longer exists. Every surviving asset SHALL resolve to a surviving entity and its published file. Artwork SHALL NOT have a separate exclusion list.

#### Scenario: Redaction removes an entity

- **WHEN** the build removes an entity after artwork publication
- **THEN** the entity's artwork rows and published images are removed before the build finishes

#### Scenario: Redaction preserves an entity

- **WHEN** the build preserves an entity with recorded artwork
- **THEN** every recorded public path matches the shared path rule and names an existing published file

### Requirement: Consumers use recorded artwork availability

A consumer SHALL treat a missing artwork row as unavailable art. Intrinsic-size images SHALL use the recorded public path and dimensions. A fixed-size image MAY derive the shared public URL only after it receives an explicit availability indicator.

#### Scenario: A source has no artwork row

- **WHEN** an entity has no matching recorded asset
- **THEN** the consumer does not infer the artwork's existence from its predictable path

#### Scenario: A source has intrinsic dimensions

- **WHEN** a consumer displays an image at its intrinsic proportions
- **THEN** it reserves space using the recorded dimensions before image load

### Requirement: A missing export stops the build

`compendium build` SHALL fail when an export file that it requires is absent. The error SHALL name the missing file.

Rationale: loaders returned early when their export file was absent. A partial export therefore produced a database that silently lacked whole entity types.

#### Scenario: A required export file is absent

- **WHEN** the export directory lacks a file that the build requires
- **THEN** the build fails and the error names the missing file
- **AND** the published outputs are unchanged

### Requirement: A failed build keeps the published outputs

`compendium build` SHALL write the database, the published images, and the planner payload to a staging location. It SHALL replace the published copies only after every build stage succeeds. When a replacement step fails, the build SHALL restore each published output that it already replaced, and then fail.

Rationale: the build deleted the published database and planner payload before it started. A failed build therefore left the website without data.

#### Scenario: A build stage fails

- **WHEN** a load, denormalization, verification, or planner payload stage fails
- **THEN** the published database, images, and planner payload are unchanged

#### Scenario: A replacement step fails

- **WHEN** replacing one published output fails after the build replaced other outputs
- **THEN** the build restores the previous copies of the replaced outputs and fails

#### Scenario: The build succeeds

- **WHEN** every build stage succeeds
- **THEN** the build replaces the database, the images, and the planner payload with the complete new set
