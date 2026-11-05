# The Bestiary shows another character's found drops as found

## Summary

The game saves each found Bestiary drop under the name of the character who found it, but it loads every character's finds when a character enters the world. A character then sees a drop as found that only another character in the same save has found. HomeArt has killed Gukavep once and never found a Gnome Hoop, yet Gukavep's page shows the Gnome Hoop in colour, because the save holds Verifier's find of one.

## Build

- Game version 0.10.2.5
- Steam build 26440193
- `Assembly-CSharp` SHA-256 `130a4dda8ea358a19bafc3dd2e5b91088b0a600169378fcbf8696b8ff395b92e`

## Impact

A player with more than one character in a save can't tell which drops the character they're playing has found. The Bestiary pages of every character show the finds of all of them, while the save keeps them apart.

## Steps to reproduce

No mods are needed.

1. With one character, kill Gukavep in Twilight Forest and open its corpse while it carries a Gnome Hoop. Gukavep's Bestiary page now shows the Gnome Hoop in colour.
2. With a second character in the same save, kill Gukavep and open a corpse that carries no Gnome Hoop.
3. Open the Bestiary on Gukavep with the second character. The Gnome Hoop shows in colour like a found drop, and the drops this character hasn't found show as silhouettes.

## Observed

The scratch save held two finds:

| Character | Monster | Item |
|---|---|---|
| HomeArt | Xylevis | Raw Silk Headband |
| Verifier | Gukavep | Gnome Hoop |

HomeArt entered the world in two separate launches of the game. After each world entry, `UIJournal.listBossesLootDiscovered` held the Gnome Hoop for Gukavep, and HomeArt's `bossesKilled` held one Gukavep kill. Gukavep's Bestiary page showed the Gnome Hoop in colour and Gukavep's other three drops as silhouettes.

## Expected

A character's Bestiary shows only that character's finds. The save records each find with the character's name, and the game checks for an existing find per character before it records a new one.

## Cause

`server-scripts/Database.cs:getBossesLootDiscovered` runs `SELECT * FROM bosses_loot_discovered` with no condition on `player_name`, and `server-scripts/Player.cs:OnStartLocalPlayer` puts its result into `UIJournal.listBossesLootDiscovered`, which `server-scripts/UIBestiaryDetail.cs:Show` reads to draw a page's drops. `server-scripts/Database.cs:updateLootBosses` writes each find with `player_name` and looks for an existing row of the same character, monster and item. `server-scripts/Monster.cs:UserCode_CmdLootMonster` records a find for each player allowed to loot when a boss's or elite's corpse is first opened.

## Evidence

- [Gukavep's page for HomeArt](evidence/found-drops-shared-gukavep.webp): the Gnome Hoop in colour, the other three drops as silhouettes, with the mods' Bestiary pages switched off so the game drew its own page.
- The table contains the rows of the save's `bosses_loot_discovered` table, read through the game's own database connection, and the readings are live values after each world entry, not values derived from source.

The mods read state and drive the game's own commands. The defect is in game logic, not the macOS CrossOver platform.

## Notes

- Instrumentation: Verifier's find was written with the game's own `Database.updateLootBosses("Verifier", "Gukavep", "Gnome Hoop")`, the call the game makes when a character finds a drop, instead of a kill by Verifier.
- Each session was redirected with `game.useScratchDatabase` before opening the world, which returned `isScratch=true`. The player save was last modified at 14:19 on the day of the runs, before the first launch, and its SHA-256 was `9760c31a83a8a8b5ce92cf931b606a112887857eb64e61e0da024d4593556a4b` after them.
