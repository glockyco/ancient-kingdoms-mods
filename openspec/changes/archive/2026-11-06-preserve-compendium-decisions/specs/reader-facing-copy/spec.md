## ADDED Requirements

### Requirement: Explanations use players' words and actions

Website and Pocket Compendium explanations SHALL lead with what players can do or get, use "discovered" rather than "met" for monsters and the game's effect terms such as "summons", and retain each setting's explanation. Compact skill summaries SHALL retain "dmg" and "max hp". Text SHALL NOT assign a gender the game does not record or suggest restarting as a remedy for a stopped feature.

#### Scenario: An undiscovered drop has a tooltip

- **WHEN** a setting explains a drop the player has not found
- **THEN** it explains that hovering shows the item's tooltip rather than leading with its color

#### Scenario: A kill consumes a charm

- **WHEN** text explains Captain Aerendyl's Fatecharm use without a recorded gender
- **THEN** it reads "Killing Captain Aerendyl uses the Catacombs Fatecharm in your main inventory"

### Requirement: Explanations keep one thought per sentence

Website and Pocket Compendium explanations SHALL keep one thought per sentence and avoid a single-word final line in their intended layout. A hover SHALL state its rule once without repeating what its row already shows. Text MAY address the reader. No automated copy check SHALL reject semicolons merely for being semicolons.

#### Scenario: A respawn row already shows its state

- **WHEN** the row shows that a monster is up
- **THEN** its hover explains the spawn rule without repeating the Up state

### Requirement: Feature descriptions show the feature without filler

READMEs and feature lists SHALL give each feature one sentence and a picture. Pages SHALL omit decorative facts lines that do not help the player act.

#### Scenario: A feature list introduces augment marks

- **WHEN** the feature list describes augment marks
- **THEN** one sentence and an image explain the marks without an additional facts line

### Requirement: Changelogs describe visible changes concretely

A changelog SHALL use one brief line per change that names what players see or can do, not implementation or UI-style changes. Small visual adjustments and recovery paths SHALL NOT receive separate lines merely for existing.

#### Scenario: Bestiary collection marks are released

- **WHEN** a changelog introduces the collection bar
- **THEN** it says "Shows a bar on each monster in the Bestiary that fills as you find its drops."
- **AND** grey undiscovered tiles, time-only countdown portraits and the stopped-feature card receive no separate lines

### Requirement: Augment descriptions use the game's quality term

Player text describing augment marks SHALL call the frame's distinction quality, not size.

#### Scenario: Describing a Great augment's frame

- **WHEN** text explains the purple frame
- **THEN** it describes the augment's quality rather than its size

### Requirement: Settings help and example cards fit their purpose

Pocket Compendium's settings help SHALL fit on one line. Example cards SHALL identify themselves with "Example:" and describe what they show without implying an actual failure.

#### Scenario: Placing notices

- **WHEN** the player opens the notice-placement example
- **THEN** its title is "Example: notices show here", not "Example: World markers stopped"
