# formula-presentation Specification

## Purpose

Defines how the compendium presents a game formula so a reader can follow it without translating notation, trust its numbers, and try it with their own character.

## Requirements

### Requirement: Formulas are worded steps

A rule that takes more than one operation SHALL use named steps when those steps help explain the outcome. A one-operation rule MAY be a sentence without a redundant worked example. Each step SHALL name its result in game terms and state the computation using real stats and earlier steps. Visible explanations SHALL NOT use code identifiers or single-letter variables.

#### Scenario: A one-operation rule

- **WHEN** a skill multiplies one value by one percentage
- **THEN** the page states the amount and relevant condition plainly
- **AND** an obvious example is not required solely to repeat that operation

#### Scenario: A formula has an intermediate quantity

- **WHEN** a formula uses an intermediate quantity such as Health spent
- **THEN** a step names that quantity in words
- **AND** later steps use that name rather than a letter

#### Scenario: A formula has a bound

- **WHEN** the game limits a value
- **THEN** the explanation states the limit in words

### Requirement: Units are the reader's units

Multipliers and per-point coefficients SHALL be stated as percentages, such as "0.4% per point", not decimal fractions. A whole-number multiplier above 10 MAY be stated as a multiple, such as "× 20", where a percentage such as 2000% would be harder to read. A change to a chance SHALL be stated in percentage points. Durations SHALL use seconds below a minute and minutes and hours from a minute up. Distances SHALL be stated in yd, the unit the game's tooltips use for world distances. A skill's level SHALL be called its rank.

#### Scenario: A coefficient is a fraction in the game code

- **WHEN** the game multiplies a stat by 0.004
- **THEN** the page states 0.4% per point

#### Scenario: A rule depends on a distance

- **WHEN** the game checks that a character is within 2 world units
- **THEN** the page states 2 yd

### Requirement: Stats use the game's names

A page SHALL call a character stat by the name the game's character window shows: Attack Power, Spell Power, Armor Class, Spell Casting Haste and Critical Strike. An item stat list MAY use the item tooltip's own names, such as AC and Critical Chance. A compact one-line effect summary in a table cell or an in-game tooltip MAY use the established abbreviations, such as AC, crit, max hp, dmg and attribute short names such as WIS, so the summary stays on one line.

#### Scenario: A skill adds the caster's magic damage stat

- **WHEN** a skill's damage adds the caster's magic damage stat
- **THEN** the page names Spell Power
- **AND** it tells the reader to read Spell Power in the character window

#### Scenario: A compact ability summary

- **WHEN** a monster's abilities table summarizes a skill's effect in one cell
- **THEN** the summary may abbreviate stat and damage names
- **AND** the skill's detail page still names each stat as the character window does

### Requirement: Rounding is stated where it happens

Detailed calculations SHALL preserve the game's rounding and state how displayed whole-number results are rounded. A nearest-integer calculator SHALL explain its exact-halves rule once. Compact summaries MAY leave intermediate rounding detail in the calculator when they retain the meaningful cost, benefit and conditions.

#### Scenario: A compact resource trade

- **WHEN** a summary describes spending one resource to restore another
- **THEN** it retains the cost and benefit scaling
- **AND** detailed rounding may remain in its linked calculator

#### Scenario: A page rounds in several places

- **WHEN** a detailed calculator rounds several intermediate results
- **THEN** each affected step states its rounding
- **AND** its first nearest-integer explanation states the exact-halves rule

### Requirement: Worked examples use the game's arithmetic

A worked example SHALL state its inputs and computed outcome using published data and the game's applicable precision and rounding, including single-precision intermediates where used. Numeric outcomes SHALL be computed rather than typed by hand. Effect examples SHALL use a valid caster scenario through the existing fixed-caster and rank-input rules rather than a blanket highest-rank default. Learning requirements SHALL use the described or next base rank separately from effect examples.

#### Scenario: A companion effect example

- **WHEN** the caster's valid ranks start at one
- **THEN** its example does not use rank zero
- **AND** the selected rank does not replace the skill's actual learning requirements

#### Scenario: The data changes

- **WHEN** a game update changes a coefficient
- **THEN** the rebuilt example computes its result from the new coefficient

### Requirement: Readers can rerun an example with their own numbers

A calculation whose result depends on the reader's character or choices SHALL offer editable inputs that rerun the same computation as the reader types. Each input SHALL be a value the reader can read in the game, such as the Attack Power the character window shows. Inputs that describe the reader's character SHALL persist in the browser across pages and update every calculation on the page until the reader resets them. Without scripts, the static example SHALL remain. A calculator SHALL cover the reader's side only and SHALL NOT model a target's defenses.

#### Scenario: A reader enters their maximum Health

- **WHEN** a reader enters their maximum Health in one skill's example
- **THEN** every other example on the site that uses maximum Health uses that value until the reader resets it

#### Scenario: Scripts are disabled

- **WHEN** a page renders without scripts
- **THEN** the worked example is shown with its default inputs and no inputs are offered

### Requirement: A general rule is stated once

Shared combat calculations SHALL live on the combat page. Skill pages SHALL link to them while retaining local quantitative rules needed to understand the skill. Resistance explanations SHALL retain the rate, Accuracy interaction and chance limit. Partial-cleanse explanations SHALL retain the guaranteed layer, two independent extra-layer chances, skill-specific base chance, Accuracy scaling and limits.

#### Scenario: A skill can be resisted or partly cleansed

- **WHEN** its card identifies resistance or partial cleansing
- **THEN** the local explanation retains the quantitative mechanics
- **AND** a shared-calculation link does not replace them with a generic possibility

#### Scenario: A damage skill page

- **WHEN** a page describes what happens to its hits
- **THEN** it names the relevant defenses and links to shared combat calculations
- **AND** it retains applicable local resistance rates, Accuracy scaling and limits

#### Scenario: A spell page

- **WHEN** a page describes casting time
- **THEN** it gives the skill's casting time and relevant haste effect
- **AND** it links to the shared timing calculation without requiring a redundant example

### Requirement: Formulas are readable

Formula text SHALL use the body font at no less than 14 CSS pixels, not monospace code styling.

#### Scenario: A formula renders on a phone

- **WHEN** a calculation renders at 390 CSS pixels wide
- **THEN** its text stays at least 14 CSS pixels and the page does not scroll sideways
