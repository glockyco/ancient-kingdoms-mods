# Typed control commands

Read command implementations and XML documentation in `mods/HotReplCommands/Commands/`.

## HotReplCommands

| Command | Kind | Arguments |
| --- | --- | --- |
| `compendium.preflight` | sync | `{}` |
| `world.summary` | sync | `{}` |
| `world.enter` | job | `{"character": string?}` |
| `compendium.export` | job | `{"screenshots": bool}` |
| `game.quit` | sync | `{}` |
| `game.useScratchDatabase` | sync | `{}` |
| `capture.zoneShots` | job | See `ZoneShotsArgs` in `mods/HotReplCommands/Dtos/ZoneShots.cs` |
| `character.create` | job | `{"characterName": string, "class": string, "race": string, "replaceCharacterName": string?}` |
| `ui.pointer` | job | `{"path": string?, "x": number?, "y": number?, "action": "hover" \| "click", "holdSeconds": number}` |
| `character.raiseLevel` | sync | `{"level":40}` |
| `inventory.grant` | sync | `{"itemName":"Seal of Chaos","amount":1}` |
| `chambers.enter` | job | `{}` |
| `chambers.state` | sync | `{}` |
| `chambers.navigate` | job | See `ChambersNavigateArgs` in `mods/HotReplCommands/Dtos/Chambers.cs` |

## HotRepl Unity commands

| Command | Kind | Arguments |
| --- | --- | --- |
| `unity.screenshot.capture` | job | `{}` |

## Caveats

- `world.enter` selects the lowest name in ordinal order when `character` is absent.
- `ui.pointer` returns once a hover has had time to show and keeps the pointer there until `holdSeconds`, so take the screenshot right after it. A later call replaces the hold. Its `topElement` names what takes the pointer at the point.
- `compendium.export` enters the world when needed before it exports.
- `character.create` opens character selection when needed. On a full roster, it removes only the
  named `replaceCharacterName` from an earlier run, then returns `rosterSlotFreed`. Relaunch before
  retrying because the selection screen caches its roster.

## Zone framing and receipts

`capture.zoneShots` requires a spawned player and a successful `game.useScratchDatabase` receipt.
Its DTOs in `mods/HotReplCommands/Dtos/ZoneShots.cs` define the versioned focal and receipt schemas.
Use the checked-in `build-pipeline/zone_shot_focal_points.json` unless reviewing a separate focal file.
Existing array manifests remain readable for authored zones and Temple. The first merged capture
upgrades their receipts atomically while retaining the original images and framing. No recapture is needed.

Authored zones use absolute focal positions. Position-suppressed Temple of Valaark instead uses
one live monster's authored spawn plus a relative offset. Its receipt never records the resolved
absolute position. Both modes require live trigger containment and preserve their existing checks.
Neither mode authorizes publishing suppressed geometry.

Procedural Chambers records use `procedural_run`. Their camera offset is in world units relative
to the loaded room's entrance, not its private-scene origin. The configured chamber index is zero-based.
Capture verifies the paid run's owner, seed, room, trial, loaded scene, remaining time and readiness.
It moves only the camera and keeps the room's lighting, atmosphere and creatures.
The player stays at the entrance, and creatures far from the player are not shown on the client.
Keep the offset within about 60 units of the entrance, or the frame shows an empty room.
Death, timeout, cancellation, transition or unload invalidates capture. Cleanup never warps the
player back into a stale room. UI, players, nameplates, health bars and world text are hidden.

Use `captureIds` for one primary shot or illustration. `zoneIds` selects a zone's records.
With neither selector, capture covers authored and anchored zones only.
Later captures atomically merge into the manifest without erasing earlier records.
Each receipt identifies its artwork kind and digest-named PNG, dimensions, timestamp and SHA-256.
Procedural receipts also retain seed, chamber, trial and entrance-relative camera offset.
These private coordinates are provenance, not published geography.

Each focal record can override the file's frame scale. `frameScale` is a preview-only override.
The native gameplay frame scales camera size and pixel dimensions together, maintaining 48 pixels
per world unit. The pipeline checks configured framing and publishes photographs at 960 by 540.
It validates the complete set, including each illustration, before publishing any image.

Review every selected frame by eye. Require three visibly different generated layouts for Chambers,
with one zone shot and two separately identified illustrations. Reject withheld clue text, rune labels,
answer sequences and excluded item names or icons. Revise the focal position and recapture any unsuitable
frame rather than editing its receipt. A valid digest does not establish publication safety.

## Scratch Chambers controls

All setup, state and navigation commands refuse without the successful scratch redirect.
Mutation requires a local host, never a remote server. `character.raiseLevel` runs the game's
experience progression and reports the level before and after. `inventory.grant` resolves an exact
runtime item name and reports inventory counts before and after.

`chambers.enter` approaches the unique live keeper placement and invokes the same entry command
as its confirmation dialog. It waits for a ready owned room and reports before/after state and seal
counts. It does not set zone 26 or warp into tower coordinates. Entry remains subject to the game's
level, combat, party and inventory checks.

`chambers.state` reads the current run without exposing challenge solutions.
`chambers.navigate` can approach a live room object, invoke its interaction, submit an explicit
answer choice, or leave through the game's run cleanup. It never completes a trial by rewriting
run fields. Read its before/after receipt because a refused interaction returns normally in the game.
Object indices and allowed actions are defined by the typed DTO and command implementation.
