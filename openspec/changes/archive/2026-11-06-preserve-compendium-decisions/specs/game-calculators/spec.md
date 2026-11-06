## ADDED Requirements

### Requirement: Calculation choices belong to their page

A page SHALL offer a choice that changes its calculation, such as a blessing, on that page only. Calculator inputs SHALL NOT be shared across pages.

#### Scenario: A reader changes a blessing

- **WHEN** a reader changes a blessing input on a calculation page and opens another page
- **THEN** the other page does not inherit that input

### Requirement: Calculations do not rank routes by effort

Pages SHALL NOT publish best, fastest or effort-per-rank figures because keeping those rankings current is outside the compendium's scope.

#### Scenario: A profession page explains rank progression

- **WHEN** the page presents progression mechanics
- **THEN** it does not rank routes by fastest progress or effort per rank
