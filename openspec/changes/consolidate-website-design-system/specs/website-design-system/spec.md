## Purpose

The website design system keeps dense game reference pages readable and consistent across themes and viewport sizes without imposing one layout on specialized content.

## ADDED Requirements

### Requirement: Readable text at its rendered size
The website SHALL render informational text at no less than 14 CSS pixels at supported desktop and phone sizes. This includes formulas, chart labels, chips, table headings and values, controls, and supporting captions. Responsive scaling SHALL NOT reduce the visible size of text inside charts below this floor.

#### Scenario: A reader views a chart on a phone
- **WHEN** a reader opens a profession curve or mechanics chart at 390×844
- **THEN** axis labels, thresholds, legends, and values remain readable at a rendered size of at least 14 CSS pixels
- **AND** the chart remains navigable without clipping essential information

#### Scenario: A reader views a dense reference page
- **WHEN** a reader opens a formula, data table, or interactive control at 1440×900 or 390×844
- **THEN** its visible text meets the same minimum size without hiding content or changing factual values

### Requirement: State text has sufficient contrast
Text conveying a probability, status, result, or category SHALL achieve at least 4.5:1 contrast against its actual background in light and dark mode. Meaning SHALL remain available without relying only on hue. Essential non-text state indicators and focus boundaries SHALL achieve at least 3:1 against adjacent colors.

#### Scenario: A reader compares state values in light mode
- **WHEN** the reader views gathering chances, altar calculations, or experience growth labels in light mode
- **THEN** the labels meet text contrast requirements and their state remains identifiable without color alone

#### Scenario: A reader changes theme
- **WHEN** the reader changes between light and dark mode
- **THEN** semantic state, link, focus, and supporting text remain distinguishable against their rendered surfaces

### Requirement: Declared tokens match rendered link and achievement colors
The reference-link and achievement colors declared in `website/DESIGN.md` SHALL have corresponding light- and dark-theme roles in the applied website styles. Ordinary compendium links SHALL use the reference-link role. Achievement markers SHALL keep their existing category meaning.

#### Scenario: A reader follows a reference link
- **WHEN** a reference link appears in a card, prose, or table
- **THEN** its color is readable in either theme and its target and accessible name remain unchanged

#### Scenario: A reader sees an achievement marker
- **WHEN** an achievement marker uses amber
- **THEN** it remains distinct from ordinary action and reference-link colors

### Requirement: Repeated interface controls share observable states
Equivalent buttons, inputs, badges, and table headers on affected routes SHALL share sizing, focus, disabled, and theme behavior. A specialized map, chart, or dense table SHALL retain its distinct information layout.

#### Scenario: Equivalent controls appear on different routes
- **WHEN** the reader focuses or activates equivalent filters or fields on two changed routes
- **THEN** their labels, focus feedback, disabled states, and visible results follow the same contract

#### Scenario: A specialized table retains its content
- **WHEN** a dense comparison table uses shared visual roles
- **THEN** its headers, values, relationships, and keyboard access remain available

### Requirement: Visual exceptions are narrow and reviewable
The website SHALL distinguish semantic interface roles from documented chart, map, tooltip, quality, game-art, and page-specific colors. New ordinary interface colors or generated style classes SHALL be reviewed against those roles rather than silently bypassing them.

#### Scenario: A new route introduces a color
- **WHEN** a developer adds a literal color or a generated style class to a shared reference surface
- **THEN** the website checks either reject the unapproved use or record a narrowly scoped semantic exception
