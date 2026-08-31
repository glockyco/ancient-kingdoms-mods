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

## CombatVerification

| Command | Kind | Arguments |
| --- | --- | --- |
| `fixture.validate` | sync | `FixtureDescriptor` |
| `fixture.createCharacter` | job | `{"characterName": string, "class": string, "race": string, "replaceCharacterName": string?}` |
| `probe.statSheet` | sync | `{}` |
| `probe.targetState` | job | `{}` |
| `probe.perHitDamage` | job | `{"windowSeconds": number, "seed": int?}` |
| `probe.actionInterval` | job | `{"windowSeconds": number?}` |
| `fixture.buildCharacter` | job | `{"character": {...}, "companions": [...]}` |

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
