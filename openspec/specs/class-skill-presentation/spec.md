# Class Skill Presentation Specification

## Purpose

Define how class pages preserve the game's skill progression so players can find every class skill in the section where the game presents it.

## Requirements

### Requirement: Class skills follow the authoritative progression order

A class page SHALL order its skills by the progression order defined for that class in the game. The compendium SHALL preserve this order separately for each class when a skill belongs to more than one class.

#### Scenario: A player reads a class skill list

- **WHEN** the class page displays its skill table
- **THEN** the skills follow that class's authoritative progression order
- **AND** skills with the same display category keep that relative order

#### Scenario: A shared skill has different positions

- **WHEN** one skill occupies different positions in two class progression lists
- **THEN** each class page uses the position defined for that class

### Requirement: Post-tier skills are presented as masteries

A non-base, non-veteran skill that the game places after the class's tier progression SHALL be presented in a Mastery category after Tier 4. Base skills, core skills, tier skills, and veteran skills SHALL retain separate categories.

#### Scenario: Bard mastery songs are displayed

- **WHEN** the Bard class page lists Grand Symphony and Song of Varensea
- **THEN** both skills appear in the Mastery category
- **AND** the Mastery category appears after Tier 4

#### Scenario: A core skill is displayed

- **WHEN** the game places a non-tier skill before the class's tier progression
- **THEN** the class page presents it as Core rather than Mastery

#### Scenario: A veteran skill is displayed

- **WHEN** a class skill is marked as a veteran skill
- **THEN** the class page presents it as Veteran rather than Mastery
