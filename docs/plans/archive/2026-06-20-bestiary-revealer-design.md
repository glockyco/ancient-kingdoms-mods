---
title: "Bestiary Revealer Design"
type: spec
status: abandoned
created: 2026-06-20
parent:
superseded_by:
archived: 2026-06-25
---

# Bestiary Revealer Design

**Status:** Design approved; awaiting written spec review before implementation planning  
**Date:** 2026-06-20  
**Owner:** mods/

## Goal

Create a new Ancient Kingdoms MelonLoader mod named **Bestiary Revealer** with project, assembly, and namespace name `BestiaryRevealer`.

The v1 mod reveals the selected Bestiary monster detail panel even when the player has not normally unlocked that monster or its loot. It must show the real monster image, name, level, stats, type, class, zone, lore, drop icons, drop quality backgrounds, and the stock hover tooltip for each shown drop.

Progress remains real. The mod does not grant kills, loot discovery, zone discovery, achievements, or persisted unlocks.

## Current implementation facts

These facts come from the ignored but checked-in decompiled reference source under `server-scripts/`, which is the source of truth for Bestiary UI behavior.

- `server-scripts/` is ignored by git and must be included in discovery with ignored files enabled.
- `UIJournal.OpenBestiary()` selects an initial monster and calls `UIBestiaryDetail.Show(UIBestiaryDetail.singleton.monster)`.
- `UIJournal.Update()` rebuilds the Bestiary grid every frame while the journal is open and the current tab is `"Bestiary"`.
- `UIJournal.Update()` sets left-grid portraits from `GameManager.singleton.elitesBosses[i].portraitBoss`, then colors undiscovered entries black when `Player.localPlayer.bossesKilled` lacks that monster name.
- `UIJournal.Update()` sets the discovered counter to `Player.localPlayer.bossesKilled.Count + " / " + GameManager.singleton.elitesBosses.Count`.
- `UIBestiaryDetail.Show(Monster)` sets the selected monster, randomizes the unknown text, and builds `finalDropChancesList` from `monster.dropChances` plus forgotten-altar quality variants.
- `UIBestiaryDetail.Show(Monster)` contains `Database.updateLootBosses(...)` side effects for forgotten-altar variant backfills when entries are already in `UIJournal.singleton.listBossesLootDiscovered`. Bestiary Revealer must not spoof discovery state before or during `Show`.
- `UIBestiaryDetail.Update()` rewrites the selected detail panel every frame while the journal Bestiary tab is active.
- `UIBestiaryDetail.Update()` gates the selected monster's name/image/stats/lore/type/class/zone on `Player.localPlayer.bossesKilled`.
- `UIBestiaryDetail.Update()` gates each loot tooltip and icon color on `UIJournal.singleton.listBossesLootDiscovered[monster.nameEntity]`.
- `UIBestiaryLoot` contains only `imageItem`, `background`, and `tooltip` fields, so preserving stock hover behavior means writing those stock fields instead of adding a replacement tooltip layer.
- `UIShowToolTip` reads its public `text` field and shows stock UI from `ShowToolTip()` / pointer-enter behavior. Setting `tooltip.enabled = true` and `tooltip.text` is sufficient to use the stock hover path.

## Non-goals for v1

- Do not reveal or recolor the left-side Bestiary grid.
- Do not change the left-side discovered count.
- Do not persist anything.
- Do not call or fake discovery RPCs, including `Player.TargetRpcUpdateKillsBestiary` or `Player.TargetRpcUpdateLootItemDiscovered`.
- Do not write discovery persistence through `Database.updateBossEliteKills`, `Database.updateHuntKills`, `Database.updateLootBosses`, or related database update paths.
- Do not add entries to `Player.localPlayer.bossesKilled`, `Player.localPlayer.huntKilled`, or `UIJournal.singleton.listBossesLootDiscovered`.
- Do not replace the stock Bestiary UI or implement a custom tooltip window.

## Recommended approach

Patch the rendered UI, not discovery state.

Use a Harmony postfix on `UIBestiaryDetail.Update()` as the primary hook. Vanilla runs first and may lock fields to `???`, black out the monster image, disable loot tooltips, and black out undiscovered drop icons. The postfix then writes the real display values back into the existing detail-panel controls for the currently selected monster.

A `UIBestiaryDetail.Show(Monster)` patch is not sufficient because `UIBestiaryDetail.Update()` rewrites the same fields every frame. A prefix replacement of `Update()` is also unnecessary for v1 because vanilla already handles activation, selection, slot balancing, and hidden-slot cleanup. A postfix is the smallest safe cutover.

## Architecture

```text
mods/BestiaryRevealer/
├── BestiaryRevealer.cs          # MelonMod entrypoint and Harmony registration
├── BestiaryRevealer.csproj      # net6.0 MelonLoader / IL2CPP / Harmony refs
├── Patches/
│   └── UIBestiaryDetailPatch.cs # Update postfix only
└── Ui/
    ├── BestiaryDetailRenderer.cs # writes selected panel fields
    ├── BestiaryLootRenderer.cs   # writes loot slots and stock tooltip fields
    └── BestiaryLootSlots.cs      # stable enumeration of loot0..loot11
```

The entrypoint does lifecycle only: initialize Harmony, apply patches, and log version/startup. Rendering logic stays out of the MelonMod class so the patch remains small and auditable.

## Detail rendering

`BestiaryDetailRenderer.Reveal(UIBestiaryDetail detail)` runs from the `UIBestiaryDetail.Update()` postfix and returns immediately unless all of these are true:

- `UIJournal.singleton` exists.
- `UIJournal.singleton.panel.activeSelf` is true.
- `UIJournal.singleton.currentTab == "Bestiary"`.
- `detail` and `detail.monster` are non-null.

When active, it writes:

- `detail.imageBoss.sprite = monster.imageBossBestiary`
- `detail.imageBoss.color = Color.white`
- `detail.nameBoss.text = monster.nameEntity`
- `detail.nameBoss.color` using vanilla color rules: fabled, boss, then elite.
- `detail.levelBoss.text = "Level " + monster.level.current`
- `detail.loreBoss.text = monster.loreBoss`
- `detail.hpBoss.text` using vanilla formatting: `N0`, or `K` for values above 10000.
- armor and resistances from `monster.combat`.
- type, class, and zone from `monster.typeMonster`, `monster.classMonster`, and `monster.zoneMonster`.

`detail.kills.text` stays truthful. If `Player.localPlayer.bossesKilled` contains the monster, the renderer may preserve vanilla's actual count/color. If not, it leaves vanilla's `<color=red>0</color>`. The mod reveals Bestiary information, not player progress.

## Loot rendering

`BestiaryLootRenderer.Reveal(detail, monster)` builds the display drop list without reading or modifying discovery state.

Base list:

1. Start from `monster.dropChances`.
2. Apply the same vanilla visibility filter used by `UIBestiaryDetail.Update()`:
   - skip `PotionItem`
   - skip `isOnlyQuestItem`
   - skip quality `<= 0` unless the item is a key, equipment, or scroll
3. Render at most 12 entries because the stock UI exposes `loot0` through `loot11`.

Forgotten-altar variants:

- For elite forgotten-altar event monsters, find the first uncommon equipment drop, matching vanilla `Show` behavior.
- Derive `Magic {name}`, `Epic {name}`, `Legendary {name}`, and `Mythic {name}`.
- Add cached variant items from `GameManager.cacheItems` if present.
- Do not call `Database.updateLootBosses` and do not add any names to `UIJournal.singleton.listBossesLootDiscovered`.

For each rendered slot:

- `slot.SetActive(true)`.
- Set `slot.imageItem.sprite` from the `Item` wrapper's image.
- Set `slot.imageItem.color = Color.white`.
- Set `slot.background.sprite` from `UIInventory.singleton.backgroundNormal`, `backgroundUncommon`, `backgroundMagic`, `backgroundEpic`, `backgroundLegendary`, or `backgroundMythic` according to item quality.
- Set `slot.tooltip.enabled = true`.
- Set `slot.tooltip.text = item.ToolTip(compareEquipment: false, showPrice: true).Replace("{DURABILITY}", "<color=#DA4ADC>Durability: 100%</color>")`.

Unused slots are set inactive, matching vanilla cleanup.

## Safety and error handling

The postfix must be fail-soft. It should catch unexpected exceptions inside the mod renderer, log a short message through the mod logger, and avoid throwing through the game UI update loop.

Null guards are required around all game singletons and UI fields that can be absent during scene load or teardown:

- `UIJournal.singleton`
- `UIInventory.singleton`
- `Player.localPlayer`
- `detail.monster`
- every `UIBestiaryLoot` slot and child field
- every `ItemDropChance.item`

Repeated missing-field logs should be rate-limited or logged once per reason to avoid per-frame spam.

## Optional extensions

Optional extensions are explicitly outside v1 but should remain easy to add later.

### Grid thumbnails

A separate `UIJournal.Update()` postfix could recolor Bestiary grid portrait images to white after vanilla rebuilds them. This would reveal the left-side thumbnails without changing the discovered counter.

### Grid discovered count

A broader `UIJournal.Update()` postfix could alter `textDiscovered` to present all monsters as visible. This is more semantically risky because the vanilla counter represents actual player progress, not display visibility. If added later, it should be a separate option with wording that distinguishes revealed data from earned discoveries.

## Acceptance criteria

- A new `BestiaryRevealer` mod project is added under `mods/` and included in `AncientKingdomsMods.sln`.
- Opening the Bestiary and selecting an undiscovered monster shows the real selected-monster detail panel instead of `???` fields.
- Undiscovered selected-monster image is full color, not blacked out.
- Undiscovered selected-monster loot icons are full color.
- Hovering a revealed loot icon uses the stock `UIShowToolTip` behavior and stock item tooltip text.
- Actual kill/progress state remains unchanged.
- Left-side grid thumbnails and discovered count remain vanilla in v1.
- The mod source contains no calls to forbidden discovery RPCs or database update methods.
- The mod source does not add to or overwrite `Player.localPlayer.bossesKilled`, `Player.localPlayer.huntKilled`, or `UIJournal.singleton.listBossesLootDiscovered`.

## Verification plan

Implementation must be verified with both static and runtime checks.

Static checks:

- Build the new mod project with the existing local Ancient Kingdoms paths.
- Search the `mods/BestiaryRevealer` source for forbidden calls and state mutations:
  - `TargetRpcUpdateKillsBestiary`
  - `TargetRpcUpdateLootItemDiscovered`
  - `updateBossEliteKills`
  - `updateHuntKills`
  - `updateLootBosses`
  - `.bossesKilled.Add`
  - `.huntKilled.Add`
  - `.listBossesLootDiscovered`

Runtime smoke:

1. Launch Ancient Kingdoms with the built mod installed.
2. Open the Bestiary on a character with at least one locked monster.
3. Select a locked monster.
4. Confirm the selected detail panel shows real name, image, level, stats, lore, type, class, zone, and loot icons.
5. Hover at least one revealed loot icon and confirm the stock tooltip appears.
6. Confirm the left grid remains vanilla: locked entries still use vanilla coloring and the discovered count still reflects actual progress.
7. Close and reopen the Bestiary; confirm no discovery/progress was granted.
8. Restart or reload the character if practical; confirm the same monster remains undiscovered in actual progress state.

## Open implementation notes

- Existing mod projects use `TargetFramework` `net6.0` and reference MelonLoader and IL2CPP assemblies through `Directory.Build.props` / `Local.props`.
- `BestiaryRevealer.csproj` should follow the small UI-mod pattern and add Harmony references from `$(MelonLoaderPath)\net6`.
- The patch should use `Il2Cpp.*` game types from `Assembly-CSharp.dll` and Unity types from the IL2CPP Unity assemblies.
- The first implementation slice should include temporary debug logging only if needed to confirm the postfix is active; remove noisy instrumentation before completion.
