## Purpose

Define how the compendium preserves the game's Notable NPC classification and presents its reputation and map effects.

## ADDED Requirements

### Requirement: The export preserves the authoritative classification

The NPC export SHALL publish the game's Notable NPC field as a separate classification. It SHALL NOT infer this classification from an NPC's name, level, services, or faction.

#### Scenario: A Notable NPC is exported

- **WHEN** the game marks an NPC as notable
- **THEN** the exported NPC record marks that NPC as notable

#### Scenario: An ordinary NPC is exported

- **WHEN** the game does not mark an NPC as notable
- **THEN** the exported NPC record marks that NPC as not notable

### Requirement: NPC kill reputation includes the notable multiplier

The compendium SHALL calculate positive NPC kill reputation as `NPC level × 1.5`. It SHALL multiply that positive amount by 60 for a Notable NPC. The classification SHALL NOT change negative NPC kill reputation.

#### Scenario: King Darin's kill reputation is displayed

- **WHEN** a surface displays the reputation effects for killing level 60 Notable NPC King Darin
- **THEN** it displays `+5,400` for The Forsaken
- **AND** it displays `−300` for Children of Illithor

#### Scenario: An ordinary NPC's kill reputation is displayed

- **WHEN** a surface displays the reputation effects for killing an ordinary level 60 NPC
- **THEN** it displays `+90` for each faction on the improve list
- **AND** it displays `−300` for each faction on the decrease list

### Requirement: Notable is separate from NPC services

The compendium SHALL present Notable NPC as an NPC classification. It SHALL NOT present the classification as a service role.

#### Scenario: A notable quest giver is displayed

- **WHEN** an NPC is notable and offers quests
- **THEN** the surface identifies the NPC as Notable
- **AND** it identifies Quest Giver separately

#### Scenario: Users search for notable NPCs

- **WHEN** a user searches NPC data for `notable`
- **THEN** Notable NPC records are included in the results
- **AND** each result identifies the Notable classification

### Requirement: Reputation surfaces describe the classification

NPC detail pages and faction pages SHALL use the notable-aware reputation calculation. The reputation mechanics page SHALL explain the 60-times positive multiplier and identify its scope.

#### Scenario: A faction page lists King Darin

- **WHEN** The Forsaken faction page lists King Darin as a reputation source
- **THEN** its On kill value is `+5,400`

#### Scenario: A reader checks the reputation formula

- **WHEN** the reader opens the Killing NPCs section of the reputation mechanics page
- **THEN** the page states the ordinary positive and negative formulas
- **AND** it states that Notable NPCs multiply only the positive amount by 60

### Requirement: The map distinguishes Notable NPCs

The map SHALL give Notable NPCs a distinct classification, marker presentation, and visibility control. The map SHALL preserve the NPC's service-role labels and support selection from search and detail links.

#### Scenario: King Darin appears on the map

- **WHEN** Notable NPCs are visible
- **THEN** King Darin uses the Notable NPC marker presentation
- **AND** his tooltip and popup identify him as a Notable NPC
- **AND** his popup also identifies him as a Quest Giver

#### Scenario: A detail-page map link selects King Darin

- **WHEN** a user follows King Darin's map link
- **THEN** the map selects his existing Thogh Maldur location
- **AND** the selected marker uses the Notable NPC presentation

#### Scenario: Ordinary NPCs are displayed

- **WHEN** the map displays an NPC that is not notable
- **THEN** it uses the ordinary NPC marker presentation
