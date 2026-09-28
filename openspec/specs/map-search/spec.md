# map-search Specification

## Purpose

Defines map-specific search results and navigation while keeping the site-wide search index and its ranking contract authoritative.

## Requirements

### Requirement: Map search retains distinct physical placements

Map search MUST use the shared search ranking, include map-only placement families, and keep separate physical records even when they share a destination page. A result without mappable geometry MUST still remain searchable when it has a map popup.

#### Scenario: Two portals share a destination
- **WHEN** two physical portals match a map query and lead to the same zone
- **THEN** map search retains separate results identified by their portal records

#### Scenario: Search includes a map-only placement
- **WHEN** a visitor searches for a chest name on the map
- **THEN** a matching chest can appear in map search, although it is excluded from the global palette

### Requirement: Map search enriches ranked results with map geometry

Map search MUST attach bounds for available source positions without using geometry to replace the shared search ranking. It MUST convert game coordinates to map coordinates before fitting the view. Altar-only monsters MUST use altar positions when available.

#### Scenario: Monster has several spawns
- **WHEN** a visitor searches for a monster with several positioned spawns
- **THEN** its map result contains bounds covering those spawns

#### Scenario: Altar-only monster
- **WHEN** an altar-only monster has an altar position
- **THEN** its result can focus the altar position

### Requirement: Selecting a map result opens its map selection

Selecting a map result MUST show the corresponding map popup or virtual item or quest popup. When the result has bounds, the map MUST fit them. The map dialog groups rows by category while preserving the first occurrence order of categories and the ranking within each group.

#### Scenario: Search selects a portal
- **WHEN** a visitor selects a positioned portal result
- **THEN** the map opens that portal's popup and fits its bounds

#### Scenario: Search selects a quest
- **WHEN** a visitor selects a quest result with NPC source positions
- **THEN** the map opens the quest popup and focuses the available source bounds
