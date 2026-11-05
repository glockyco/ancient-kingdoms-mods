## MODIFIED Requirements

### Requirement: Automatic installs load in the same start

With "Install updates for me", the updater SHALL check before MelonLoader loads mods and install a higher version so that the game loads it in that start. It SHALL wait for the download at most 10 seconds. A download still running then SHALL finish while the game runs and load at the next start. The updater SHALL update the DLL in `Mods` whose `MelonInfo` names Pocket Compendium, whatever its file name.

#### Scenario: A new version at start

- **WHEN** 1.0.3 is out, 1.0.2 is installed and the game starts
- **THEN** the game runs 1.0.3 in that start, and the start screen says "Pocket Compendium updated to 1.0.3"

#### Scenario: A slow connection

- **WHEN** the download is not done after 10 seconds
- **THEN** the game starts with the installed version, and the next start runs the new one

#### Scenario: A mod saved under another name

- **WHEN** 1.2.1 is out and 1.2.0 is installed as `Mods/PocketCompendium (1).dll`
- **THEN** the updater replaces that file with 1.2.1, and the game runs 1.2.1
