## MODIFIED Requirements

### Requirement: Automatic installs load in the same start

With "Install updates for me", the updater SHALL check before MelonLoader loads mods and install a higher version so that the game loads it in that start. It SHALL wait for the download at most 10 seconds. A download still running then SHALL finish while the game runs and load at the next start. Every DLL in `Mods` whose `MelonInfo` names Pocket Compendium SHALL count as installed, whatever its file name. An update SHALL leave one copy, `Mods/PocketCompendium.dll`, because MelonLoader loads only one of several copies, the first by name.

#### Scenario: A new version at start

- **WHEN** 1.0.3 is out, 1.0.2 is installed and the game starts
- **THEN** the game runs 1.0.3 in that start, and the start screen says "Pocket Compendium updated to 1.0.3"

#### Scenario: A slow connection

- **WHEN** the download is not done after 10 seconds
- **THEN** the game starts with the installed version, and the next start runs the new one

#### Scenario: A mod saved under another name

- **WHEN** 1.2.1 is out and 1.2.0 is installed as `Mods/PocketCompendium (1).dll`
- **THEN** the updater installs 1.2.1 as `Mods/PocketCompendium.dll`, removes the other file, and the game runs 1.2.1

#### Scenario: Two copies installed

- **WHEN** 1.2.2 is out, and `Mods` holds 1.2.0 as `PocketCompendium (1).dll` and 1.2.1 as `PocketCompendium.dll`
- **THEN** the updater installs 1.2.2 as `PocketCompendium.dll`, removes `PocketCompendium (1).dll`, and the game runs 1.2.2
