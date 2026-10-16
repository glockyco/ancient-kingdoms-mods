## Why

The repository modelled combat with its own engine and checked it against fixture characters measured in the running game. It produced no results the site could publish, yet every game update cost fixture refreshes and changes across the website, the pipeline, `build-tool`, and two mods. The owner chose to remove it. A separate project now simulates combat on the game's own dedicated server.

## What Changes

- **BREAKING** `build-tool verify`, the committed fixtures and observations in `verification/`, and the website `test:combat-verification` script are removed.
- **BREAKING** The CombatVerification and CharacterCapture mods are removed with their HotRepl commands: `fixture.*`, `probe.*`, `character.capture`, and `combatMeter.capture`.
- `character.create` moves to HotReplCommands, because zone-shot capture needs a character in the scratch database.
- The combat engine under `website/src/lib/planner/` is removed. Its Unity float and rounding helpers, which the calculators use, move to `website/src/lib/calculation/unity-math.ts`.
- `compendium build` no longer writes the planner payload or checks planner inputs. It no longer reads `server-scripts/SNAPSHOT.toml`, because its export-against-snapshot check existed to give the payload a matching assembly identity.
- `build-tool` sessions keep the ownership and cleanup that export relies on. The launch hooks only verification used, the verification session variable, and the `world.summary` field that echoed it are removed. The launched process carries a `--ak-game-session` marker.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `combat-model`: retired. Every requirement is removed.
- `combat-verification`: retired. Every requirement is removed.
- `game-toolchain`: The verification-run requirements are removed. One requirement states the session ownership and cleanup that export still relies on.
- `compendium-build`: A build publishes the database and the images, without a planner payload.
- `game-calculators`: A published combat simulator must be verified against the running game, because no engine in this repository backs one.

## Impact

Commits e019792b, e7e4ae79, and f82adac1 carry the code. The active change `decouple-build-from-decompiled-snapshot` is deleted, because it moved a payload that no longer exists. `prune-unread-database-data` no longer lists the planner payload as a reader. The removed code remains in history before e7e4ae79.
