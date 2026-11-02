## ADDED Requirements

### Requirement: The mods page names the version it offers

The website's mods page SHALL name the version of the Pocket Compendium DLL it offers for download, as that DLL names itself to MelonLoader and on its About page in game. A build that cannot read the version SHALL NOT publish the download.

#### Scenario: Comparing with the installed version

- **WHEN** a player who runs Pocket Compendium 1.0.0 opens the mods page after 1.0.1 is published
- **THEN** the page names version 1.0.1
- **AND** the About page of the downloaded DLL names 1.0.1 too

#### Scenario: A DLL without a version

- **WHEN** a published mod's DLL carries no `MelonInfo` version
- **THEN** the publish fails and the downloads published before stay in place
