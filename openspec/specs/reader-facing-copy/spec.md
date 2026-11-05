# reader-facing-copy Specification

## Purpose

Define player-facing explanations that are concise without hiding useful mechanics. Preserve quantitative rules, meaningful conditions and consistent terminology across pages, calculators, search results and map popups.

## Requirements

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

#### Scenario: An armor set name already ends in Set

- **WHEN** metadata describes an armor set's bonuses
- **THEN** it preserves the game's set name without appending a redundant "set"
- **AND** it retains the piece thresholds and the bonuses they grant

### Requirement: Derived numbers answer missing player inputs
Copy SHALL state a derived number only when the player lacks an input to compute it, such as real minutes per game-time window, and SHALL NOT spell out arithmetic a player does at a glance, such as kills per token from a drop chance.

#### Scenario: A chance is simple arithmetic

- **WHEN** a currency drops with a 20% chance per kill
- **THEN** the copy gives the chance
- **AND** it does not add the average number of kills per token

#### Scenario: A time needs a conversion the player cannot do

- **WHEN** monsters spawn from 20:00 to 08:00 game time
- **THEN** the copy also gives the 30 real minutes in every hour that the window lasts

### Requirement: Labels identify their values
A label SHALL say what a value is, so no footnote has to explain a column.

#### Scenario: Table column label
- WHEN a table column displays a value
- THEN its label identifies the value without an explanatory footnote

### Requirement: Pitfalls are stated where the choice is made

Copy SHALL state a rule that wastes a player's resource or time beside the place where the player makes that choice.

#### Scenario: Double XP does not stack

- **WHEN** a page explains a season's Double XP
- **THEN** it says that drinking an Elixir of Enlightened Learning during the season adds nothing

#### Scenario: Seasonal treats replace each other

- **WHEN** a page lists the seasonal treats
- **THEN** it says that eating a second treat ends the first
- **AND** it says that treats stack with ordinary food and drink

### Requirement: Secondary connections do not displace the page's purpose

A page SHALL lead with its main subject. Achievement links SHALL remain integrated sidenotes, and invasion information on entity pages SHALL follow the entity's primary content, because neither is the main reason to open that page.

#### Scenario: A monster has achievement and invasion connections

- **WHEN** a monster page links to an achievement and an invasion
- **THEN** the monster's primary information appears first
- **AND** those connections do not become the opening or dominant section

### Requirement: Locations use map links rather than coordinate labels

Player-facing location displays SHALL offer map links instead of raw coordinates where a published map location exists, because the game does not show coordinates and players cannot use them as familiar landmarks. This does not prohibit positions in URL identifiers.

#### Scenario: A page names a mapped location

- **WHEN** a location has published map geometry
- **THEN** the page links to that location on the map rather than displaying its coordinates

### Requirement: Reader text is chosen in a comparison

Text that players read SHALL be chosen by a person from two to four options that start from how large game wikis or popular mods handle the same thing, with every fact checked against the running game or its data.

#### Scenario: A new settings explanation

- **WHEN** a feature adds a settings explanation
- **THEN** it ships only after a person picked it from drafted options shown in place

### Requirement: Website labels and titles use title-style capitalization

Every website label and title SHALL use title-style capitalization: table column headers, field labels, card and section titles, headings, standalone link labels, buttons, tabs, toggles, filter titles and options, chips, and calculation step and input names. Game terms, entity names and quoted game text SHALL keep their own spelling. Running prose SHALL keep sentence case.

#### Scenario: A skill's Rank Scaling table

- **WHEN** a skill's Rank Scaling table shows its damage and mana cost
- **THEN** the columns read "Skill Damage" and "Mana Cost"

#### Scenario: A guide page's table and section title

- **WHEN** the inventory page shows the bank tab table under its section title
- **THEN** the title reads "Bank Tabs and Gold" and the columns read "Unlocking Tab", "Gold Cost" and "Total Slots"

#### Scenario: Short words inside a label

- **WHEN** a label contains an article, a coordinating conjunction, "as", "to" before a verb or a preposition of four letters or fewer
- **THEN** that word is lowercase unless it is the label's first or last word, as in "Heal on Hit" and "Chase Limits and Resets"
- **AND** a preposition of five letters or more is capitalized, as in "Skill Gain Chance After Gathering"

#### Scenario: A label quotes game text

- **WHEN** a label shows a name from the game, such as the item "Earring of Awakened light" or the zone "The Lone-lands"
- **THEN** the name keeps the game's spelling

### Requirement: A concept keeps one label

A value SHALL carry the same label, with the same words and short form, wherever the website shows it. Level labels SHALL read "Req. Level", "Rec. Level", "Min. Level" and "Max. Level". Text that names a label as a label, such as a sentence about a column or a formula that uses a named step, SHALL write it as the label shows it.

#### Scenario: A skill buffs maximum Hit Points

- **WHEN** a skill's buff fields and its Rank Scaling table both show its maximum Hit Points bonus
- **THEN** both label it "Maximum Hit Points"

#### Scenario: A quest's level requirement

- **WHEN** the quest list, an NPC page and a class page show a quest's required level
- **THEN** each column reads "Req. Level"

#### Scenario: A formula uses an earlier step

- **WHEN** a threat calculation adds its "Skill Threat" step to its "Hit Points Contribution" step
- **THEN** the formula reads "Skill Threat + Hit Points Contribution"

#### Scenario: A drop's chance on different pages

- **WHEN** a monster page, an NPC page and a chest page show the chance of a drop
- **THEN** each column reads "Drop Chance"
