## Get the files

Download the fixed MelonLoader (40 MB zip) and Pocket Compendium (PocketCompendium.dll). The official MelonLoader doesn't work with the current game.

## Open the game folder

- Windows, Steam Deck or Linux: close the game. In Steam, right-click Ancient Kingdoms, then choose Manage, then Browse local files.
- Mac with CrossOver: close the game. In CrossOver, click Open C: Drive on the game's bottle, then open Program Files (x86), Steam, steamapps, common, Ancient Kingdoms.

- Replacing an older MelonLoader: delete its MelonLoader folder and version.dll, and keep your Mods and UserData folders.

## Install MelonLoader

Extract the zip and copy everything inside it into the game folder, so that MelonLoader, Mods and version.dll sit next to ancientkingdoms.exe. If you are asked, merge the Mods folders.

- Mac with CrossOver: in CrossOver, select the game's bottle and click Wine Configuration under Control Panels. On the Libraries tab, type version, click Add, check that the list shows "version (native, builtin)", and click OK.
- Steam Deck or Linux: in Steam, right-click Ancient Kingdoms, choose Properties, and set the Launch Options to `WINEDLLOVERRIDES="version=n,b" %command%`

## Add Pocket Compendium

Copy PocketCompendium.dll into the Mods folder. The zip already put FieldDefaultValueHookFix.dll there, which stops a crash when you enter the world, so keep it. If the Mods folder has BossTracker.dll, BossSkillTracker.dll or BetterBestiary.dll, delete them.

## Start the game

The first start takes about a minute longer, and so does the first start after a game update. A MelonLoader window opens next to the game. In the world, the boss list appears on its own, and F8 opens Pocket Compendium's settings.

---

Don't run the official MelonLoader installer afterwards. It replaces the fixed files, and MelonLoader stops working.
