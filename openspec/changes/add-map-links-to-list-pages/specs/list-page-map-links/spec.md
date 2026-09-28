## Purpose

Readers can move from a list of entities to a matching map selection without opening each entity's detail page. The list does not offer a map action for a location that the published map cannot show.

## ADDED Requirements

### Requirement: Overview rows link to mapped entities

The monster, NPC, altar, gathering-resource, and quest overviews MUST offer a compact map action for each row with a mapped location. The action MUST open the map with that entity selected and its available locations in view.

#### Scenario: Entity with a mapped position

- **WHEN** a reader selects Map on a monster, NPC, altar, or gathering-resource row with a mapped location
- **THEN** the map selects that entity and fits its mapped locations into view

#### Scenario: Quest with a mapped related NPC

- **WHEN** a reader selects Map on a quest with at least one mapped giver or turn-in NPC
- **THEN** the map selects the quest and highlights its available related NPC locations

#### Scenario: No mapped location

- **WHEN** a physical entity has no mapped position, or a quest has no mapped related NPC
- **THEN** its row shows a non-interactive unavailable-location indicator instead of a Map link

### Requirement: Profession target rows link to mapped entities

Hunter targets and Herbalism plants MUST offer the same compact map action when their respective monster or resource has a mapped location.

#### Scenario: A mapped profession target

- **WHEN** a reader selects Map on a mapped Hunter monster or Herbalism plant
- **THEN** the map selects the monster or resource and fits its available locations into view

#### Scenario: An unmapped profession target

- **WHEN** a Hunter target or Herbalism plant has no mapped position
- **THEN** its row shows a non-interactive unavailable-location indicator

### Requirement: Zone rows link to position-backed entities

Zone detail rows for monsters, altars, NPCs, chests, and traps MUST offer a compact map action when the row has a mapped position. The map MUST select the row's entity, not the containing zone.

#### Scenario: A position-backed zone row

- **WHEN** a reader selects Map on a position-backed entity row in a zone
- **THEN** the map selects that entity and fits its available locations into view

#### Scenario: A zone row has no position

- **WHEN** a zone row has no mapped position
- **THEN** its row shows a non-interactive unavailable-location indicator instead of a Map link
