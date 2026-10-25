# reader-facing-copy Specification

## Purpose

Define player-facing explanations that are concise without hiding useful mechanics. Preserve quantitative rules, meaningful conditions and consistent terminology across pages, calculators, search results and map popups.

## Requirements

### Requirement: Copy explains player outcomes

The compendium SHALL describe player-visible outcomes, conditions and choices. It SHALL NOT present ordinary internal recomputation or synchronization as a special gameplay rule when the useful outcome is already stated. It SHALL preserve persistence, interruption, payment and timing rules that affect play.

#### Scenario: A veteran bonus is recalculated when summoned

- **WHEN** a page states the bonus a mercenary receives per total veteran point
- **THEN** it does not repeat the stat restoration mechanism as a second benefit
- **AND** it still explains any hire roll that remains fixed and affects hiring choices

### Requirement: Quantities and conditions are explicit

A label or summary SHALL distinguish maximum pools from current resources, healing and regeneration. A chance SHALL identify its event and relevant condition. Duration displays SHALL preserve meaningful seconds rather than silently floor to whole minutes. Calculator defaults SHALL describe a state the corresponding character or caster can have.

#### Scenario: Food increases the maximum pool

- **WHEN** food grants a Hit Points maximum bonus and Health Regeneration
- **THEN** its effect identifies maximum Hit Points separately from Health Regeneration
- **AND** its maximum-pool bonus cannot be mistaken for a heal

#### Scenario: A duration has leftover seconds

- **WHEN** a skill lasts 90 seconds or a respawn takes 150 seconds
- **THEN** the displayed duration preserves the 30 seconds after the whole minutes

#### Scenario: A companion damage example is shown

- **WHEN** a skill is used by a companion whose ranks start at one
- **THEN** its example does not use rank zero

#### Scenario: A skill can be resisted

- **WHEN** a skill card explains which resistance can prevent its effect
- **THEN** it retains the resistance rate, the caster's Accuracy interaction and the final chance limit
- **AND** a link to shared calculations does not replace those local rules with a generic possibility

#### Scenario: A debuff has partial cleanse resistance

- **WHEN** a matching cleanse can remove between one and three layers
- **THEN** the card explains the guaranteed layer and the two independent extra-layer chances
- **AND** it retains the skill-specific base chance, Accuracy scaling and chance limits

#### Scenario: A compact summary describes a resource trade

- **WHEN** a skill spends one resource to restore another or heal a target
- **THEN** its summary preserves the cost and the amount or scaling of the benefit
- **AND** detailed rounding and worked examples may remain in the calculator rather than the summary

### Requirement: One term identifies one concept across surfaces

The compendium SHALL use consistent player-facing stat, service, skill-type, source and spawn-condition names across pages, tables, filters, search and map displays. Internal identifiers SHALL NOT appear as explanatory labels or accessible names. Game names and quoted game text SHALL remain intact.

#### Scenario: An item grants a skill effect

- **WHEN** the skill page lists the granting item
- **THEN** it describes food, potion, relic or on-hit use in words rather than a raw source-type identifier

#### Scenario: A chest link needs a name

- **WHEN** a table or popup links to a chest placement
- **THEN** its visible or accessible identity uses meaningful player context rather than an internal placement ID

### Requirement: Repetition does not hide meaningful differences

Equivalent source entries SHALL be grouped without losing differences in zone, chance or acquisition condition. Shared rules SHALL be separated from class-specific facts. A comparison with multiple conditions SHALL use a form that makes its alternatives clear. Repeated statistics or headings SHALL be removed only when a complete authoritative display and necessary anchors remain.

#### Scenario: Fishing locations share a resource name

- **WHEN** equivalent sources share a name, zone and chance
- **THEN** their presentation does not repeat indistinguishable rows
- **AND** sources with different zones or chances remain distinguishable

### Requirement: Metadata reflects actual identity and requirements

Titles, search results and descriptions SHALL identify their subject using verified context. Descriptions SHALL state actual learning requirements, skill tiers, acquisition conditions and target scope. They SHALL NOT replace missing specificity with raw IDs or unsupported statements.

#### Scenario: A class skill has a tier and prerequisite

- **WHEN** a Tier 4 skill requires spent class points and a predecessor skill
- **THEN** its description does not show Tier V or imply that character level one alone unlocks it

#### Scenario: Named entities occur in several families

- **WHEN** an item and a skill have the same name
- **THEN** the title or search context distinguishes the two subjects without misclassifying either

### Requirement: Copy leads with the player's outcome

Copy SHALL open with what the player gets, does or must avoid, in the game's vocabulary and with exact numbers. It SHALL state a derived number only when the player lacks an input to compute it, such as real minutes per game-time window, and SHALL NOT spell out arithmetic a player does at a glance, such as kills per token from a drop chance. It SHALL NOT open with a generic description of the game, restate a heading or the table beside it, decorate facts with flavour verbs, or explain an internal mechanism unless that mechanism changes what the player can do.

#### Scenario: A section introduces a table

- **WHEN** a section shows a table of monster spawns
- **THEN** its sentence states what the table does not, such as the season and spawn hours shared by every row
- **AND** it does not repeat the table's rows in prose

#### Scenario: A time depends on how the server works

- **WHEN** the page says when an event starts or ends
- **THEN** it gives the time in the reader's time zone
- **AND** it does not explain UTC date handling or the server's hourly date check

#### Scenario: A chance is simple arithmetic

- **WHEN** a currency drops with a 20% chance per kill
- **THEN** the copy gives the chance
- **AND** it does not add the average number of kills per token

#### Scenario: A time needs a conversion the player cannot do

- **WHEN** monsters spawn from 20:00 to 08:00 game time
- **THEN** the copy also gives the 30 real minutes in every hour that the window lasts

### Requirement: Headings and sentences state facts plainly

A heading SHALL name its content in the terms the site already uses for it. Copy SHALL state facts in the third person or as conditions, and SHALL NOT address the reader with slogans, advice or marketing imperatives. A label SHALL say what a value is, so no footnote has to explain a column. Copy SHALL use the words players and the game use for an action or effect, such as using an item, looting a corpse or a buff that does not stack, and SHALL NOT use literary verbs or internal terms where a plain word exists.

#### Scenario: A card holds a spawn table

- **WHEN** a card shows where seasonal monsters spawn
- **THEN** its heading is "Spawns", as on monster pages
- **AND** it is not a question or a call to action such as "Where to hunt"

#### Scenario: A summary describes a currency

- **WHEN** a page says what a seasonal currency is for
- **THEN** it says what the currency buys and during which events
- **AND** it does not use a vague verb such as "works" or an imperative such as "Spend tokens on treats"

#### Scenario: A potion's restriction

- **WHEN** a page says a potion is unavailable during an event
- **THEN** it says the potion cannot be used, not that it cannot be drunk

#### Scenario: Effects that replace each other

- **WHEN** a skill page says which effects replace each other
- **THEN** it says the effect does not stack with them, not that it shares an overwrite group

### Requirement: Pitfalls are stated where the choice is made

Copy SHALL state a rule that wastes a player's resource or time beside the place where the player makes that choice.

#### Scenario: Double XP does not stack

- **WHEN** a page explains a season's Double XP
- **THEN** it says that drinking an Elixir of Enlightened Learning during the season adds nothing

#### Scenario: Seasonal treats replace each other

- **WHEN** a page lists the seasonal treats
- **THEN** it says that eating a second treat ends the first
- **AND** it says that treats stack with ordinary food and drink
