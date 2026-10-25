## ADDED Requirements

### Requirement: Copy leads with the player's outcome

Copy SHALL open with what the player gets, does or must avoid, in the game's vocabulary and with exact numbers. It SHALL state a derived number only when the player lacks an input to compute it, such as real minutes per game-time window, and SHALL NOT spell out arithmetic a player does at a glance, such as kills per token from a drop chance. It SHALL NOT open with a generic description of the game, restate a heading or the table beside it, decorate facts with flavour verbs, or explain an internal mechanism unless that mechanism changes what the player can do.

#### Scenario: A section introduces a table

- **WHEN** a section shows a table of monster spawns
- **THEN** its sentence states what the table does not, such as the season and spawn hours shared by every row
- **AND** it does not repeat the table's rows in prose

#### Scenario: A time depends on how the server works

- **WHEN** the page says when an event starts or ends
- **THEN** it gives the time in the reader's time zone
- **AND** it does not explain UTC date handling or the server's hourly date check

#### Scenario: A chance is simple arithmetic

- **WHEN** a currency drops with a 20% chance per kill
- **THEN** the copy gives the chance
- **AND** it does not add the average number of kills per token

#### Scenario: A time needs a conversion the player cannot do

- **WHEN** monsters spawn from 20:00 to 08:00 game time
- **THEN** the copy also gives the 30 real minutes in every hour that the window lasts

### Requirement: Headings and sentences state facts plainly

A heading SHALL name its content in the terms the site already uses for it. Copy SHALL state facts in the third person or as conditions, and SHALL NOT address the reader with slogans, advice or marketing imperatives. A label SHALL say what a value is, so no footnote has to explain a column.

#### Scenario: A card holds a spawn table

- **WHEN** a card shows where seasonal monsters spawn
- **THEN** its heading is "Spawns", as on monster pages
- **AND** it is not a question or a call to action such as "Where to hunt"

#### Scenario: A summary describes a currency

- **WHEN** a page says what a seasonal currency is for
- **THEN** it says what the currency buys and during which events
- **AND** it does not use a vague verb such as "works" or an imperative such as "Spend tokens on treats"

### Requirement: Pitfalls are stated where the choice is made

Copy SHALL state a rule that wastes a player's resource or time beside the place where the player makes that choice.

#### Scenario: Double XP does not stack

- **WHEN** a page explains a season's Double XP
- **THEN** it says that drinking an Elixir of Enlightened Learning during the season adds nothing

#### Scenario: Seasonal treats replace each other

- **WHEN** a page lists the seasonal treats
- **THEN** it says that eating a second treat ends the first
- **AND** it says that treats stack with ordinary food and drink
