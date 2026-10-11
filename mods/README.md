# Mods

This catalogue lists the player, gameplay, and tooling mods; each mod's page covers its controls, settings, limits, and requirements.

## Player installation

Install MelonLoader, then put the downloaded DLLs in the game's `Mods` folder with FieldDefaultValueHookFix. The published downloads do not include the gameplay or development mods below.

## Published player mods

| Mod | What it does | Download |
| --- | --- | --- |
| [FieldDefaultValueHookFix](FieldDefaultValueHookFix/README.md) | Prevents the crash on world entry caused by an incorrect Il2CppInterop method lookup. | [DLL](https://ancient-kingdoms.compendiums.org/mods/FieldDefaultValueHookFix.dll) |
| [BetterBestiary](BetterBestiary/README.md) | Reveals Bestiary details, loot tooltips, and skill summaries. | [DLL](https://ancient-kingdoms.compendiums.org/mods/BetterBestiary.dll) |
| [BossSkillTracker](BossSkillTracker/README.md) | Shows named monsters' skill cooldowns and special gates. | [DLL](https://ancient-kingdoms.compendiums.org/mods/BossSkillTracker.dll) |
| [BossTracker](BossTracker/README.md) | Lists named monsters' status, distance, direction, and respawn countdowns. | [DLL](https://ancient-kingdoms.compendiums.org/mods/BossTracker.dll) |

## Gameplay mods kept out of downloads

| Mod | What it does |
| --- | --- |
| [MapEnhancer](MapEnhancer/README.md) | Clears map fog and reveals existing monster map marks. |
| [MapTeleporter](MapTeleporter/README.md) | Teleports to a position selected on the map. |
| [MonsterRespawner](MonsterRespawner/README.md) | Shows dead monster markers and brings respawn deadlines forward. |
| [ResourceRespawner](ResourceRespawner/README.md) | Shows resource cooldown markers and brings ready deadlines forward. |

## Pipeline and development mods

| Mod | What it does |
| --- | --- |
| [DataExporter](DataExporter/README.md) | Exports game data and visual assets. |
| [MapScreenshotter](MapScreenshotter/README.md) | Captures tiled world-map images and metadata. |
| [HotReplCommands](HotReplCommands/README.md) | Exposes typed world, export, capture, and isolation controls. |
| [CombatVerification](CombatVerification/README.md) | Builds combat fixtures and measures runtime behavior. |
| [CharacterCapture](CharacterCapture/README.md) | Reads the local character's build and combat meters. |
| [HierarchyLogger](HierarchyLogger/README.md) | Dumps the World scene's object hierarchy. |

Building and deploying is in [CONTRIBUTING.md](../CONTRIBUTING.md).
