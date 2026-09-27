## Purpose

Keeps the compendium's coverage of the in-game Adventurer's Guide complete across game updates, and lets a player find a compendium section by the guide's own article titles.

## ADDED Requirements

### Requirement: The guide's articles are exported

The game export SHALL write every Adventurer's Guide article with its identifier, category, English title, and English body. The export SHALL fail when the game provides no articles.

#### Scenario: A normal export runs

- **WHEN** the game data export runs on a build that contains the guide
- **THEN** the export contains one record for each guide article

#### Scenario: The guide is absent

- **WHEN** the export finds no guide articles
- **THEN** the export fails instead of writing an empty list

### Requirement: Every article maps to a compendium section

Each exported article SHALL map to exactly one compendium page section. The mapping SHALL record a digest of the article body that was reviewed.

A check SHALL fail and name the article when an article has no mapping, when a mapping names an article that the export does not contain, when the mapped section does not exist on its page, or when the article body digest differs from the recorded digest.

#### Scenario: A game update changes an article

- **WHEN** a new export contains an article whose body differs from the reviewed body
- **THEN** the check fails and names that article

#### Scenario: A game update adds an article

- **WHEN** a new export contains an article with no mapping
- **THEN** the check fails and names that article

#### Scenario: A section anchor is renamed

- **WHEN** a mapped section identifier no longer exists on its page
- **THEN** the check fails and names the article and the missing section

### Requirement: Article titles are search entries

Global search SHALL return each guide article title as a result that opens the mapped compendium section. Search SHALL also match words from the article body.

#### Scenario: A player searches for a guide term

- **WHEN** a player searches for "Need, Greed"
- **THEN** a result titled "Need, Greed, and Pass" opens the loot-roll section

### Requirement: Compendium text follows the game code

Compendium sections SHALL state guide rules in the compendium's own words, and each stated rule SHALL cite the decompiled source that implements it. Where the guide and the code disagree, the section SHALL state the behaviour of the code.

#### Scenario: The guide and the code disagree

- **WHEN** a guide article states a rule that the code does not implement
- **THEN** the compendium states the implemented rule
