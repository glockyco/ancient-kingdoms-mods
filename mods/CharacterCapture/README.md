# CharacterCapture

Records the local character's build and the combat meter totals for the combat engine.

Not published as a download. `build-tool deploy` installs it with the other mods.

## Use

Run the HotRepl command `character.capture` to write the build to `UserData/CharacterCapture/character-capture.json`, replacing the previous file. Run `combatMeter.capture` to get the meter totals of the player and their active companions as the command's result.

## Settings

None.

## Limits

Both commands need a character in the world. When the game does not expose part of the build, the capture marks it as incomplete.

## Requirements

MelonLoader and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md).
The HotRepl host, installed by `build-tool deploy-host`.
