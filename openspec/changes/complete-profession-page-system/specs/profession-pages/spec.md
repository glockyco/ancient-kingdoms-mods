## Purpose

Makes every profession guide complete, accurate, readable, and accessible without JavaScript, while keeping detailed inventories navigable after hydration.

## ADDED Requirements

### Requirement: Static inventories are complete

Every profession inventory SHALL include all of its rows and completion facts in rendered HTML without JavaScript. Hydrated controls MAY paginate, search, and filter the same complete inventory.

#### Scenario: Slayer without JavaScript

- **WHEN** a player loads `/professions/slayer` without JavaScript
- **THEN** all 143 targets, including targets after row 20, and the full mastery explanation are available

#### Scenario: Slayer with JavaScript

- **WHEN** a player loads Slayer with JavaScript
- **THEN** the initial table can display 20 rows and its filters can reach all 143 targets

### Requirement: Fishing presents the action without dashboard framing

Fishing SHALL preserve its cast, bite, catch, and skill-gain rules, tool requirement, drop chances, and fish uses. It SHALL place lower-tier fallback and trash outcomes in accessible disclosures. It SHALL group food and potion uses and link to Cooking.

#### Scenario: Player evaluates Fishing

- **WHEN** a player opens Fishing at 390px width
- **THEN** the payoff and fishing action appear before exhaustive inventories without a bordered hero or metric-card strip

#### Scenario: Player looks for a fish use

- **WHEN** a player opens the fish-use section
- **THEN** food and potion uses are visible together, with a route to Cooking

### Requirement: Each remaining profession explains its payoff and inventory

Adventuring, Alchemy, Cooking, Exploring, Herbalism, Hunter, Lore Keeping, Scroll Mastery, and Treasure Hunter SHALL use the shared profession reading order. Each page SHALL explain its actual action, payoff or lack of bonus, progression, exhaustive inventory, and applicable sources, outputs, and locations. A page SHALL not invent a trainer, unlock, or recipe absent from game data.

#### Scenario: Count-based profession

- **WHEN** a player opens Exploring or Lore Keeping
- **THEN** the page explains what contributes to completion and shows the authoritative total

#### Scenario: Crafting profession

- **WHEN** a player opens Alchemy, Cooking, or Scroll Mastery
- **THEN** the page shows recipe outputs, input provenance, result effects where exported, and relevant station locations

#### Scenario: Gathering or combat profession

- **WHEN** a player opens Herbalism or Hunter
- **THEN** the page explains its success or skill mechanic and identifies locatable resources or targets

### Requirement: The nine remaining inventories cover their specific rules

The migrated routes SHALL preserve their distinct game facts instead of forcing one template. Adventuring SHALL distinguish the quest queue from reward and vendor unlocks. Alchemy SHALL show recipe learning and quest provenance. Cooking SHALL relate fish and plant inputs to food effects. Exploring SHALL expose trigger locations and the city, regular, and dungeon reward distinction. Herbalism SHALL show variable yields and material consumers. Hunter SHALL explain discovery and quality drops. Lore Keeping SHALL expose full book sources. Scroll Mastery SHALL distinguish craftable and non-craftable scrolls and repair kits. Treasure Hunter SHALL distinguish maps, dig sites, relic chances, and other chest rewards.

#### Scenario: Player follows a special source

- **WHEN** a player inspects a treasure map, a lore book, or an alchemy recipe token
- **THEN** the page identifies its actual acquisition route and relevant map or entity links

### Requirement: Profession metadata matches game completion and rewards

Published completion totals SHALL agree with game calculations: Exploring uses 46 discoveries and Lore Keeping uses 17 books. Gathering rewards and recipe stations SHALL retain exported values instead of discarding supported fields or identifying every non-cooking station as unknown.

#### Scenario: Completion metadata is rebuilt

- **WHEN** the data export and database build run
- **THEN** Exploring and Lore Keeping show 46 and 17 respectively without a route-specific count override

#### Scenario: Resource and station data is rebuilt

- **WHEN** a gathering resource or crafting station has an exported reward or station classification
- **THEN** its database record preserves that information for profession pages

### Requirement: Profession guides support reading before exhaustive browsing

Each profession SHALL show its mastery payoff, or explicitly state that mastery tracks completion without a gameplay bonus, before large inventories. The first data fact SHALL appear within one 390×844 viewport. Hydrated default pages SHALL fit within six 390×844 screens or four 1440×900 screens, without horizontal page overflow at 390px. Static HTML MAY be longer to preserve complete inventories.

#### Scenario: Player opens a profession on mobile

- **WHEN** a player loads a migrated route at 390×844
- **THEN** the first mechanic appears in the first viewport and the page has no horizontal overflow

#### Scenario: Player reads without JavaScript

- **WHEN** a player loads a profession route with JavaScript disabled
- **THEN** its facts, initial numeric calculator result, and complete inventory remain readable

### Requirement: Profession navigation and metadata reflect page payoffs

The profession index SHALL show each profession's payoff. Each profession page SHALL have a payoff-based search description and relevant links to related professions in both directions. Its page and entity JSON-LD, when present, SHALL remain consistent with visible content.

#### Scenario: Player follows a related profession

- **WHEN** a player follows an evidenced relationship between Fishing and Cooking
- **THEN** each page offers a link to the other

#### Scenario: Search engine reads profession metadata

- **WHEN** a crawler reads a profession page
- **THEN** its description identifies that page's actual payoff
- **AND** any existing structured data agrees with the visible page content

### Requirement: Dense mechanics pages encode relationships

The Combat and Inventory mechanics pages SHALL convey ordered combat steps and storage capacities without presenting every distinct fact as an identical card or table row. The mechanics index SHALL not warn about density that the redesigned pages no longer have.

#### Scenario: Player reads combat resolution

- **WHEN** a player opens Combat
- **THEN** the damage pipeline reads as an ordered sequence and formulas have clear categories
