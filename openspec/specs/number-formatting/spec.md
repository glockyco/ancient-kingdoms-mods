# number-formatting Specification

## Purpose

Keep player-facing numeric quantities consistent across website pages, interactive results and generated item tooltips without depending on the reader's locale.

## Requirements

### Requirement: Numeric quantities use one grouping and decimal convention

The website SHALL group the integer portion of every displayed numeric quantity of magnitude at least 1000 in groups of three using U+202F narrow no-break spaces. Decimal fractions SHALL use `.`. The convention SHALL apply to prices, counts, XP, health, statistics, recipe amounts, supporting prose and generated item-tooltip sell prices. Values below 1000 SHALL have no grouping separator. Display formatting SHALL preserve the intended value, precision, sign and unit.

#### Scenario: A reader compares quantities across surfaces

- **WHEN** a page shows a price of 12500 gold, a health value of 12500 and a stack limit of 9999
- **THEN** the numeric portions read `12 500`, `12 500` and `9 999`, with U+202F between digit groups
- **AND** a recipe quantity of 3000 uses the same grouping while retaining its amount prefix

#### Scenario: A quantity includes a fraction or negative sign

- **WHEN** a displayed value is negative 1234.5 at one decimal place
- **THEN** its digit groups are separated by U+202F and its decimal fraction remains `.5`
- **AND** existing sign semantics and requested precision remain intact

#### Scenario: A tooltip displays a sell price

- **WHEN** an item tooltip shows a sell price of 12345
- **THEN** it uses `12 345` with the same separator as the item's price elsewhere on the site

### Requirement: Ranges use one separator

Every displayed range SHALL join its two bounds with a hyphen and a space on each side, as in `25 - 38`, and SHALL NOT use an en dash, a closed hyphen or the word "to" between bounds. Each bound SHALL keep its own unit and the grouping of the quantity rule. Prose that reads "from X to Y" MAY keep its words.

#### Scenario: A column mixes small and grouped ranges

- **WHEN** a gold column shows chests worth 600 to 799 and 1000 to 1199 gold
- **THEN** the cells read `600 - 799` and `1 000 - 1 199`, with U+202F only inside the grouped numbers

#### Scenario: A range has units

- **WHEN** a fishing chance varies from 0.6% to 1.9% per cast
- **THEN** the cell reads `0.6% - 1.9%`

### Requirement: Numeric presentation does not depend on rendering locale

Prerendered HTML and browser-rendered content SHALL use the same numeric display convention regardless of the build environment's locale or the visitor's language settings. Changing page, sorting, filtering or updating a calculator SHALL NOT change the convention.

#### Scenario: A visitor opens another table page

- **WHEN** a visitor whose locale normally uses decimal commas advances from prerendered table rows to browser-rendered rows
- **THEN** both sets of rows use U+202F grouping and `.` decimal fractions

### Requirement: Formatting stays at display boundaries

Numeric sorting, calculations, filters and editable numeric controls SHALL retain their numeric inputs and behavior. IDs, URLs, dates, versions and source-code citations SHALL NOT be rewritten as grouped quantities.

#### Scenario: A reader sorts grouped values

- **WHEN** a table displays 999 and 10000 with the numeric convention and the reader sorts that column ascending
- **THEN** 999 sorts before 10000 using numeric values, not their formatted strings

#### Scenario: A reader changes a calculator input

- **WHEN** a reader edits a numeric input and views its formatted result
- **THEN** the input remains valid for that control and the result alone uses display grouping
