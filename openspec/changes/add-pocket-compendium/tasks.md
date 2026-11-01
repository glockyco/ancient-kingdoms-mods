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

- [x] 3.1 Build the tracked-monster catalogue from scene and prefab data, keyed by GameObject name, with placement zones from the scene hierarchy.
- [x] 3.2 Add the per-world store and world keys for solo worlds, joined worlds and dedicated servers.
- [x] 3.3 Add the host resolver: inactive-inclusive reads, dictionary fallback, hidden window and season monsters, failed rolls, Due, guards from summon placeholders, altars, dungeon renewals.
- [x] 3.4 Add the client resolver: deaths seen in range, kill notices from the server's info message, sightings, Not seen.
- [x] 3.5 Unit-test the resolver on every state, including Spirit of the Forest hidden at full health and Forsaken Skeleton's failed roll.
- [x] 3.6 On a host, verify every state against the game, and that a full session leaves respawn times unchanged.
- [x] 3.7 On a client, verify that a kill notice in the dedicated server's format produces an estimate and that the info-message hook fires under IL2CPP.

## 4. Surfaces

- [x] 4.1 Boss list: zone groups, short rows, level colours and skull, ellipsized names, direction arrows to spawn points and altars, cooldown sweep, tooltips, click to watch, shift-click to open the Bestiary.
- [x] 4.2 Filters for tier, level, zone and discovery, with the collapsed "more" line and watched monsters always shown.
- [x] 4.3 Compact style with hover-only header and the switch back to the list.
- [x] 4.4 World markers on spawn points and edge arrows for monsters that are up off screen.
- [x] 4.5 Map pins with time tags, glow for monsters that are up, and tooltips on hover.
- [x] 4.6 Bestiary grid countdown and the "Respawns in" plate on the split of the page. The countdown draws its own objects from its update, so the page keeps one patch, the full pages'.
- [x] 4.7 Respawn alerts for watched monsters through `Player.ShowImportantMessage`.
- [x] 4.8 Capture each surface in game and compare with the mood board sketches, including Chinese and Japanese names.
- [x] 4.9 Give the Bestiary countdown one switch for the grid beside the page and one for the page, as asked on 2026-11-01, with their wording chosen through a comparison. Verify in game that each switch removes only its own countdown and brings it back at once.
- [x] 4.10 Make the in-fight special gate account for a target out of reach: a monster then casts a special with a longer reach at random about 1 s after its last one, without waiting for the 6 to 12 s gap, so the strip no longer shows LOCKED while a special can come (`Monster.cs:1880-1898`, observed with Nyxarion in `openspec/changes/archive/2026-11-01-rework-bestiary-skills-panel/observations.md`). Verify in game at 8 yd from Nyxarion. Verified on 2026-11-01: held at 6 to 8 yd, the strip read ARMED while his deadline was still about 10 s away.
- [x] 4.11 Show a chance spawn's chance outside the hover text, as asked and chosen on 2026-11-01 (`.local/changes/rework-bestiary-skills-panel/review/round-2/`): "Lv 25 · 75% chance" on the row's second line, and "75% chance in 15:33" on the Bestiary page's plate. Verify in game on Forsaken Skeleton that the row and the page show 75%.
- [x] 4.12 Let a player watch a boss, elite or fabled monster from its Bestiary page, as asked and chosen on 2026-11-01: a Watch button beside Skills that reads "Watching" while on, sharing the list's watchlist. Verify in game that watching from the page marks the list row, and the reverse.
- [x] 4.13 Tell players in the README about the chance and hours after the level and the Watch button, worded through a comparison. Decided on 2026-11-01 (`.local/changes/add-pocket-compendium/review/round-6/`): the README stays as it is.
- [x] 4.14 State every spawn condition a player needs before travelling, as chosen in `.local/changes/add-pocket-compendium/review/spawn-conditions/` and `round-6/`. Built and checked in game and in a browser: the hours after the level, the guard rule in the hover text and on the website's monster and guard pages, the hover and plate while a monster waits for its hours and when it leaves, hover state lines only where they add to the row, and the placeholder source sentence. The dungeon renewal was checked by tests and in game up to the hook being applied. A run on a LAN client was skipped on 2026-11-01 by decision.

## 5. Sharing

- [x] 5.1 Register the RPC and Command hashes with the collision check, and keep the delegates in static fields.
- [x] 5.2 Implement hello, subscribe, snapshot and deltas, with a protocol version.
- [x] 5.3 Verify on a LAN world: exact times on the client, an unmodded client stays connected, a modded client on an unmodded host sends nothing.
- [x] 5.4 Decide on an online check over EOS. Sharing ships without one, because the transport fits a full snapshot and a client that gets no hello keeps its own estimates.

## 6. Release

- [x] 6.1 Remove `mods/BossTracker`, `mods/BossSkillTracker` and `mods/BetterBestiary` and their download entries.
- [x] 6.2 Write `mods/PocketCompendium/README.md` and update the download tables in `README.md` and `mods/README.md`, each warning players to remove BossTracker.dll, BossSkillTracker.dll and BetterBestiary.dll first.
- [x] 6.3 Run the build-tool checks and the test suites, and build the downloads with `build-tool publish-mods`. Deploying the site stays a separate step.

## 7. Review follow-ups

- [x] 7.1 Show the level beside the skull in list rows.
- [x] 7.2 Write time-of-day windows like the game's clock, such as 20:00 to 08:00.
- [x] 7.3 Center labels on the font's line metrics, so an icon beside a label lines up whatever letters the label holds.
- [x] 7.4 Make Bestiary grid countdowns readable on any portrait, with a sweep that shows, and shade compact tile captions the same way.
- [x] 7.5 Draw panels under the game's interface, and let a panel take the pointer only where nothing covers it.
- [x] 7.6 Verify 7.1 to 7.5 in game.
- [x] 7.7 Rewrite the README from a player's questions, with in-game screenshots.
- [x] 7.9 Retake the README screenshots without the scratch character's name. The current pictures hide the name plate and the health frame, and none shows a character name.
- [ ] 7.8 Push, and deploy the site with `pnpm cf-deploy`.
