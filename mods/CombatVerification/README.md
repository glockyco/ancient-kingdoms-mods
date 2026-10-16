# CombatVerification

Builds the characters that combat fixtures describe and measures their stats, damage, and timing in the game.

Not published as a download. `build-tool deploy` installs it with the other mods.

## Use

HotRepl commands:

| Command | Use |
| --- | --- |
| `fixture.validate`, `fixture.validateMatrix` | Check fixtures. |
| `fixture.buildCharacter` | Set up a character created with `character.create` as a fixture describes. |
| `probe.statSheet`, `probe.perHitDamage`, `probe.targetState`, `probe.actionInterval` | Measure stats, damage per hit, the target's state, and the time between actions. |
| `fixture.observe` | Record a fixture and write `observation.json` next to the scratch database. |

`build-tool verify` runs these commands. Each returns its result to the caller except `fixture.observe`.

## Settings

None.

## Limits

The commands change the character and the world. `fixture.observe` writes only while the game uses the scratch database.

## Requirements

MelonLoader and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md).
The HotRepl host, installed by `build-tool deploy-host`.
[DataExporter](../DataExporter/README.md) and [HotReplCommands](../HotReplCommands/README.md) in the game.
