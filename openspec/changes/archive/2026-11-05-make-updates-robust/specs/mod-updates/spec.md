## RENAMED Requirements

- FROM: `### Requirement: Failed checks and automatic installs stay quiet`
- TO: `### Requirement: Failed checks stay quiet and failed installs speak up`

## MODIFIED Requirements

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

### Requirement: Failed checks stay quiet and failed installs speak up

A failed check SHALL show no card, SHALL be recorded in the MelonLoader log, and SHALL be tried again at the next start. An install that failed, or a download still waiting when a start begins without an updater that ran, SHALL show the card "Couldn't install Pocket Compendium" with its version and Download, and SHALL be recorded in the log.

#### Scenario: Offline

- **WHEN** the game starts without a network connection
- **THEN** no card appears, the log records the failed check, and the next start checks again

#### Scenario: The updater is missing

- **WHEN** 1.2.2 waits in the updates folder, the updater is not in `Plugins` and the game starts with 1.2.1
- **THEN** the start screen says "Couldn't install Pocket Compendium 1.2.2" with Download

## ADDED Requirements

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
