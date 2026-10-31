# Design

## Context

See proposal.md for the motivation. Today each player mod is its own MelonLoader project: `mods/BossTracker` (one file, one TextMeshPro text block, `FindObjectsOfType<Monster>`), `mods/BossSkillTracker` (the UI kit, panels and tooltips this change builds on) and `mods/BetterBestiary` (the Bestiary page patches). `mods/Shared` is compiled into each of them as source, so every DLL gets its own copy of each type. Settings live in `MelonPreferences` under one category per mod.

Game facts this design depends on, read in `server-scripts/` for game 0.10.1.3:

- The world is one scene. Each zone is a root object that the server deactivates when no player is in it (`ZoneInfo.cs:ClearDynamicZones`), so a host must search with inactive objects included, as the game itself does in `Player.cs:UserCode_CmdResetDungeon`. A host reads `Monster.respawnTimeEnd` and `GameManager.BossesRespawnDictionary`. The dictionary holds persisted deadlines for monsters whose `Start` never ran this session (`Monster.cs:SetRespawnBosses`).
- A failed chance roll moves `respawnTimeEnd` by one `respawnTime` while the state stays DEAD (`Monster.cs:UpdateServer_DEAD`).
- Window and seasonal monsters are hidden and set DEAD with health unchanged outside their window (`Monster.cs:EventTimeDespawn`).
- No deadline reaches a remote client. A dedicated server announces boss kills, not elite kills, through `PlayerChat.TargetShowInfoMessage` with an `[[entity:<base64>]]` marker (`Monster.cs:OnDeath`). A client sees live state only within Mirror's spatial-hash interest area, about 48 to 96 yd.
- `Player.TargetRpcUpdateBossState` is never sent and would write into the receiver's own save, so it is not used.

A runtime prototype on a LAN world, one game process hosting and one joining, registered an RPC and a Command from managed code on `PlayerChat`. Both carried an exact 5,120-byte string, the host's Command delegate received the client's real connection, and a client without the registration logged one "Found no receiver" error per message and stayed connected. Mirror drops an unknown call that way in `NetworkIdentity.HandleRemoteCall`.

## Goals / Non-Goals

**Goals:**

- One DLL whose features can each be switched off at run time, with one owner for each shared service.
- One state model for tracked monsters that every surface reads, so the list, markers, pins, Bestiary and alerts never disagree.
- Exact host state on host and modded clients, honest estimates elsewhere.

**Non-Goals:**

- Gameplay features. The structure leaves room for them, but this change adds none.
- Sharing between clients on dedicated servers, through chat or any other channel.
- The experimental gameplay mods (MapEnhancer, MapTeleporter, MonsterRespawner, ResourceRespawner) and development mods. They stay separate and unpublished.
- Changing anything in BossSkillTracker's or BetterBestiary's behaviour beyond moving them into the DLL and the tracker naming change in the `player-mods` delta.

## Decisions

### One project with feature folders

`mods/PocketCompendium` holds `Core/` (shared services) and one folder per feature: `BossList`, `WorldMarkers`, `MapPins`, `BestiaryCountdown`, `Alerts`, `BossSkills`, `BestiaryPages`, `Sharing`. The game-text helpers from `mods/Shared` move into `Core/Text`. `mods/Shared` keeps only `ModBuild.cs`, because FieldDefaultValueHookFix, a separate download, compiles it too. Alternative: shared source across several DLLs. Rejected because shared runtime state would be duplicated, and Il2CppInterop refuses to inject a second type with the same full name (`ClassInjector.cs:220-224`). Alternative: a core DLL with feature DLLs. Rejected because the download page has no dependency packaging and players would install several files.

### Features behind one contract

Each feature implements `Enable`, `Disable` and `Update`. A registry starts features in a fixed order, catches exceptions per feature, disables a failing feature for the session and logs once. A feature caught failing inside a Harmony patch reports itself, and the registry stops it on its next update. `Disable` removes every view and marker the feature owns and restores what it changed in the game's interface. Harmony patches are applied the first time a feature is enabled and stay in place, passing straight through while the feature is off. Alternative: unpatch on disable. Rejected because removing an IL2CPP detour while the game runs is riskier than a guard that costs one flag check per call. The Bestiary page has one patch owner, and the full-page and countdown features contribute to it, because two patches on one draw method would fight over order.

### One tracked-monster model

`Core/Tracking` builds a catalogue of tracked monsters once per world from scene and prefab data (`Resources.FindObjectsOfTypeAll` on a client, inactive-inclusive search on a host), keyed by the GameObject name, which stays stable when the monster is hidden. A per-world store holds each monster's state, deadline, source (host, shared, seen death, kill notice, sighting) and timestamp, persisted per world key: the local world id for solo play, the host address plus the host's session id for joined worlds, and the server entry for dedicated servers. A resolver turns rules plus observations into one named state from the `respawn-tracking` spec. Surfaces only read the resolved state.

On a host, the resolver reads `respawnTimeEnd`, falls back to the dictionary when `Start` has not run, and treats "hidden and DEAD with health" as the window or season state, never Up. A deadline that jumps by `respawnTime` while DEAD records a failed roll.

On a client, a death seen in range sets an estimate of death time plus corpse time plus respawn time. A kill notice is read by hooking the server-originated info message, not the chat window, because players can forge chat text in the local channel.

### Sharing protocol

Two hashes on `PlayerChat`, an RPC on clients and a Command on the host, both checked with `RemoteProcedureCalls.GetDelegate` before registering and kept in static fields. The host sends `hello { protocol, session }` to each joining player. A modded client replies `subscribe { protocol }`. The host answers with a snapshot of every tracked monster's state and server-clock deadline, then deltas. Payloads are compact strings with a protocol version. Alternative: a new Mirror message id. Rejected because it disconnects players without the mod. Alternative: chat. Rejected by decision, because everyone in the channel would see it.

### UI kit from BossSkillTracker

`Core/Ui` is BossSkillTracker's UI kit, extended with the panel host (drag, resize, lock, persist), the settings window and Lucide icons. `website/scripts/generate-mod-icons.mjs` renders the icons from the website's `lucide` package and stores each one as its gzipped 96x96 alpha channel, because every icon is white and tinted at run time. Raw RGBA made the DLL eight times larger, and decoding PNG would depend on Unity's image module. Tooltips use the game's `UIShowToolTip`, alerts `Player.ShowImportantMessage`, map pins follow the game's map-notes container under `UIMap.localMap`.

### Settings

Settings stay in `MelonPreferences`, one category per feature under a `PocketCompendium` prefix. The settings window is generated from typed setting definitions, so each feature declares its settings once. Settings saved by the old mods are not read, because the categories and their meaning differ and a fresh start costs a player one drag per panel.

## Risks / Trade-offs

- [The EOS online transport is untested for the custom hashes] → Test it on an online-hosted world before release. Sharing ships behind its switch, and the protocol falls back to local estimates if no hello arrives.
- [IL2CPP inlining can bypass a Harmony prefix on the info-message handler] → Hook the `InvokeUserCode_` wrapper and verify kill notices on a dedicated server.
- [A game update can rename fields or change spawn rules] → Each read goes through `Core/Tracking`, and the catalogue logs any tracked monster it cannot resolve.
- [One release carries every feature] → Per-feature fault isolation and switches.
- [`Monster.idZone` is wrong for 6 tracked elites] → Use the placement zone from the scene hierarchy, as the exporter does.
- [Players keep old DLLs beside Pocket Compendium, and two patches then fight over the same methods] → Every download location warns to remove them first. The startup log names Pocket Compendium's features, so a player's log shows both sets of mods when this happens.

## Migration Plan

1. Release Pocket Compendium with the download tables listing it and FieldDefaultValueHookFix only. The three old entries are removed.
2. Each download location warns players to remove the old DLLs.
3. Rollback: the old DLLs stay buildable from their last commit. A player can remove Pocket Compendium and reinstall them. Their old settings categories stay in `MelonPreferences.cfg`, untouched.

## Open Questions

- The exact compact payload format and the snapshot size limit on the EOS transport.
- Whether the map pin layer should reuse the map-notes container or sit in its own sibling container.
