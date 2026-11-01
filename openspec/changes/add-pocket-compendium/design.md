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

`Core/Tracking` builds a catalogue of tracked monsters once per world from the Bestiary's list (`GameManager.elitesBosses`) and the scene: each monster's placement, or for the nine without one, the altar whose waves spawn it or the monster whose death spawns it. The catalogue is keyed by the GameObject name, which stays stable when the monster is hidden, and takes zones from the scene hierarchy. A host and a client build the same catalogue, because a client loads the same scene and prefab data. A resolver turns rules plus readings into one named state from the `respawn-tracking` spec. Surfaces only read the resolved state.

On a host, the resolver reads `respawnTimeEnd`. A placement whose zone has been empty since the world started has not run `Start`, which shows as an empty `basicInfo`. For it the resolver applies the saved deadline from `BossesRespawnDictionary` and the rules `SetRespawnBosses` applies on entry: a rolling monster starts dead for one more interval, and a summoned one waits for its guards. "Hidden and DEAD with health" is the window state, never Up. A deadline that jumps by `respawnTime` while DEAD records a failed roll. A host keeps no memory, because the game holds every state.

On a client, a monster counts as spawned while Mirror has given it a net id. Mirror resets the id to 0 when the monster leaves range or hides, and leaves the object active. A death seen in range sets an estimate of death time plus corpse time plus respawn time. A corpse found without the death dates the death one corpse time earlier, the earliest possible. A kill notice is read by hooking the server-originated info message, not the chat window, because players can forge chat text in the local channel. A client keeps deaths, kill notices and sightings per world in `UserData/PocketCompendium/Worlds`, keyed by the address it joined: an EOS product user id for listed worlds and servers, an IP for LAN.

Fifteen bosses are authored to be shown to every player, so a client sees them, and their deaths, anywhere in the world until their first respawn, when the game shows them by range again. While their zone is empty they stay at full health, so on host and client alike a live monster outside its window counts as up only while it fights.

### Sharing protocol

Two hashes on `PlayerChat`, an RPC on clients and a Command on the host, both checked with `RemoteProcedureCalls.GetDelegate` before registering and kept in static fields. The host sends `hello { protocol }` to each joining player. A modded client replies `subscribe { protocol }`. The host answers with a snapshot of every tracked monster's state and server-clock deadline, then deltas. Payloads are tab-separated text with the protocol version, at most 64 monsters per message, so each message stays under 4 KB. A client shows the host's states in place of its own estimates until it disconnects, and keeps its own memory current meanwhile. Alternative: a new Mirror message id. Rejected because it disconnects players without the mod. Alternative: chat. Rejected by decision, because everyone in the channel would see it.

### UI kit from BossSkillTracker

`Core/Ui` is BossSkillTracker's UI kit, extended with the panel host (drag, resize, lock, persist), the settings window and Lucide icons. `website/scripts/generate-mod-icons.mjs` renders the icons from the website's `lucide` package and stores each one as its gzipped 96x96 alpha channel, because every icon is white and tinted at run time. Raw RGBA made the DLL eight times larger, and decoding PNG would depend on Unity's image module. Tooltips use the game's `UIShowToolTip` and alerts `Player.ShowImportantMessage`. Map pins sit in their own container under `UIMap.localMap`, placed the way the game places its map notes. The container has its own canvas one sorting order above the map's, because the map's frame takes the pointer from anything drawn below it.

### Settings

Settings stay in `MelonPreferences`, one category per feature under a `PocketCompendium` prefix. The settings window is generated from typed setting definitions, so each feature declares its settings once. Settings saved by the old mods are not read, because the categories and their meaning differ and a fresh start costs a player one drag per panel.

## Risks / Trade-offs

- [The EOS online transport is untested for the custom hashes] → Test it on an online-hosted world before release. The game's EOS transport carries reliable messages of up to 64,350 bytes in 55 fragments, so a state message of about 4 KB fits. Sharing ships behind its switch, and a client that gets no hello keeps its own estimates.
- [IL2CPP inlining can bypass a Harmony prefix on the info-message handler] → Hook the `InvokeUserCode_` wrapper. A local dedicated server would list itself in the public server list, so a LAN host sends the client a kill notice in the dedicated server's format to verify the hook.
- [After a server restart, a boss shown to every player that died before the restart reads alive to clients until someone enters its zone, because the server applies the saved deadline only then] → Accepted. A host reads the saved deadline, and sharing gives its clients the host's state.
- [A game update can rename fields or change spawn rules] → Each read goes through `Core/Tracking`, and the catalogue logs any tracked monster it cannot resolve.
- [One release carries every feature] → Per-feature fault isolation and switches.
- [`Monster.idZone` is wrong for 6 tracked elites] → Use the placement zone from the scene hierarchy, as the exporter does.
- [Players keep old DLLs beside Pocket Compendium, and two patches then fight over the same methods] → Every download location warns to remove them first. The startup log names Pocket Compendium's features, so a player's log shows both sets of mods when this happens.

## Migration Plan

1. Release Pocket Compendium with the download tables listing it and FieldDefaultValueHookFix only. The three old entries are removed.
2. Each download location warns players to remove the old DLLs.
3. Rollback: the old DLLs stay buildable from their last commit. A player can remove Pocket Compendium and reinstall them. Their old settings categories stay in `MelonPreferences.cfg`, untouched.
