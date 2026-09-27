## ADDED Requirements

### Requirement: Class pages include utility skills

A class page SHALL list every non-veteran skill that the game gives the class after its combat tree, such as Fishing, Mining, and Teleport, in a Utility category after Mastery and before Veteran. The internal placeholder skill SHALL NOT appear.

#### Scenario: A player looks for Teleport

- **WHEN** a player opens a class page
- **THEN** the Utility category lists Teleport and the gathering and crafting skills of that class

#### Scenario: The placeholder skill is not shown

- **WHEN** the class has the game's placeholder skill in its skill list
- **THEN** the class page does not list it

### Requirement: The class skill table shows learning requirements

The class skill table SHALL show, for each skill, the character level required for its first rank and each prerequisite skill with its required rank.

#### Scenario: A skill has a prerequisite

- **WHEN** a skill requires another skill at a specified rank
- **THEN** its row names the prerequisite skill and that rank
