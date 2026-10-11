# CharacterCapture

Reads the local character's build and combat meters without changing gameplay state.

Not published as a download. `build-tool deploy` installs it with the other mods.

## Use

Use HotRepl command `character.capture` to overwrite `UserData/CharacterCapture/character-capture.json`. Use `combatMeter.capture` to return the player's and active companions' meters through the command channel.

## Settings

None.

## Limits

Both commands require the World scene and a loaded local player. Character capture reports incomplete data rather than inventing missing state.

## Requirements

MelonLoader, Ancient Kingdoms, and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md). The HotRepl host must be installed with `build-tool deploy-host`.
