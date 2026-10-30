# player-mods Specification

## Purpose
Defines what the published player mods show in game: the BetterBestiary Bestiary page, the BossTracker list and the BossSkillTracker HUD, including language, fonts, input methods and behavior when a page cannot be drawn.

## Requirements

### Requirement: Bestiary pages reveal every monster

BetterBestiary SHALL show a monster's full Bestiary page whether or not the player has met or killed it: name, level, lore, health, armor, resists, type, class, zone and loot. A loot slot SHALL show the item in full color, and hovering it SHALL show the item's complete tooltip with its stats, whether or not the item has dropped for the player.

#### Scenario: Undiscovered boss

- **WHEN** a player who has never met Xylevis opens its Bestiary page and hovers a loot slot
- **THEN** the page shows Xylevis's stats and lore, and the tooltip lists the item's slot, stats, durability, level requirement and price

### Requirement: Bestiary pages list every drop

The page SHALL show every drop the game lists for the monster. When a monster has more drops than the page's 12 slots, the icons SHALL shrink so that all drops fit in the loot area, in the game's drop order.

#### Scenario: Boss with 17 drops

- **WHEN** the player opens the page of a boss with 17 listed drops
- **THEN** all 17 items appear, and each can be hovered for its tooltip

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

When drawing one monster's page fails, BetterBestiary SHALL show the game's own page for that monster for the rest of the session, record the failure once in the MelonLoader log, and keep drawing every other monster's page. The Skills button SHALL be hidden whenever BetterBestiary does not draw the current page.

#### Scenario: One monster fails

- **WHEN** drawing monster A's page throws and the player then opens monster B's page
- **THEN** A shows the game's own page, B shows BetterBestiary's page, and the log holds one error for A

### Requirement: Kill counts only where the game counts kills

The page SHALL show the player's kill count for bosses, elites and fabled monsters, which the game counts. For other monsters, which the game does not count, it SHALL show no number.

#### Scenario: Normal monster

- **WHEN** the player opens a Scorpion's page with Alt and a left click, after killing scorpions
- **THEN** the kill field shows no number instead of a red 0

### Requirement: Trackers use game names and terms

BossTracker and BossSkillTracker SHALL show monster names, and BossSkillTracker skill names, in the game's translation for the selected language, rendered with the game's fonts for Chinese and Japanese. BossTracker SHALL label fabled monsters as fabled, SHALL give distances in yd, and SHALL NOT show coordinates. By default, BossTracker SHALL NOT cover the game's monster hover panel.

#### Scenario: Japanese tracker list

- **WHEN** the game language is Japanese and Xylevis is nearby
- **THEN** BossTracker lists ザイレヴィス with its distance in yd

### Requirement: Logs identify the build

Each published mod SHALL write its version and the commit it was built from to the MelonLoader log when it starts.

#### Scenario: Reading a player's log

- **WHEN** a player sends `MelonLoader/Latest.log`
- **THEN** the log names each published mod's version and build commit
