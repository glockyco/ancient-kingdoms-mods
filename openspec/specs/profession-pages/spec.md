# profession-pages Specification

## Purpose

Records the profession presentation and mechanics already available to players on the three migrated pages, without declaring unfinished routes or static target completeness shipped.

## Requirements

### Requirement: Migrated pages show a compact profession identity

Mining, Radiant Seeker, and Slayer SHALL show a name, category, profession-specific icon, and an introductory payoff near the start of the page. When an achievement identifier and name exist, the shared header SHALL link the achievement at the stated mastery cap.

#### Scenario: Player opens Mining

- **WHEN** a player opens `/professions/mining`
- **THEN** the header describes the pickaxe and mastery payoff and links the mastery achievement when the exported achievement exists

#### Scenario: Player opens a migrated page with four sections

- **WHEN** the page supplies at least four named sections
- **THEN** the header shows a section jump list to those anchors

### Requirement: Migrated calculators show mastery as a curve

Migrated pages with a numeric mastery payoff SHALL show a labeled curve at the reader's selected mastery. The curve SHALL distinguish outcomes below the usable floor and tiers that no longer grant skill when those rules apply. An initial curve and its numeric outcome SHALL render without JavaScript.

#### Scenario: Mining has a low success chance

- **WHEN** a player opens Mining at its initial skill and pickaxe settings
- **THEN** the rendered calculator shows the success curve, the unavailable region, and the current numeric outcome

#### Scenario: Radiant Seeker skill changes

- **WHEN** a player changes the Radiant Seeker skill slider
- **THEN** the displayed Aether chance and curve marker change together

### Requirement: Mining presents its action and inventory

The Mining page SHALL describe the pickaxe, ore-success rule, skill-gain rule, node inventory, locations, extra gem rolls, and ore uses. It SHALL link available resource locations to the map.

#### Scenario: Player inspects ore

- **WHEN** a player opens the Mining page and selects a mastery and pickaxe quality
- **THEN** the page shows mineable ores and their success and skill-gain outcomes with a map action for ore locations

### Requirement: Radiant Seeker presents spark and combat outcomes

The Radiant Seeker page SHALL state its 5%–25% Aether chance, no-tool spark action, variable spark respawn, locations, and the Aether combat payoff.

#### Scenario: Player looks for a spark

- **WHEN** a player opens the Radiant Seeker page
- **THEN** the page explains the spark action and chance and links the spark resource to the map

### Requirement: Slayer presents account mastery and target navigation

The Slayer page SHALL show the 10% activation threshold, up to 10% damage reduction, account-wide capped-kill rule, nearby-party credit, and its target inventory. Hydrated target navigation SHALL support searching and filtering by classification, zone, and level.

#### Scenario: Player inspects a special target

- **WHEN** a player inspects the Slayer target table
- **THEN** the page distinguishes summon, altar, and replacement requirements and offers a map link where coordinates exist

#### Scenario: Player inspects mastery

- **WHEN** a player reads the Slayer mastery section
- **THEN** the page says one target adds at most one percentage point and explains shared credit and account-wide mastery
