## ADDED Requirements

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

## MODIFIED Requirements

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
