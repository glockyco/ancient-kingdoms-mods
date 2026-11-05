# mod-feedback Specification

## Purpose
Defines how a player reports a Pocket Compendium problem or suggests an idea from the game, what a report carries, and how a feature that stopped after an error makes itself known.

## Requirements

### Requirement: The report action prepares a report

The report action SHALL open the repository's problem form in the browser with its details field filled in, copy the same details to the clipboard, and then show where `MelonLoader/Latest.log` is, with a way to open its folder.

#### Scenario: Reporting from the game

- **WHEN** the player uses the report action
- **THEN** the browser shows the problem form with the details filled in
- **AND** the clipboard holds the same details
- **AND** the settings window names the log file and can open its folder

#### Scenario: The browser does not open

- **WHEN** the system opens no browser for the link
- **THEN** the clipboard still holds the details and the settings window still names the log file

### Requirement: Details describe the setup

The details SHALL name Pocket Compendium's version and build, the game version, the MelonLoader version, the system as Windows or as Wine on macOS or Linux, the game language, whether the player plays alone, hosts a world or joined one, how many worlds the player entered since the game started, the other mods MelonLoader loaded with their versions, the features switched off, and the errors Pocket Compendium logged since the game started.

#### Scenario: A stopped feature on a Mac

- **WHEN** Map pins stopped after an error on a Mac with CrossOver and the player reports
- **THEN** the details name Wine on macOS and list the error that stopped Map pins

#### Scenario: Nothing failed

- **WHEN** Pocket Compendium logged no error and the player reports
- **THEN** the details say that there were no errors

### Requirement: Details stay impersonal

The details SHALL NOT contain a server address, a character name or a file path.

#### Scenario: Reporting from a friend's world

- **WHEN** the player reports while in a world another player hosts
- **THEN** the details say the player joined a world and name neither its address nor the character

### Requirement: Long details still open the form

The link SHALL stay within the length GitHub accepts by shortening error lines and leaving out frames. The clipboard SHALL hold the full details.

#### Scenario: Several stopped features

- **WHEN** five features stopped with long errors
- **THEN** the form opens with shortened error lines
- **AND** the clipboard holds every error in full with its frames

### Requirement: The problem form takes the details

The problem form SHALL require only what went wrong, SHALL have the details field that the report action fills, SHALL show that field as plain text in the posted issue, and SHALL offer a field for screenshots or the log file that says where the log is and that it can contain the Windows user name. It SHALL name the compendium channel on the game's Discord as the place to post without a GitHub account. Every problem report SHALL carry the labels `bug` and `mods`.

#### Scenario: Opening the form from the README

- **WHEN** a player opens the problem form from the README
- **THEN** only what went wrong needs an answer, and the form says where the log file is

#### Scenario: A player without a GitHub account

- **WHEN** a player without a GitHub account reads the problem form
- **THEN** the form names the compendium channel on the game's Discord as the place to post instead

#### Scenario: A posted report with frames

- **WHEN** a player posts details that hold frames
- **THEN** the issue shows each frame on its own line with every character as written

### Requirement: The idea action opens the ideas form

The idea action SHALL open the repository's ideas form in the browser. The ideas form SHALL first ask, in its only required field, what the player would like to do in the game and what gets in the way, then offer optional fields for the player's idea and screenshots. It SHALL NOT ask for versions, logs or other details of the player's setup. Every idea SHALL carry the labels `enhancement` and `mods`.

#### Scenario: Suggesting an idea

- **WHEN** the player uses the idea action
- **THEN** the browser shows the ideas form, which asks first what the player would like to do and what gets in the way, and asks for no version or log

### Requirement: The README names where to report

The README SHALL have its own section on problems and ideas that names the About page's report and idea actions, links the issue forms on GitHub, and names the compendium channel on the game's Discord for players without a GitHub account.

#### Scenario: Reading the README

- **WHEN** a player looks in the README for where to report a problem
- **THEN** they find a section that names the About page's actions, links the forms and names the compendium channel on the game's Discord

### Requirement: A stopped feature makes itself known

When a feature stops after an error, a card SHALL show until the player closes it, titled with the feature, such as "World markers stopped", over "An error turned it off.", with a Report button that takes the report action and a "Turn on again" button. Neither the game's message band nor the chat SHALL carry a line about the stop. The other features SHALL keep running.

#### Scenario: Map pins stop

- **WHEN** Map pins throws during an update
- **THEN** a card reads "Map pins stopped" over "An error turned it off." with Report and "Turn on again"
- **AND** the boss list keeps updating

#### Scenario: Turning a feature on again

- **WHEN** the player clicks "Turn on again" on the card for Map pins
- **THEN** the card closes and map pins draw again

### Requirement: A stop shows one card

The card SHALL show once per feature per session, and again only after the player turned that feature back on and it stopped again.

#### Scenario: Stopping again after turning it on

- **WHEN** Map pins stops, the player turns it on again, and it throws again
- **THEN** one new card shows for Map pins

#### Scenario: Repeated errors of one stop

- **WHEN** Map pins' code throws in several places before Map pins stops
- **THEN** one card shows for Map pins

### Requirement: The log names where the player plays

On each world entry, the log SHALL record the world's number since the game started and whether the player plays alone, hosts a world or joined one.

#### Scenario: Joining a LAN world

- **WHEN** the player joins a LAN world another player hosts
- **THEN** the log has a line saying the player joined a world

#### Scenario: Entering a second world

- **WHEN** the player leaves a world and enters another without restarting the game
- **THEN** the log line of that entry names world 2

### Requirement: Details say when each error happened

For each error Pocket Compendium logged, the details SHALL say what failed and where the player was at that moment: in a world, by its number since the game started and whether they played alone, hosted it or joined it, or between worlds, after the world they left last or before the first.

#### Scenario: Map pins stop in a second world

- **WHEN** the player leaves a world, joins another player's world and Map pins throws there
- **THEN** the details say that Map pins stopped in world 2 while the player joined it

#### Scenario: An error between worlds

- **WHEN** Bestiary countdown throws after the player left their first world and before they enter another
- **THEN** the details say that it happened after world 1

### Requirement: Details locate each error

For each error Pocket Compendium logged with an exception, the details SHALL give the exception's first line, the frame that threw it and up to three Pocket Compendium frames that led there, each with its file name and line.

#### Scenario: A Unity object used after it was destroyed

- **WHEN** Map pins calls a member of a Unity object that the game destroyed
- **THEN** the details give the exception's first line, the Unity member that threw it and the Map pins frame with its file name and line

### Requirement: Details list the first five errors

The details SHALL list the first five errors Pocket Compendium logged since the game started and say how many more the log holds.

#### Scenario: Many errors

- **WHEN** Pocket Compendium logged seven errors
- **THEN** the details list the first five and say that the log holds two more

### Requirement: An error in a patch stops its feature

When Pocket Compendium's code inside a game method throws, the exception SHALL NOT reach the game. The feature that owns the code SHALL log the error once and stop, and the game SHALL then run that method as it does without Pocket Compendium.

#### Scenario: The Bestiary page code throws on every frame

- **WHEN** Pocket Compendium's code in the Bestiary page's update throws
- **THEN** the log holds one error for Bestiary pages
- **AND** Bestiary pages stops and the game draws its own pages
