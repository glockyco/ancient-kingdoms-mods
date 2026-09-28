## ADDED Requirements

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
