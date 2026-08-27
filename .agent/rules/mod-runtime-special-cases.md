---
description: Apply verified runtime special cases when editing the map, respawn, screenshot, bestiary, or boss-skill mods.
globs:
  - "mods/MapTeleporter/**"
  - "mods/MapScreenshotter/**"
  - "mods/MonsterRespawner/**"
  - "mods/ResourceRespawner/**"
  - "mods/BetterBestiary/**"
  - "mods/BossSkillTracker/**"
  - "mods/FieldDefaultValueHookFix/**"
---
# Mod runtime special cases

## MapTeleporter

Use the `localMap` rectangle, not the outer `rectTransformMap`. Screen-space overlay conversion uses a null camera. World bounds come from the Cinemachine `mapCamera`, not the minimap camera. Map the square texture proportions, not the stretched display aspect.

## MapScreenshotter

Capture uses an orthographic camera sized from the tile's world size, in `mods/MapScreenshotter/MapScreenshotter.cs`. Zone bounds are authoritative when available. Entity bounds with padding are only the documented fallback. Screenshot capture hides world entities and deactivates the player. Verify lifecycle restoration before changing capture shutdown.

## Respawners

Eligibility, countdowns and the respawn deadline are all on the synchronized server clock. The respawn write backdates that deadline so the next respawn check finds the monster eligible, in `mods/MonsterRespawner/MonsterRespawner.cs`. Read the write before changing it.

## BetterBestiary and BossSkillTracker

Keep the BetterBestiary TypeScript/C# formatter parity fixture synchronized. BossSkillTracker discovery remains combat-gated and bounded. Do not add global object enumeration, per-frame spatial scans, or UI fallbacks that hide a missing required resource.

## FieldDefaultValueHookFix

`FieldDefaultValueHookFix` is the one sanctioned exception, and it concerns a function pointer, not a field value. Il2CppInterop's signature scan for `Class::GetDefaultFieldValue` matches the wrong function on this build and crashes at world entry. The mod redirects the lookup to Il2CppInterop's signature-free traversal (`mods/FieldDefaultValueHookFix/FieldDefaultValueHookFix.cs`). Its failure paths leave the hook alone, so the game keeps unpatched behaviour. Do not generalize it.
