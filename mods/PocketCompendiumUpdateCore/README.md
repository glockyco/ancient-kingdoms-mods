# PocketCompendiumUpdateCore

The update code that [PocketCompendiumUpdater](../PocketCompendiumUpdater/README.md) loads before MelonLoader loads mods. With "Install updates for me", it downloads the website's mod list, accepts it only when its signature verifies against the release key in `mods/Shared/Updates/release-key.txt`, downloads a higher version of Pocket Compendium, and moves it over `Mods/PocketCompendium.dll` so the game loads it in that start. It waits for the download at most 10 seconds and otherwise puts it in place at the next start. It also moves a version the player downloaded with Install.

Pocket Compendium embeds this DLL and writes it to `UserData/PocketCompendium/Updates/` whenever its copy differs. The logic it shares with Pocket Compendium lives in `mods/Shared/Updates/`.

A build with `-p:UpdateTest=true -p:UpdateKeyFile=<public key file>` verifies with a test key and reads the website's address from `POCKET_COMPENDIUM_TEST_SITE`, for tests against a local server.
