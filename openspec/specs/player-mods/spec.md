# player-mods Specification

## Purpose
Defines what the published player mods show in game: the BetterBestiary Bestiary page, the BossTracker list and the BossSkillTracker HUD, including language, fonts, input methods and behavior when a page cannot be drawn.

## Requirements

### Requirement: Bestiary pages reveal every monster

Pocket Compendium SHALL show a monster's full Bestiary page whether or not the player has discovered or killed it: name, level, lore, health, armor, resists, type, class, zone and loot. A loot slot SHALL show the item in full color, and hovering it SHALL show the item's complete tooltip with its stats, whether or not the item has dropped for the player.

#### Scenario: Undiscovered boss

- **WHEN** a player who has never discovered Xylevis opens its Bestiary page and hovers a loot slot
- **THEN** the page shows Xylevis's stats and lore, and the tooltip lists the item's slot, stats, durability, level requirement and price

### Requirement: Bestiary pages list every drop

The page SHALL show every drop the game lists for the monster. When a monster has more drops than the page's 12 slots, the icons SHALL shrink so that all drops fit in the loot area, in the game's drop order. While drop chances are on, an item the game lists several times SHALL show in one slot, at the position of its first entry.

#### Scenario: Boss with 17 drops

- **WHEN** the player opens the page of a boss with 17 listed drops
- **THEN** all 17 items appear, and each can be hovered for its tooltip

#### Scenario: An item listed twice with chances on

- **WHEN** drop chances are on and a boss's table lists the same item twice
- **THEN** the item appears once, where its first entry stands

### Requirement: Bestiary pages use the player's language

Wherever the game has a translation for text on the page, the page SHALL show it in the selected game language. This covers names, the level label, classes, zones, the tooltip durability line, and the Skills button, title and skill names. Text without a translation SHALL stay English, as the game shows it. Chinese and Japanese text SHALL use the game's Chinese and Japanese fonts.

#### Scenario: Chinese game language

- **WHEN** the game language is Simplified Chinese and the player opens Xylevis's page
- **THEN** the name reads 希莱维斯, the level label reads 等级, the zone reads 新月海岸, the tooltip's durability line reads 耐久：100%, and no text renders as missing glyphs

#### Scenario: Term without a translation

- **WHEN** the game language is Spanish and a monster's type is Humanoid
- **THEN** the type reads Humanoid, as in the game's own page

### Requirement: Gamepad reaches loot and skills

With a gamepad, the player SHALL be able to move focus from the monster grid to the page's loot slots and its Skills button, and back. A focused loot slot SHALL show its item tooltip. Pressing the confirm button on the Skills button SHALL open or close the Skills panel.

#### Scenario: Browsing loot with a gamepad

- **WHEN** the player focuses a monster in the grid, moves right past the grid's last column and then moves between loot slots
- **THEN** each focused slot is outlined and shows its item tooltip

### Requirement: A failed page does not disable the mod

When drawing one monster's page fails, Pocket Compendium SHALL show the game's own page for that monster for the rest of the session, record the failure once in the MelonLoader log, and keep drawing every other monster's page. The Skills button SHALL be hidden whenever Pocket Compendium does not draw the current page.

#### Scenario: One monster fails

- **WHEN** drawing monster A's page throws and the player then opens monster B's page
- **THEN** A shows the game's own page, B shows Pocket Compendium's page, and the log holds one error for A

### Requirement: Kill counts only where the game counts kills

The page SHALL show the player's kill count for bosses, elites and fabled monsters, which the game counts. For other monsters, which the game does not count, it SHALL show no number.

#### Scenario: Normal monster

- **WHEN** the player opens a Scorpion's page with Alt and a left click, after killing scorpions
- **THEN** the kill field shows no number instead of a red 0

### Requirement: Trackers use game names and terms

The boss list and the skill tracker SHALL show monster names, and the skill tracker skill names, in the game's translation for the selected language, rendered with the game's fonts for Chinese and Japanese. Fabled monsters SHALL show their base name in the fabled tier colour, without a "Fabled" tag. Distances SHALL be given in yd, and coordinates SHALL NOT be shown. Times of day SHALL be written like the game's clock, such as 20:00.

#### Scenario: Japanese tracker list

- **WHEN** the game language is Japanese and Xylevis is nearby
- **THEN** the boss list shows ザイレヴィス with its distance in yd

#### Scenario: Fabled monster

- **WHEN** Fabled Irvine Bloodworth is listed
- **THEN** the row reads Irvine Bloodworth in the fabled colour, with no "Fabled" text

#### Scenario: Night window

- **WHEN** a player hovers Spirit of the Forest's row
- **THEN** the tooltip says it spawns only at night, 20:00 to 08:00

### Requirement: Logs identify the build

Pocket Compendium SHALL write its version, the commit it was built from and which features are switched on to the MelonLoader log when it starts. FieldDefaultValueHookFix SHALL write its version and commit.

#### Scenario: Reading a player's log

- **WHEN** a player sends `MelonLoader/Latest.log`
- **THEN** the log names Pocket Compendium's version, build commit and active features

### Requirement: One player download

The player features SHALL ship as one DLL, Pocket Compendium, in place of BossTracker, BossSkillTracker and BetterBestiary. FieldDefaultValueHookFix SHALL stay a separate download. Pocket Compendium's updater SHALL come inside Pocket Compendium, which writes it into the game's `Plugins` folder itself, so installing the mod never needs a second file.

#### Scenario: Download tables

- **WHEN** a player reads the download table on the front page or in the mod catalogue
- **THEN** it lists Pocket Compendium and FieldDefaultValueHookFix, and no BossTracker, BossSkillTracker or BetterBestiary

#### Scenario: Installing with updates

- **WHEN** a player installs only `PocketCompendium.dll` and answers "Install updates for me"
- **THEN** Pocket Compendium puts its updater into `Plugins` without the player copying a file

### Requirement: Downloads warn about the old DLLs

Every place in the repository that offers the Pocket Compendium download SHALL tell players to remove BossTracker.dll, BossSkillTracker.dll and BetterBestiary.dll from the game's `Mods` folder before adding it.

#### Scenario: Front page download table

- **WHEN** a player reads the Pocket Compendium entry in the front page's download table
- **THEN** the entry tells them to remove the three old DLLs first

### Requirement: The mods page names the version it offers

The website's mods page SHALL name the version of the Pocket Compendium DLL it offers for download, as that DLL names itself to MelonLoader and on its About page in game. A build that cannot read the version SHALL NOT publish the download.

#### Scenario: Comparing with the installed version

- **WHEN** a player who runs Pocket Compendium 1.0.0 opens the mods page after 1.0.1 is published
- **THEN** the page names version 1.0.1
- **AND** the About page of the downloaded DLL names 1.0.1 too

#### Scenario: A DLL without a version

- **WHEN** a published mod's DLL carries no `MelonInfo` version
- **THEN** the publish fails and the downloads published before stay in place

### Requirement: The home page leads to the mod

The home page SHALL link to the mods page from its first screen in both layouts.

#### Scenario: The title-screen layout

- **WHEN** a player opens the home page in its title-screen layout
- **THEN** a button to the mods page sits beside the buttons to the map and the items, on a phone too

#### Scenario: The classic layout

- **WHEN** a player opens the home page in its classic layout
- **THEN** a Pocket Compendium card leads to the mods page beside the Interactive World Map card on wide screens

### Requirement: The mods page leads with what players install the mod for

The mods page SHALL name respawn timers, spawn locations and boss skill cooldowns in its introduction and SHALL list the Boss list, World markers and Boss skills features before the others. It SHALL show the settings window after the install step that tells players to open it.

#### Scenario: A player skims the page

- **WHEN** a player reads only the introduction and the first row of features
- **THEN** they learn that the mod times respawns, marks spawn points and counts down boss skills

#### Scenario: A player installs the mod

- **WHEN** a player reaches the step that says to press F8 for the settings
- **THEN** a picture of the settings window follows it

### Requirement: An install guide holds the whole install

The site SHALL give every step of installing the fixed MelonLoader and Pocket Compendium on an install page that the mods page links, with direct downloads of both. The steps SHALL come from one file in the repository that also becomes the README.txt of the MelonLoader zip.

#### Scenario: A player replaces an older MelonLoader

- **WHEN** a player with an older MelonLoader follows the steps in order
- **THEN** they delete its MelonLoader folder and version.dll before they copy the new files

### Requirement: The install page shows the reader's system

The install page SHALL let the reader choose Windows, Mac with CrossOver, or Steam Deck or Linux, SHALL preselect the reader's system from the browser, and SHALL show only the chosen system's lines.

#### Scenario: A Mac player installs

- **WHEN** a player on a Mac with CrossOver opens the install page
- **THEN** Mac with CrossOver is chosen, and the steps give the CrossOver route to the game folder and the Wine library setting, without the other systems' lines

### Requirement: The website offers only released mods

The website SHALL publish each downloadable mod as built from the newest git tag of its releases, `<id>-v<version>`, and SHALL NOT publish a build of uncommitted or untagged code. A publish SHALL fail, keeping the current downloads, when a mod has no release tag or when the DLL built from the tag names another version.

#### Scenario: A deploy while mod work is unreleased

- **WHEN** the working tree holds Pocket Compendium changes after the `pocket-compendium-v1.0.1` tag and the site is deployed
- **THEN** the site offers the DLL built from `pocket-compendium-v1.0.1`, which names version 1.0.1

#### Scenario: A mod without a release

- **WHEN** a mod in the download list has no release tag
- **THEN** the publish fails and the downloads published before stay in place

#### Scenario: A tag on the wrong commit

- **WHEN** the DLL built from `pocket-compendium-v1.0.2` names version 1.0.1
- **THEN** the publish fails and the downloads published before stay in place

### Requirement: A release publishes the same file on every deploy

Building a mod from the same release tag SHALL produce the same DLL wherever the build runs, and the DLL SHALL hold no path of the machine that built it.

#### Scenario: A deploy without a new release

- **WHEN** the site is deployed twice while `pocket-compendium-v1.0.1` is the newest release
- **THEN** both deploys publish the same DLL, so the mod's update notice stays quiet

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

### Requirement: The website shows Pocket Compendium's changelog

The mods page SHALL link a changelog page beside the version it names. That page SHALL list every release of Pocket Compendium in the mod list, newest first, each with its version, its date and its changes, in the words the mod shows. A publish SHALL fail, keeping the current downloads, when a listed release has no date or is dated after a newer one.

#### Scenario: Reading the changelog

- **WHEN** a player follows "Changelog" beside "Version 1.1.0" on the mods page
- **THEN** the page lists 1.1.0, 1.0.2, 1.0.1 and 1.0.0 with their dates and changes, 1.1.0 first

#### Scenario: A release without a date

- **WHEN** a release in the registry has no date
- **THEN** the publish fails and the downloads published before stay in place
