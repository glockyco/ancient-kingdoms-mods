# Typed control commands

Read command implementations and XML documentation in `mods/HotReplCommands/Commands/`,
`mods/CombatVerification/Commands/`, and `mods/CharacterCapture/CaptureCommands.cs`.

## HotReplCommands

| Command | Kind | Arguments |
| --- | --- | --- |
| `compendium.preflight` | sync | `{}` |
| `world.summary` | sync | `{}` |
| `world.enter` | job | `{"character": string?}` |
| `compendium.export` | job | `{"screenshots": bool}` |
| `game.quit` | sync | `{}` |
| `game.useScratchDatabase` | sync | `{}` |
| `capture.zoneShots` | job | `{"focalPointsPath": string?, "zoneIds": string[]?, "includeCreatures": bool?, "frameScale": number?}` |

## CombatVerification

| Command | Kind | Arguments |
| --- | --- | --- |
| `fixture.validate` | sync | `FixtureDescriptor` |
| `fixture.validateMatrix` | sync | `FixtureMatrix` |
| `fixture.createCharacter` | job | `{"characterName": string, "class": string, "race": string, "replaceCharacterName": string?}` |
| `probe.statSheet` | sync | `{}` |
| `probe.targetState` | job | `{}` |
| `probe.perHitDamage` | job | `{"windowSeconds": number, "seed": int?}` |
| `probe.actionInterval` | job | `{"windowSeconds": number?}` |
| `fixture.buildCharacter` | job | `{"build": {...}, "buildData": {"character": {...}, "companions": [...], "consumables": [...], "learnedBookIds": [...], "provenance": {...}}}` |
| `fixture.observe` | job | `{"fixture": FixtureDescriptor}` |

## CharacterCapture

| Command | Kind | Arguments |
| --- | --- | --- |
| `character.capture` | sync | `{}` |
| `combatMeter.capture` | sync | `{}` |

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
- `fixture.observe` writes `observation.json` beside the scratch database and returns it as an artifact. Outside the scratch database it fails with `notScratch` after measuring.
- `character.capture` writes `UserData/CharacterCapture/character-capture.json` and returns it as an artifact. `combatMeter.capture` returns the meters inline. Both need a spawned player.
- `capture.zoneShots` requires a spawned player and the owned scratch database. It reads the checked-in
  `build-pipeline/zone_shot_focal_points.json` by default. This object contains a positive finite
  default `frame_scale` and a `zones` array of `zone_id`, `x`, `y`, and `comment` records, each with
  an optional positive finite `frame_scale` override.
  Position-suppressed Temple of Valaark instead requires `anchor: {"monster": "<monster_id>"}` and
  an optional relative `offset: [dx, dy]` in world units (default `[0,0]`); absolute `x`/`y` are refused.
  The anchor must resolve to exactly one valid-scene monster spawn with the zone's authoritative
  `idZone`. The resolved offset point must lie in a live zone trigger. The manifest stores only the
  anchor and offset, never absolute coordinates. Normal zones refuse anchors and offsets.
  Screenshots show only what an in-zone player sees; they do not authorize publishing temple geometry.
  `frameScale` is absent by default. Supply it only to override every zone's scale for a FOV preview;
  otherwise each row's scale overrides the file default. Publication captures must match each zone's
  configured effective scale, which the pipeline validates.
  All configured scales are validated before capture state changes. For each zone, the gameplay camera
  uses orthographic size 11.25×effective scale and a native render texture of 1920×effective scale by
  1080×effective scale (rounded to nearest, midpoint ties away from zero), maintaining 48 pixels per
  world unit. Buffers are reused when dimensions match and replaced when they change.
  It writes `screenshots/zones/<zone_id>.png` plus a manifest recording each zone's actual native
  dimensions and camera size; the pipeline validates these and publishes 960×540 images with Lanczos
  resampling.
  `zoneIds` limits a review capture; rerun without the subset for the final manifest.
  `includeCreatures` defaults to true; false hides creatures while retaining scenery and resources.
  HUD canvases, player renderers, nameplates, and health bars are hidden in either mode.
  The game's area/daylight/weather lighting runs while each composition settles, and capture state
  is restored even when a coroutine fails. Excluded/unreleased zones are refused.
