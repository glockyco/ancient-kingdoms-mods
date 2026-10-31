# Tasks

## 1. Project and shared services without visible change

- [x] 1.1 Create `mods/PocketCompendium` with `Core/`, move the game-text helpers from `mods/Shared` into `Core/Text`, and add the project to the solution and `website/mod-downloads.json`.
- [x] 1.2 Move the shared parts of BossSkillTracker's UI kit (`Theme`, `HudFactory`, `ControlSprites` as `Icons`, `PanelPlacement`, `RawImageRows`) into `Core/Ui`, and render the icons from Lucide with `website/scripts/generate-mod-icons.mjs`. `HudRoot` and `ControlCluster` stay with the skill panel until the panel host takes over their drag and lock handling.
- [x] 1.3 Add the feature registry: fixed start order, `Enable`, `Disable`, `Update`, patches applied once and guarded by the feature's state, per-feature exception isolation with one log line.
- [x] 1.4 Move BossSkillTracker into the `BossSkills` feature and BetterBestiary into the `BestiaryPages` feature. Move their tests into `tests/PocketCompendium.Tests`.
- [x] 1.5 Log version, build commit and active features at start.
- [x] 1.6 In game, confirm the skill cards and Bestiary pages look and behave as before, and that switching each off and on at run time removes and restores it.

## 2. Settings and layout

- [x] 2.1 Add typed setting definitions and generate the settings window from them, with one page per feature, the feature switch first and equal-width option pickers.
- [x] 2.2 Add the panel host: drag, resize, lock and persisted placement for every panel.

## 3. Respawn tracking

- [ ] 3.1 Build the tracked-monster catalogue from scene and prefab data, keyed by GameObject name, with placement zones from the scene hierarchy.
- [ ] 3.2 Add the per-world store and world keys for solo worlds, joined worlds and dedicated servers.
- [ ] 3.3 Add the host resolver: inactive-inclusive reads, dictionary fallback, hidden window and season monsters, failed rolls, Due, guards from summon placeholders, altars, dungeon renewals.
- [ ] 3.4 Add the client resolver: deaths seen in range, kill notices from the server's info message, sightings, Not seen.
- [ ] 3.5 Unit-test the resolver on every state, including Spirit of the Forest hidden at full health and Forsaken Skeleton's failed roll.
- [ ] 3.6 On a host, verify every state against the game, and that a full session leaves respawn times unchanged.
- [ ] 3.7 On a dedicated server, verify kill notices produce estimates and that the info-message hook fires under IL2CPP.

## 4. Surfaces

- [ ] 4.1 Boss list: zone groups, short rows, level colours and skull, ellipsized names, direction arrows to spawn points and altars, cooldown sweep, tooltips, click to watch, shift-click to open the Bestiary.
- [ ] 4.2 Filters for tier, level, zone and discovery, with the collapsed "more" line and watched monsters always shown.
- [ ] 4.3 Compact style with hover-only header and the switch back to the list.
- [ ] 4.4 World markers on spawn points and edge arrows for monsters that are up off screen.
- [ ] 4.5 Map pins with time tags, glow for monsters that are up, and tooltips on hover.
- [ ] 4.6 Bestiary grid countdown and the "Respawns in" plate on the split of the page, through one owner of the Bestiary page patch that both Bestiary features contribute to.
- [ ] 4.7 Respawn alerts for watched monsters through `Player.ShowImportantMessage`.
- [ ] 4.8 Capture each surface in game and compare with the mood board sketches, including Chinese and Japanese names.

## 5. Sharing

- [ ] 5.1 Register the RPC and Command hashes with the collision check, and keep the delegates in static fields.
- [ ] 5.2 Implement hello, subscribe, snapshot and deltas, with a protocol version.
- [ ] 5.3 Verify on a LAN world: exact times on the client, an unmodded client stays connected, a modded client on an unmodded host sends nothing.
- [ ] 5.4 Verify on an online world hosted over EOS, including a snapshot at full size and a reconnect.

## 6. Release

- [ ] 6.1 Remove `mods/BossTracker`, `mods/BossSkillTracker` and `mods/BetterBestiary` and their download entries.
- [ ] 6.2 Write `mods/PocketCompendium/README.md` and update the download tables in `README.md` and `mods/README.md`, each warning players to remove BossTracker.dll, BossSkillTracker.dll and BetterBestiary.dll first.
- [ ] 6.3 Run the build-tool checks and the test suites, and build the downloads with `build-tool publish-mods`. Deploying the site stays a separate step.
