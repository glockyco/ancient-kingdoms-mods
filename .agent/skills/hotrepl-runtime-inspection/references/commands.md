# Typed control commands

Read command implementations and XML documentation in `mods/HotReplCommands/Commands/` and
`mods/CombatVerification/Commands/`.

## HotReplCommands

| Command | Kind | Arguments |
| --- | --- | --- |
| `compendium.preflight` | sync | `{}` |
| `world.summary` | sync | `{}` |
| `world.enter` | job | `{"character": string?}` |
| `compendium.export` | job | `{"screenshots": bool}` |
| `game.quit` | sync | `{}` |
| `game.useScratchDatabase` | sync | `{}` |
| `capture.zoneShots` | job | `{"focalPointsPath": string?, "zoneIds": string[]?, "includeCreatures": bool?}` |

## CombatVerification

| Command | Kind | Arguments |
| --- | --- | --- |
| `fixture.validate` | sync | `FixtureDescriptor` |
| `fixture.createCharacter` | job | `{"characterName": string, "class": string, "race": string, "replaceCharacterName": string?}` |
| `probe.statSheet` | sync | `{}` |
| `probe.targetState` | job | `{}` |
| `probe.perHitDamage` | job | `{"windowSeconds": number, "seed": int?}` |
| `probe.actionInterval` | job | `{"windowSeconds": number?}` |
| `fixture.buildCharacter` | job | `{"build": {...}, "buildData": {"character": {...}, "companions": [...], "consumables": [...], "learnedBookIds": [...], "provenance": {...}}}` |

## HotRepl Unity commands

| Command | Kind | Arguments |
| --- | --- | --- |
| `unity.screenshot.capture` | job | `{}` |

## Caveats

- `world.enter` selects the lowest name in ordinal order when `character` is absent.
- `compendium.export` enters the world when needed before it exports.
- `fixture.validate` needs a spawned player because class prefabs are unreadable before one exists.
- `fixture.createCharacter` opens character selection when needed. On a full roster, it removes only the
  named `replaceCharacterName` from an earlier fixture attempt, then returns `rosterSlotFreed`. Relaunch
  before retrying because the selection screen caches its roster.
- `probe.perHitDamage` does not make a live run reproducible when it receives the same seed.
- `probe.actionInterval` observes no action when `windowSeconds` is absent or zero. Another action must drive the subject.
- `fixture.buildCharacter` clears slots that the fixture does not declare because a created character has starter equipment.
- `capture.zoneShots` requires a spawned player and the owned scratch database. It reads the checked-in
  `build-pipeline/zone_shot_focal_points.json` by default, uses the actual gameplay camera at
  orthographic size 11.25 and 1920×1080, and writes `screenshots/zones/<zone_id>.png` plus a manifest.
  `zoneIds` limits a review capture; rerun without the subset for the final manifest.
  `includeCreatures` defaults to true; false hides creatures while retaining scenery and resources.
  HUD canvases, player renderers, nameplates, and health bars are hidden in either mode.
  The game's area/daylight/weather lighting runs while each composition settles, and capture state
  is restored even when a coroutine fails. Excluded/unreleased zones are refused.
