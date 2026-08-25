## Purpose

Governs how configured redactions keep private or unreleased game content out of the published compendium. It defines which references a redaction follows, how far removal cascades, which publish surfaces it covers, and how the build proves that nothing survived.

## Requirements

### Requirement: Two independent zone redaction mechanisms

The pipeline SHALL provide two separately configured zone mechanisms, and a zone SHALL be subject only to the mechanisms that name it.

- **Position suppression** applies to a released zone in which the game withholds positional information from the player. It preserves every entity and removes geometry, so the compendium discloses no more than the game does.
- **Unreleased-zone exclusion** applies to a zone that has not shipped. It removes everything related to the zone.

Each mechanism SHALL accept an arbitrary set of zone identifiers from configuration. Neither mechanism SHALL hardcode a zone identifier.

#### Scenario: A released zone without a map

- **WHEN** a zone is configured for position suppression only
- **THEN** its monsters, items, quests, and other entities remain published
- **AND** no position, boundary, or other geometry for that zone is published

#### Scenario: An unreleased zone

- **WHEN** a zone is configured for unreleased-zone exclusion
- **THEN** the zone and everything related to it is absent from the published output

#### Scenario: Mechanisms stay independent

- **WHEN** one zone is configured for each mechanism
- **THEN** the released zone keeps its entities
- **AND** the unreleased zone's removal does not depend on the other zone's configuration

#### Scenario: Adding a zone

- **WHEN** a zone identifier is added to either mechanism's configuration
- **THEN** that mechanism applies to it on the next build with no code change

### Requirement: Zone references are discovered from the schema

Both mechanisms SHALL determine the columns they act on by inspecting the database schema rather than from a maintained list of tables. Discovery SHALL cover direct zone references and sub-zone references, and SHALL resolve a sub-zone reference to its parent zone.

Discovery SHALL also cover zone identifiers embedded in JSON values, in both the numeric and the string zone-identifier spaces.

Rationale: a maintained table list silently omits entity types added later. The list it replaced covered eleven of the twenty tables that carry a zone reference.

#### Scenario: A new entity type is added

- **WHEN** a table carrying a zone reference is added to the schema
- **AND** a row in it references a redacted zone
- **THEN** the applicable mechanism acts on that row without a change to the redaction code

#### Scenario: Sub-zone reference

- **WHEN** a row references a sub-zone belonging to a redacted zone
- **THEN** the row is treated as referencing that zone

#### Scenario: Zone identifier inside JSON

- **WHEN** a JSON value holds a zone identifier for a redacted zone, in either identifier space
- **THEN** the applicable mechanism acts on that value

### Requirement: Each reference has one declared meaning

Every reference the build acts on SHALL carry one declaration stating the direction in which it carries reachability and which geometry it governs. The direction SHALL be one of three: the row makes the entities it names reachable, the entities it names make the row reachable, or neither. Every pass SHALL read that one declaration rather than keeping its own list, so that no two passes can disagree about the same column.

A reference that a row uses to name a destination SHALL NOT make that destination reachable. Otherwise a boundary into redacted content makes the redacted content reachable through the boundary itself.

A declaration SHALL state the direction the data means. A row that lists the members it is composed of does not provide them, because the members provide the row.

Rationale: reachability, deletion, and geometry were each derived separately from the same references. Three lists over one set of columns is three chances to classify a column three ways. Recording only whether a reference carries reachability, without its direction, forced a composed row to be declared as the source of its own parts, so removing every part left the row published with a blank member list.

#### Scenario: A pass needs a reference's meaning

- **WHEN** any pass decides what to do with a reference
- **THEN** it uses the single declaration for that reference

#### Scenario: A reference into redacted content

- **WHEN** a published row names a redacted zone as a destination
- **THEN** the redacted zone is not reachable through that row

#### Scenario: A row composed of the rows it names

- **WHEN** a reference declares that the entities it names make the row reachable
- **THEN** removing all of those entities removes the row
- **AND** the row does not make those entities reachable

#### Scenario: An undeclared reference

- **WHEN** the data holds a reference form that no declaration covers
- **THEN** the entity it names is not removed on account of it
- **AND** the surviving reference to removed content fails the build

### Requirement: Position suppression removes geometry and keeps entities

For a zone under position suppression, the published output SHALL contain no position, boundary, destination coordinate, or path geometry belonging to that zone, including geometry embedded in JSON values. Every entity of that zone SHALL remain published with its non-geometric data.

#### Scenario: Entities survive

- **WHEN** a zone is under position suppression
- **THEN** its monsters, spawn records, and other entities remain published without coordinates

#### Scenario: Geometry inside JSON

- **WHEN** a JSON value holds a position for a location in a suppressed zone
- **THEN** that position is not published

### Requirement: Unreleased-zone exclusion removes related rows

For a zone under unreleased-zone exclusion, the published output SHALL contain no row that references the zone, and no row for the zone itself.

Prose that merely names a zone is not a reference. Content SHALL NOT be removed because its name, tooltip, description, or lore text mentions a redacted zone.

#### Scenario: Row references the zone

- **WHEN** a row references an excluded zone through a column or an embedded identifier
- **THEN** the row is absent from the published output

#### Scenario: Prose mention only

- **WHEN** a quest, item, or monster names an excluded zone in text and holds no reference to it
- **THEN** it remains published unchanged

### Requirement: Removal follows references to any depth

An entity SHALL be removed when every source, spawn, or user that made it reachable has itself been removed, however many references separate it from the excluded content.

Following one step is not sufficient: removing spawns orphans monsters, removing monsters orphans items and skills, and removing those orphans further records.

An entity that was reachable from nothing before the redaction SHALL NOT be removed by it. Unconnected content is not evidence of unreleased content, and the published compendium contains such content deliberately.

#### Scenario: Removal beyond the first step

- **WHEN** excluding a zone removes the only spawns of a monster
- **AND** that monster was the only source of an item
- **THEN** both the monster and the item are absent from the published output

#### Scenario: A surviving source keeps an entity

- **WHEN** an entity remains reachable from content outside the excluded zone
- **THEN** it stays published
- **AND** only the references to removed content are gone from it

#### Scenario: Unreachable content is untouched

- **WHEN** an entity was reachable from no released content before the redaction
- **AND** it holds no reference to redacted content
- **THEN** the redaction neither removes it nor reports it

### Requirement: Reachability considers every reference kind

Deciding whether an entity is still reachable SHALL consider every kind of reference the data supports, including references embedded in JSON values, and SHALL NOT rely on one relationship alone.

Rationale: a skill can be reachable through a monster, a weapon proc, a scroll, a relic, a potion or food buff, a pet, or a class list. Judging skills by monster use alone would remove a skill that is a live weapon's proc. A monster can be reachable through a summon rather than a spawn, and two monsters in the current data have no spawn record at all.

#### Scenario: Reachable through a non-obvious relationship

- **WHEN** an entity's only remaining reference comes from a relationship other than the one that made it a candidate
- **THEN** the entity stays published

#### Scenario: A monster that is only ever summoned

- **WHEN** a monster has no spawn record and is summoned by content that remains published
- **THEN** the monster remains published

#### Scenario: A summoner in an excluded zone

- **WHEN** the only content that summons a monster is removed
- **AND** the monster has no spawn record and no other reference
- **THEN** the monster is absent from the published output

#### Scenario: No remaining reference of any kind

- **WHEN** no reference of any kind to an entity remains
- **AND** the entity became a candidate through excluded content
- **THEN** the entity is removed

### Requirement: An aggregate is removed with its members

An entity whose only reachability comes from the entities it aggregates SHALL be removed when none of those members survives, and SHALL be recorded as following them. It SHALL remain published while any member remains.

An armour set bonus is such an entity. A player reaches it by wearing its member pieces, so a set whose every piece is removed is unobtainable and describes content no player can see.

Rationale: naming each aggregate in the configuration records a fact rather than a rule, and a patch can change the fact. Version 0.9.31.0 gave two unreleased sets their own bonus entities, and the configuration had recorded that those two bonuses belonged to released sets. Both were published, with their set name, item level, attribute bonuses and skill bonuses.

#### Scenario: Every member is removed

- **WHEN** every member of an aggregate entity is removed
- **AND** no other reference reaches the aggregate
- **THEN** the aggregate is absent from the published output
- **AND** the record for it names the members it followed

#### Scenario: A member survives

- **WHEN** at least one member of an aggregate entity remains published
- **THEN** the aggregate remains published

#### Scenario: An aggregate over released members

- **WHEN** an aggregate's members are all published content
- **THEN** the redaction neither removes it nor reports it

### Requirement: Removal covers every publish surface

Content removed by a redaction SHALL be absent from every published surface, not from the compendium database alone. This includes the search index, published image files, and prerendered pages including any data payload they embed.

#### Scenario: Image files

- **WHEN** an entity is removed
- **THEN** no image file for it is published

#### Scenario: Search index

- **WHEN** an entity is removed
- **THEN** no search entry names or returns it

#### Scenario: Prerendered pages

- **WHEN** a zone is excluded
- **THEN** no page is published for it
- **AND** no published page links to it or names it as a destination

### Requirement: Boundary references are scrubbed rather than left dangling

A published entity that references excluded content across the boundary SHALL remain published with that reference cleared. It SHALL NOT retain the destination's identifier, a name generated from the destination, or coordinates of the destination, and SHALL NOT hold a reference to a removed row.

The entity's own identifier is not a reference. An identifier that contains the name of a redacted zone SHALL NOT be rewritten, for the same reason that prose naming the zone stays.

#### Scenario: Portal into an excluded zone

- **WHEN** a portal in a published zone leads to an excluded zone
- **THEN** the portal remains published with its requirements
- **AND** its destination identity, destination name, and destination coordinates are absent

#### Scenario: Generated text naming the destination

- **WHEN** an entity's displayed name was generated from a removed destination
- **THEN** the published name does not disclose the removed destination

#### Scenario: The entity's own identifier contains the zone name

- **WHEN** a published entity has an identifier that contains the name of a redacted zone
- **THEN** the identifier is published unchanged
- **AND** the verification does not report it

### Requirement: Manually excluded identifiers

The configuration SHALL accept an explicit list of entity identifiers to exclude, and the build SHALL remove them together with their dependents.

Rationale: unreleased content can exist with no reference edge at all. `old_valorath_token` had no source, no usage, and no zone reference, which made it indistinguishable by reference from the 90 unconnected items the compendium publishes on purpose. Such content can only be named.

#### Scenario: Identifier listed explicitly

- **WHEN** an entity identifier is listed for manual exclusion
- **THEN** the entity is absent from every publish surface

#### Scenario: Unconnected content is not removed automatically

- **WHEN** an entity has no source and no usage
- **AND** it is not named for manual exclusion and holds no reference to redacted content
- **THEN** it remains published

### Requirement: Configured removal has one implementation

Every configured way to remove an entity SHALL use the same removal machinery. A mechanism SHALL NOT delete published rows through a path of its own, because such a path follows only the references its author remembered, records no provenance, and is invisible to the verification.

A mechanism that keeps an entity and removes part of its data SHALL report what it cleared, so that the ledger covers it as well.

Rationale: two configured mechanisms deleted rows outside the closure. Two quests were absent from the published database and absent from the ledger, so the record of what redaction removed was incomplete while claiming to be complete. Both were correct only because a later denormalizer rebuilt the derived columns that would otherwise hold a dangling reference.

#### Scenario: An entity is named for removal in configuration

- **WHEN** configuration names an entity of any kind for removal
- **THEN** the entity and its dependents are removed by following declared references
- **AND** the ledger records the entity, its mechanism, and its reason

#### Scenario: A configured removal is verified

- **WHEN** any configured mechanism removes an entity
- **THEN** the verification scans the published output for that entity's identifier

#### Scenario: One configuration key for one meaning

- **WHEN** two configuration keys would remove an entity by naming it
- **THEN** the specification keeps one of them

#### Scenario: The configuration is absent

- **WHEN** the redaction configuration cannot be read
- **THEN** the build fails
- **AND** it publishes nothing

#### Scenario: A mechanism removes no entity

- **WHEN** a mechanism keeps its entities and removes part of their data
- **THEN** it reports what it cleared to the ledger
- **AND** it adds no identifier to the verification, because it removed none

### Requirement: Redaction decisions are recorded and reviewable

The build SHALL record every redaction decision in a version-controlled ledger. Each removed entity's record SHALL state the mechanism that removed it, the reason, and the already-removed entities the decision followed.

A verification step SHALL compare the recorded decisions against those the current data produces and SHALL fail when they differ. Updating the ledger SHALL be a deliberate step, never a side effect of building.

Rationale: the invariant check proves nothing excluded survived. The ledger proves nothing was excluded by accident. A change in what is redacted then arrives as a reviewable diff rather than as content silently disappearing.

#### Scenario: An entity is removed

- **WHEN** redaction removes an entity
- **THEN** the ledger records its mechanism, its reason, and the removals it followed

#### Scenario: The excluded set changes

- **WHEN** a data or configuration change alters which entities are removed
- **AND** the ledger still records the previous set
- **THEN** the verification fails and reports what appeared and what disappeared

#### Scenario: Explaining one entity

- **WHEN** somebody asks why a specific entity is absent from the published output
- **THEN** the recorded chain answers it without reading the pipeline source

#### Scenario: Unchanged build

- **WHEN** the data and configuration are unchanged
- **THEN** rebuilding produces an identical ledger

### Requirement: The build fails when a redacted reference survives

After redaction and the cascade complete, the build SHALL verify that no published content references redacted content, and SHALL fail when it finds one. The verification SHALL cover values of any shape, including text and JSON, so that an undeclared reference form is still caught.

#### Scenario: Surviving reference

- **WHEN** a published value still holds an excluded zone or removed entity identifier
- **THEN** the build fails and reports where the reference was found

#### Scenario: Clean build

- **WHEN** no reference to redacted content remains
- **THEN** the verification passes and the build continues

#### Scenario: A new reference shape appears

- **WHEN** a schema change introduces a reference form the discovery step does not know
- **AND** a published value holds a redacted identifier in that form
- **THEN** the build fails rather than publishing it
