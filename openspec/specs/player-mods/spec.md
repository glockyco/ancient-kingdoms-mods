# player-mods Specification

## Purpose
Defines what the published player mods show in game: the BetterBestiary Bestiary page, the BossTracker list and the BossSkillTracker HUD, including language, fonts, input methods and behavior when a page cannot be drawn.

## Requirements

### Requirement: Bestiary pages reveal every monster

Pocket Compendium SHALL show a monster's full Bestiary page whether or not the player has met or killed it: name, level, lore, health, armor, resists, type, class, zone and loot. A loot slot SHALL show the item in full color, and hovering it SHALL show the item's complete tooltip with its stats, whether or not the item has dropped for the player.

#### Scenario: Undiscovered boss

- **WHEN** a player who has never met Xylevis opens its Bestiary page and hovers a loot slot
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

The player features SHALL ship as one DLL, Pocket Compendium, in place of BossTracker, BossSkillTracker and BetterBestiary. FieldDefaultValueHookFix SHALL stay a separate download.

#### Scenario: Download tables

- **WHEN** a player reads the download table on the front page or in the mod catalogue
- **THEN** it lists Pocket Compendium and FieldDefaultValueHookFix, and no BossTracker, BossSkillTracker or BetterBestiary

### Requirement: Downloads warn about the old DLLs

Every place in the repository that offers the Pocket Compendium download SHALL tell players to remove BossTracker.dll, BossSkillTracker.dll and BetterBestiary.dll from the game's `Mods` folder before adding it.

#### Scenario: Front page download table

- **WHEN** a player reads the Pocket Compendium entry in the front page's download table
- **THEN** the entry tells them to remove the three old DLLs first
