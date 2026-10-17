## MODIFIED Requirements

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

A worked example SHALL state its inputs and computed outcome using published data and the game's arithmetic. Effect examples SHALL use a valid caster scenario through the existing fixed-caster and rank-input rules rather than a blanket highest-rank default. Learning requirements SHALL use the described or next base rank separately from effect examples.

#### Scenario: A companion effect example

- **WHEN** the caster's valid ranks start at one
- **THEN** its example does not use rank zero
- **AND** the selected rank does not replace the skill's actual learning requirements

#### Scenario: The data changes

- **WHEN** a game update changes a coefficient
- **THEN** the rebuilt example computes its result from the new coefficient

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
