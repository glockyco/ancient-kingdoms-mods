# PocketCompendiumUpdater

The MelonLoader plugin that lets Pocket Compendium install a new version in the same game start. Players don't download it. Pocket Compendium carries it and writes it into the game's `Plugins` folder when the player chooses "Install updates for me" or clicks Install.

MelonLoader runs plugins before it loads mods. This plugin loads the update code in [PocketCompendiumUpdateCore](../PocketCompendiumUpdateCore/README.md) from `UserData/PocketCompendium/Updates/` and runs it there. The plugin itself never changes, because its file stays locked while the game runs, so a new key or a fix reaches players through the update code, which Pocket Compendium keeps current.

`build-tool deploy` leaves it out of `Mods`, where MelonLoader would load it as a mod.
