## Why

`world.enter` selects the first character the database returns. `Database.GetCharacters` runs
`SELECT * FROM characters` with no `ORDER BY`, so the order is unspecified and changes when a save
rewrites a row. Three consecutive runs during exploration entered the world as three different
characters, and the command reports neither which character it chose nor that a choice was made.

A caller cannot address a known character, and a caller cannot tell which character it received. Any
measurement taken through this path is therefore attributed to an unknown subject. The combat
verification harness needs to address each of the six classes, so it needs this before it can
materialize a fixture.

The five shipped runtime commands have no behaviour contract. This change creates one for the command
surface, so that later command work extends a stated contract instead of inventing one.

## What Changes

- Add an optional character name to `world.enter`. When the name is present, the command enters the
  world as that character or fails.
- Make the default selection deterministic. When no name is present, the command orders the available
  characters by name and takes the first, so one database produces one answer.
- Report the selected character name in the result, whether or not the caller asked for one.
- Fail with a stated precondition when a requested character does not exist, and list the names that do.
- Fail with a stated precondition when the game already holds a different character, rather than
  attempting to leave the world and re-enter it.
- **BREAKING**: `world.enter` accepts an argument object where it previously accepted none, and its
  result carries an additional field. Both are additive for a caller that sends `{}` and ignores
  unknown fields.

## Capabilities

### New Capabilities

- `runtime-control`: the typed runtime command surface that the repository exposes for driving and
  reading a running game, and the determinism each command guarantees to its caller.

### Modified Capabilities

<!-- No existing capability covers the runtime command surface. -->

## Impact

- `mods/HotReplCommands/`: `WorldEntry` gains character selection, `world.enter` gains an argument
  object, and its result gains the selected name. `compendium.export` shares `WorldEntry` and keeps its
  current behaviour by requesting no specific character.
- `add-combat-verification-harness`: its character selection task reuses this selection rather than
  implementing a second one.
- `.agent/skills/hotrepl-runtime-inspection/SKILL.md`: the command table records the new argument.
- No change to exported data, the database schema, or the website.
