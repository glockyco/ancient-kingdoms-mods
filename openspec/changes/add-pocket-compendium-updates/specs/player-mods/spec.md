# Spec Delta

## MODIFIED Requirements

### Requirement: One player download

The player features SHALL ship as one DLL, Pocket Compendium, in place of BossTracker, BossSkillTracker and BetterBestiary. FieldDefaultValueHookFix SHALL stay a separate download. Pocket Compendium's updater SHALL come inside Pocket Compendium, which writes it into the game's `Plugins` folder itself, so installing the mod never needs a second file.

#### Scenario: Download tables

- **WHEN** a player reads the download table on the front page or in the mod catalogue
- **THEN** it lists Pocket Compendium and FieldDefaultValueHookFix, and no BossTracker, BossSkillTracker or BetterBestiary

#### Scenario: Installing with updates

- **WHEN** a player installs only `PocketCompendium.dll` and answers "Install updates for me"
- **THEN** Pocket Compendium puts its updater into `Plugins` without the player copying a file

## ADDED Requirements

### Requirement: The mod list names each release's changes

The published mod list SHALL carry, for each release a mod lists in the repository's mod registry, its version and the list of its changes, and SHALL keep the fields it carries today. Once a mod lists releases, a publish SHALL fail, keeping the current downloads, when its newest tagged version has no release with at least one change.

#### Scenario: A release with its changes

- **WHEN** the registry lists 1.0.3 with the change "Fixes the stutter while walking."
- **THEN** the published list names that change under 1.0.3

#### Scenario: A release without changes

- **WHEN** the registry lists releases for Pocket Compendium, the newest tag is 1.0.3 and no release names 1.0.3
- **THEN** the publish fails and the downloads published before stay in place

### Requirement: A deploy publishes a signed mod list

A deploy SHALL publish the mod list together with a signature made with the release key, and SHALL fail without a valid one. A local build without the key SHALL still build, with an unsigned list.

#### Scenario: A deploy without the key

- **WHEN** a deploy runs and no release key is given
- **THEN** the deploy stops before anything is uploaded

#### Scenario: A development server

- **WHEN** `pnpm dev` runs without the key
- **THEN** the site builds, and the mod list it serves has no signature
