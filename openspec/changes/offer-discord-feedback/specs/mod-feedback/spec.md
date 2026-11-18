## MODIFIED Requirements

### Requirement: The report action prepares a report

The report action SHALL copy the details to the clipboard and then show the About page with three places to report: the problem form on GitHub with its details field filled in, the #compendium channel on the game's Discord and a direct message to wow_much. It SHALL then show where `MelonLoader/Latest.log` is, with a way to open its folder.

#### Scenario: Reporting from the game

- **WHEN** the player uses the report action
- **THEN** the clipboard holds the details
- **AND** the About page reads "Your setup's details are on your clipboard. Choose where to report, and paste them in:" over a GitHub row, a Discord Server row for #compendium and a Discord DM row for wow_much
- **AND** the page names the log file and can open its folder

#### Scenario: Reporting on GitHub

- **WHEN** the player uses the report action and then the GitHub row
- **THEN** the browser shows the problem form with the details filled in

#### Scenario: Reporting on Discord

- **WHEN** the player uses the report action and then the Discord Server row or the Discord DM row
- **THEN** the browser opens the game's Discord invite or wow_much's Discord profile
- **AND** the clipboard still holds the details

#### Scenario: The browser does not open

- **WHEN** the system opens no browser for a row
- **THEN** the clipboard still holds the details and the page still names the log file

### Requirement: The problem form takes the details

The problem form SHALL require only what went wrong, SHALL have the details field that the report action fills, SHALL show that field as plain text in the posted issue, and SHALL offer a field for screenshots or the log file that says where the log is and that it can contain the Windows user name. It SHALL name the #compendium channel on the game's Discord and a direct message to wow_much as the other places to report. Every problem report SHALL carry the labels `bug` and `mods`.

#### Scenario: Opening the form from the README

- **WHEN** a player opens the problem form from the README
- **THEN** only what went wrong needs an answer, and the form says where the log file is

#### Scenario: A player without a GitHub account

- **WHEN** a player without a GitHub account reads the problem form
- **THEN** the form names the #compendium channel on the game's Discord and a direct message to wow_much as places to report instead

#### Scenario: A posted report with frames

- **WHEN** a player posts details that hold frames
- **THEN** the issue shows each frame on its own line with every character as written

### Requirement: The README names where to report

The README SHALL have its own section on problems and ideas that names the three places to report, a form on GitHub, the #compendium channel on the game's Discord and a direct message to wow_much, and names the About page's report and idea actions, which copy the setup's details.

#### Scenario: Reading the README

- **WHEN** a player looks in the README for where to report a problem
- **THEN** they find a section that names the three places, links the forms and the Discord, and names the About page's actions

### Requirement: A stopped feature makes itself known

When a feature stops after an error, a card SHALL show until the player closes it, titled with the feature, such as "World markers stopped", over "An error turned it off.", with a Report button that takes the report action and a "Turn on again" button. Neither the game's message band nor the chat SHALL carry a line about the stop. The other features SHALL keep running.

#### Scenario: Map pins stop

- **WHEN** Map pins throws during an update
- **THEN** a card reads "Map pins stopped" over "An error turned it off." with Report and "Turn on again"
- **AND** the boss list keeps updating

#### Scenario: Reporting from the card

- **WHEN** the player clicks Report on the card for Map pins
- **THEN** the clipboard holds the details and the settings window shows the About page with the three places to report

#### Scenario: Turning a feature on again

- **WHEN** the player clicks "Turn on again" on the card for Map pins
- **THEN** the card closes and map pins draw again
