# mod-updates Specification

## Purpose
Defines how Pocket Compendium asks whether it may check for new versions, how it announces and installs them, and what it sends to the website.

## Requirements

### Requirement: The mod asks before it contacts the website

At its first start, Pocket Compendium SHALL ask on the start screen how to handle updates, with the answers "Install updates for me", "Only tell me about updates" and "Don't check for updates", the first highlighted. A player of an earlier version SHALL be asked once, at the first start of the version that adds the question. Until the player answers, neither Pocket Compendium nor its updater SHALL contact the website.

#### Scenario: First start

- **WHEN** Pocket Compendium starts for the first time
- **THEN** the start screen shows the question with "Install updates for me" highlighted
- **AND** no request reaches the website before the player continues

#### Scenario: The game closes before an answer

- **WHEN** the player quits the game while the question is open
- **THEN** the next start asks again, and nothing was sent

#### Scenario: A player of 1.0.2

- **WHEN** a player who ran 1.0.2 starts the version that adds the question
- **THEN** the start screen asks once, and later starts do not

### Requirement: The question answers to keyboard and gamepad

The first-start question SHALL be answerable without a mouse. The arrow keys and the gamepad's directional buttons SHALL move the highlight between the answers, and the confirm key or button SHALL continue with the highlighted answer.

#### Scenario: A Steam Deck player without a mouse

- **WHEN** a player presses down once and then the confirm button
- **THEN** the mod continues with "Only tell me about updates"

### Requirement: Without checks nothing is sent

With "Don't check for updates", Pocket Compendium and its updater SHALL send no request to the website.

#### Scenario: Checks are off

- **WHEN** the answer is "Don't check for updates" and the game starts
- **THEN** no request from Pocket Compendium or its updater reaches the website

### Requirement: Requests carry nothing about the player

Every request SHALL download the mod list, its signature or a mod file, and SHALL carry no identifier, version, setting or game data in its address or headers.

#### Scenario: A check

- **WHEN** Pocket Compendium checks for a new version
- **THEN** each request names only the file it downloads

### Requirement: Only a signed list and a matching file install

Pocket Compendium and its updater SHALL use the mod list only when its signature verifies against the public key built into Pocket Compendium, and SHALL install a file only when its SHA-256 equals the one that list names. A list or file that fails SHALL install nothing and SHALL NOT be offered as a download.

#### Scenario: A changed list

- **WHEN** the mod list on the website differs from the list its signature covers
- **THEN** nothing installs, no card appears, and the Updates page says the check failed

#### Scenario: A changed file

- **WHEN** the downloaded DLL's SHA-256 differs from the signed list's
- **THEN** the file is discarded and the installed version stays

### Requirement: Only a higher version installs

A version SHALL install, or show as out, only when its version number is higher than the running Pocket Compendium's.

#### Scenario: A development build

- **WHEN** the running build names the same version as the website or a higher one
- **THEN** nothing installs and no card offers a version

### Requirement: Automatic installs load in the same start

With "Install updates for me", the updater SHALL check before MelonLoader loads mods and install a higher version so that the game loads it in that start. It SHALL wait for the download at most 10 seconds. A download still running then SHALL finish while the game runs and install at the next start, before that start checks again.

#### Scenario: A new version at start

- **WHEN** 1.0.3 is out, 1.0.2 is installed and the game starts
- **THEN** the game runs 1.0.3 in that start, and the start screen says "Pocket Compendium updated to 1.0.3"

#### Scenario: A slow connection

- **WHEN** the download is not done after 10 seconds
- **THEN** the game starts with the installed version, and the next start installs the download and runs it, however slow the connection is then

### Requirement: Pocket Compendium writes its updater

When the player chooses "Install updates for me", or clicks Install, Pocket Compendium SHALL write its updater into the game's `Plugins` folder and keep the updater's code current with its own version. It SHALL also write the updater when a newer copy of itself waits in the Mods folder. With "Don't check for updates" the updater SHALL NOT contact the website.

#### Scenario: The answer at first start

- **WHEN** the player chooses "Install updates for me"
- **THEN** `Plugins` holds the updater before the next start

#### Scenario: An updated mod

- **WHEN** a new Pocket Compendium loads
- **THEN** the updater runs that version's update code from the next start on

### Requirement: The start screen announces versions

Pocket Compendium SHALL show a card at the bottom left of the start screen's main menu, above the game's version, and SHALL NOT show it elsewhere. It SHALL offer a higher version with Install and Later when the answer is "Only tell me about updates", and SHALL say once that an update loaded. Later SHALL hide the card until the next start.

#### Scenario: A version is out

- **WHEN** the answer is "Only tell me about updates" and 1.0.3 is out
- **THEN** the card says "Pocket Compendium 1.0.3 is out" with what changed, Install and Later

#### Scenario: Install succeeds

- **WHEN** the player clicks Install and the download verifies
- **THEN** the card says "Pocket Compendium 1.0.3 is downloaded" and "It loads the next time you start the game."

#### Scenario: Install fails

- **WHEN** the player clicks Install and the file cannot be written
- **THEN** the card says "Couldn't install Pocket Compendium 1.0.3" and "Download it from the website instead.", and Download opens the website's mods page

#### Scenario: An update loaded

- **WHEN** the running version is higher than the one that ran before
- **THEN** the card says "Pocket Compendium updated to 1.0.3" with what changed, once

### Requirement: Notices list what changed

A card or the Updates page SHALL list the changes of every version newer than the one compared against, newest version first, one line each. With more than one version, each line SHALL start with its version. A card SHALL show at most three lines and then say how many more changes there are. The Updates page SHALL show every line.

#### Scenario: One version with one change

- **WHEN** 1.0.3 is out with the change "Fixes the stutter while walking."
- **THEN** the card's line reads "Fixes the stutter while walking."

#### Scenario: Two versions with four changes

- **WHEN** 1.0.4 has three changes and 1.0.3 has one
- **THEN** the card shows the three lines of 1.0.4, each starting "1.0.4: ", then "And 1 more change."

### Requirement: The Updates page holds the answer and a status

The settings window SHALL have an Updates page before About with the three answers of the first-start question in the same words, the first with the help "Updates install while the game starts." Above them, a status line SHALL say whether the mod is up to date, a version is out, one is downloaded, or a check or install failed. With "Don't check for updates" there SHALL be no status line.

#### Scenario: Up to date

- **WHEN** the last check found no higher version
- **THEN** the page says "Pocket Compendium 1.0.2 is up to date."

#### Scenario: A version is out

- **WHEN** the answer is "Only tell me about updates" and 1.0.3 is out
- **THEN** the page says "Pocket Compendium 1.0.3 is out." with Install and what changed

#### Scenario: A failed check

- **WHEN** the website could not be reached or its list failed verification
- **THEN** the page says "Couldn't check for updates. Pocket Compendium tries again the next time the game starts."

#### Scenario: A failed install

- **WHEN** a verified file could not be written
- **THEN** the page says "Couldn't install Pocket Compendium 1.0.3." with a Download button

### Requirement: Failed checks stay quiet and failed installs speak up

A failed check SHALL show no card, SHALL be recorded in the MelonLoader log, and SHALL be tried again at the next start. An install that failed, or a download still waiting when a start begins without an updater that ran, SHALL show the card "Couldn't install Pocket Compendium" with its version and Download, and SHALL be recorded in the log.

#### Scenario: Offline

- **WHEN** the game starts without a network connection
- **THEN** no card appears, the log records the failed check, and the next start checks again

#### Scenario: The updater is missing

- **WHEN** 1.2.2 waits in the updates folder, the updater is not in `Plugins` and the game starts with 1.2.1
- **THEN** the start screen says "Couldn't install Pocket Compendium 1.2.2" with Download

### Requirement: Older versions still hear of the release

The mod list SHALL keep the fields that Pocket Compendium 1.0.2 and older read, so that their chat line announces the first version that updates itself.

#### Scenario: A player of 1.0.2 after the release

- **WHEN** a player of 1.0.2 enters the world after the release
- **THEN** chat says "A new Pocket Compendium is out. Press F8 and open About to download it."

### Requirement: The updater leaves one copy of the mod

The updater SHALL count every DLL in `Mods` whose `MelonInfo` names Pocket Compendium as installed, whatever its file name. Before mods load it SHALL leave one copy, `Mods/PocketCompendium.dll`, with the newest version among them and an intact waiting download, because MelonLoader loads only one of several copies, the first by name. A copy without a readable version SHALL count as the oldest. Without any copy the updater SHALL install nothing.

#### Scenario: A mod saved under another name

- **WHEN** 1.2.1 is installed as `Mods/PocketCompendium (1).dll` and 1.2.2 is out
- **THEN** the updater installs 1.2.2 as `Mods/PocketCompendium.dll`, removes the other file, and the game runs 1.2.2 in that start

#### Scenario: A broken file

- **WHEN** `Mods/PocketCompendium.dll` is not a readable mod and 1.2.2 waits in the updates folder
- **THEN** the updater replaces the file with 1.2.2

### Requirement: The running mod clears older copies

Pocket Compendium SHALL remove older copies of itself beside the one that runs. When a newer copy waits beside it, it SHALL write the updater and say that the newer version loads at the next start.

#### Scenario: An older copy loads first

- **WHEN** `Mods` holds 1.2.1 as `PocketCompendium (1).dll` and 1.2.2 as `PocketCompendium.dll`, and the game starts with 1.2.1
- **THEN** the start screen says "Pocket Compendium 1.2.2 is downloaded", and the next start runs 1.2.2 with one copy left

### Requirement: A changed answer stops the old one's work

When the player changes the answer, a check or download started for the old answer SHALL stop, and its result SHALL NOT stage a file, show a card or change the status.

#### Scenario: Switching to "Don't check for updates" during a download

- **WHEN** a check under "Install updates for me" is downloading and the player chooses "Don't check for updates"
- **THEN** the download stops, nothing waits in the updates folder, and no card appears

### Requirement: The website serves one list per deploy

The website SHALL serve the mod list and its signature without letting any cache keep them, and SHALL serve each version's DLL at an address of its own, which the list names, so a check never pairs a list with a file or signature from another deploy. The download buttons SHALL keep `/mods/PocketCompendium.dll`.

#### Scenario: A check right after a deploy

- **WHEN** 1.2.3 is deployed and a player's game checks a minute later
- **THEN** the list names 1.2.3 at `/mods/1.2.3/PocketCompendium.dll`, and its signature verifies
