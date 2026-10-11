# Spec Delta

## Purpose

Defines how the compendium presents a game formula so a reader can follow it without translating notation, trust its numbers, and try it with their own character.

## ADDED Requirements

### Requirement: Formulas are worded steps

A formula SHALL be presented as named steps. Each step SHALL name the quantity it produces in game terms and state how the game computes it in words, naming real stats and earlier steps. Visible text SHALL NOT use single-letter variables, code identifiers, or function notation such as `round()`, `clamp()`, `min()`, or `max()`. Operators SHALL be written as ×, ÷, +, and −.

#### Scenario: A formula has an intermediate quantity

- **WHEN** a formula uses an intermediate result, such as the Health a skill spends
- **THEN** a step names that result in words, such as "Health spent"
- **AND** later steps refer to it by that name, not by a letter

#### Scenario: A formula has a bound

- **WHEN** the game limits a value
- **THEN** the step states the limit in words, such as "at most 90%" or "between 0% and 90%"

### Requirement: Units are the reader's units

Multipliers and per-point coefficients SHALL be stated as percentages, such as "0.4% per point", not decimal fractions. A change to a chance SHALL be stated in percentage points. Durations SHALL use seconds and distances yards. A skill's level SHALL be called its rank.

#### Scenario: A coefficient is a fraction in the game code

- **WHEN** the game multiplies a stat by 0.004
- **THEN** the page states 0.4% per point

### Requirement: Rounding is stated where it happens

Each step that produces a whole number SHALL say how it rounds, as "rounded", "rounded down", or "rounded up". Wherever a calculation rounds to the nearest whole number, the page SHALL state that exact halves round to the even number.

#### Scenario: A step rounds to the nearest whole number

- **WHEN** a calculation contains a step the game rounds to the nearest integer
- **THEN** the step says "rounded"
- **AND** the calculation states that exact halves round to the even number

### Requirement: Worked examples use the game's arithmetic

A calculation whose outcome depends on numbers SHALL show a worked example. The example SHALL state its inputs, give the outcome first, and then show the substituted arithmetic. It SHALL be computed from the published data with the game's arithmetic, including single-precision intermediate values and the game's rounding, and SHALL NOT be typed by hand.

#### Scenario: The data changes

- **WHEN** a game update changes a coefficient the example uses
- **THEN** the rebuilt page shows an example computed with the new coefficient

### Requirement: Readers can rerun an example with their own numbers

An example whose outcome depends on the reader's character or choices SHALL offer editable inputs that rerun the same computation as the reader types. Inputs that describe the reader's character SHALL persist in the browser across pages until the reader resets them. Without scripts, the static example SHALL remain. A calculator SHALL cover the reader's side only and SHALL NOT model a target's defenses.

#### Scenario: A reader enters their maximum Health

- **WHEN** a reader enters their maximum Health in one skill's example
- **THEN** every other example on the site that uses maximum Health uses that value until the reader resets it

#### Scenario: Scripts are disabled

- **WHEN** a page renders without scripts
- **THEN** the worked example is shown with its default inputs and no inputs are offered

### Requirement: A general rule is stated once

A page that applies a general combat rule SHALL link to the section that states it, instead of restating its formula. The damage pipeline, resistance and mitigation, and combat advantage rules SHALL be stated on the combat page.

#### Scenario: A damage skill page

- **WHEN** a damage skill page describes what happens to its hits
- **THEN** it names the stat its damage meets and links to the combat page sections for the pipeline and resistance
- **AND** it does not repeat their formulas

### Requirement: Formulas are readable

Formula text SHALL use the body font at no less than 14 CSS pixels, not monospace code styling.

#### Scenario: A formula renders on a phone

- **WHEN** a calculation renders at 390 CSS pixels wide
- **THEN** its text stays at least 14 CSS pixels and the page does not scroll sideways
