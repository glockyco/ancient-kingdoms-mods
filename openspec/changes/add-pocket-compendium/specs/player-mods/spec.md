## ADDED Requirements

### Requirement: One player download

The player features SHALL ship as one DLL, Pocket Compendium, in place of BossTracker, BossSkillTracker and BetterBestiary. FieldDefaultValueHookFix SHALL stay a separate download.

#### Scenario: Download tables

- **WHEN** a player reads the download table on the front page or in the mod catalogue
- **THEN** it lists Pocket Compendium and FieldDefaultValueHookFix, and no BossTracker, BossSkillTracker or BetterBestiary

### Requirement: Downloads warn about the old DLLs

Every place in the repository that offers the Pocket Compendium download SHALL tell players to remove BossTracker.dll, BossSkillTracker.dll and BetterBestiary.dll from the game's `Mods` folder before adding it.

#### Scenario: Front page download table

- **WHEN** a player reads the Pocket Compendium entry in the front page's download table
- **THEN** the entry tells them to remove the three old DLLs first

## MODIFIED Requirements

### Requirement: Bestiary pages reveal every monster

Pocket Compendium SHALL show a monster's full Bestiary page whether or not the player has met or killed it: name, level, lore, health, armor, resists, type, class, zone and loot. A loot slot SHALL show the item in full color, and hovering it SHALL show the item's complete tooltip with its stats, whether or not the item has dropped for the player.

#### Scenario: Undiscovered boss

- **WHEN** a player who has never met Xylevis opens its Bestiary page and hovers a loot slot
- **THEN** the page shows Xylevis's stats and lore, and the tooltip lists the item's slot, stats, durability, level requirement and price

### Requirement: A failed page does not disable the mod

When drawing one monster's page fails, Pocket Compendium SHALL show the game's own page for that monster for the rest of the session, record the failure once in the MelonLoader log, and keep drawing every other monster's page. The Skills button SHALL be hidden whenever Pocket Compendium does not draw the current page.

#### Scenario: One monster fails

- **WHEN** drawing monster A's page throws and the player then opens monster B's page
- **THEN** A shows the game's own page, B shows Pocket Compendium's page, and the log holds one error for A

### Requirement: Trackers use game names and terms

The boss list and the skill tracker SHALL show monster names, and the skill tracker skill names, in the game's translation for the selected language, rendered with the game's fonts for Chinese and Japanese. Fabled monsters SHALL show their base name in the fabled tier colour, without a "Fabled" tag. Distances SHALL be given in yd, and coordinates SHALL NOT be shown.

#### Scenario: Japanese tracker list

- **WHEN** the game language is Japanese and Xylevis is nearby
- **THEN** the boss list shows ザイレヴィス with its distance in yd

#### Scenario: Fabled monster

- **WHEN** Fabled Irvine Bloodworth is listed
- **THEN** the row reads Irvine Bloodworth in the fabled colour, with no "Fabled" text

### Requirement: Logs identify the build

Pocket Compendium SHALL write its version, the commit it was built from and which features are switched on to the MelonLoader log when it starts. FieldDefaultValueHookFix SHALL write its version and commit.

#### Scenario: Reading a player's log

- **WHEN** a player sends `MelonLoader/Latest.log`
- **THEN** the log names Pocket Compendium's version, build commit and active features
