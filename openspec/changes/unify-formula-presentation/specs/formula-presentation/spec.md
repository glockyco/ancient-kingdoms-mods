# Spec Delta

## Purpose

Defines how the compendium presents a game formula so a reader can follow it without translating notation, trust its numbers, and try it with their own character.

## ADDED Requirements

### Requirement: Formulas are worded steps

A rule that takes more than one operation SHALL be presented as named steps. A rule that takes one operation SHALL be stated as a sentence with a worked number, such as "drains 5% of your maximum Health each second, rounded, so 2,000 maximum Health loses 100". Each step SHALL name the quantity it produces in game terms and state how the game computes it in words, naming real stats and earlier steps. Visible text SHALL NOT use single-letter variables, code identifiers, or function notation such as `round()`, `clamp()`, `min()`, or `max()`. Operators SHALL be written as ×, ÷, +, and −.

#### Scenario: A one-operation rule

- **WHEN** a skill's rule multiplies one value by one percentage, such as Wild Strike's bonus on the next auto attack
- **THEN** the page states it as a sentence with a worked number
- **AND** it shows no calculation block

#### Scenario: A formula has an intermediate quantity

- **WHEN** a formula uses an intermediate result, such as the Health a skill spends
- **THEN** a step names that result in words, such as "Health spent"
- **AND** later steps refer to it by that name, not by a letter

#### Scenario: A formula has a bound

- **WHEN** the game limits a value
- **THEN** the step states the limit in words, such as "at most 90%" or "between 0% and 90%"

### Requirement: Units are the reader's units

Multipliers and per-point coefficients SHALL be stated as percentages, such as "0.4% per point", not decimal fractions. A whole-number multiplier above 10 MAY be stated as a multiple, such as "× 20", where a percentage such as 2000% would be harder to read. A change to a chance SHALL be stated in percentage points. Durations SHALL use seconds below a minute and minutes and hours from a minute up. A skill's level SHALL be called its rank.

#### Scenario: A coefficient is a fraction in the game code

- **WHEN** the game multiplies a stat by 0.004
- **THEN** the page states 0.4% per point

### Requirement: Rounding is stated where it happens

Each step or sentence that produces a whole number SHALL say how it rounds, as "rounded", "rounded down", or "rounded up". A page that rounds to the nearest whole number SHALL state once, at the first such use, that exact halves round to the even number.

#### Scenario: A page rounds in several places

- **WHEN** a page contains several calculations or sentences that round to the nearest integer
- **THEN** each says "rounded"
- **AND** the page states the exact-halves rule once, at the first of them

### Requirement: Worked examples use the game's arithmetic

A calculation whose outcome depends on numbers SHALL show a worked example. The example SHALL state its inputs, give the outcome first, and then show the substituted arithmetic. A skill's example SHALL use its highest rank unless the reader chooses another. It SHALL be computed from the published data with the game's arithmetic, including single-precision intermediate values and the game's rounding, and SHALL NOT be typed by hand.

#### Scenario: The data changes

- **WHEN** a game update changes a coefficient the example uses
- **THEN** the rebuilt page shows an example computed with the new coefficient

### Requirement: Readers can rerun an example with their own numbers

A calculation whose result depends on the reader's character or choices SHALL offer editable inputs that rerun the same computation as the reader types. Each input SHALL be a value the reader can read in the game, such as the Damage the character window shows. Inputs that describe the reader's character SHALL persist in the browser across pages and update every calculation on the page until the reader resets them. Without scripts, the static example SHALL remain. A calculator SHALL cover the reader's side only and SHALL NOT model a target's defenses.

#### Scenario: A reader enters their maximum Health

- **WHEN** a reader enters their maximum Health in one skill's example
- **THEN** every other example on the site that uses maximum Health uses that value until the reader resets it

#### Scenario: Scripts are disabled

- **WHEN** a page renders without scripts
- **THEN** the worked example is shown with its default inputs and no inputs are offered

### Requirement: A general rule is stated once

A page that applies a general combat rule SHALL link to the section that states it, instead of restating its formula. The damage pipeline, resistance and mitigation, combat advantage, cast and attack timing, lifetap, and Wild Strike rules SHALL be stated on the combat page. A skill page SHALL state only the skill's own values, such as its cast time or lifetap percentage, with a worked number.

#### Scenario: A damage skill page

- **WHEN** a damage skill page describes what happens to its hits
- **THEN** it names the stat its damage meets and links to the combat page sections for the pipeline and resistance
- **AND** it does not repeat their formulas

#### Scenario: A spell page

- **WHEN** a spell page describes its cast time
- **THEN** it gives the skill's cast time and one worked number for spell haste
- **AND** it links to the combat page's timing calculation

### Requirement: Formulas are readable

Formula text SHALL use the body font at no less than 14 CSS pixels, not monospace code styling.

#### Scenario: A formula renders on a phone

- **WHEN** a calculation renders at 390 CSS pixels wide
- **THEN** its text stays at least 14 CSS pixels and the page does not scroll sideways
