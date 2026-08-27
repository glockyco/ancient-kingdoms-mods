---
description: Apply verified runtime special cases when editing the map, respawn, screenshot, bestiary, or boss-skill mods.
globs:
  - "mods/MapTeleporter/**"
  - "mods/MapScreenshotter/**"
  - "mods/MonsterRespawner/**"
  - "mods/ResourceRespawner/**"
  - "mods/BetterBestiary/**"
  - "mods/BossSkillTracker/**"
---
# Mod runtime special cases

## MapTeleporter

Use the `localMap` rectangle, not the outer `rectTransformMap`. Screen-space overlay conversion uses a null camera. World bounds come from the Cinemachine `mapCamera`, not the minimap camera. Map the square texture proportions, not the stretched display aspect.

## MapScreenshotter

Capture uses an orthographic camera with `orthographicSize = tileSize / 2`. Zone bounds are authoritative when available. Entity bounds with padding are only the documented fallback. Screenshot capture hides world entities and deactivates the player; verify lifecycle restoration before changing capture shutdown.

## Respawners

Eligibility and countdowns use synchronized server time. `MonsterRespawner` backdates `respawnTimeEnd` with `Time.timeAsDouble - 1.0` because the game compares that field to Unity elapsed time. Do not replace that write with synchronized time.

## BetterBestiary and BossSkillTracker

An assembly marked `[HarmonyDontPatchAll]` must call `PatchAll()` explicitly. Keep the BetterBestiary TypeScript/C# formatter parity fixture synchronized. BossSkillTracker discovery remains combat-gated and bounded; do not add global object enumeration, per-frame spatial scans, or UI fallbacks that hide missing required resources.

`MonsterSkills.nextSpecialCastTime`, `Monster.startCombatTime` and `Monster.basicOnlySkillTimeEnd` are plain server fields. A client of a remote server reads them as zero, so any use must branch on `NetworkServer.active` and state which source the reader used. The skill list, the aggro list and the entity state are synchronized, and `Skill.cooldown`, `Skill.castTime` and `Skill.name` resolve from the local asset cache, so cooldown rows work for a client.
