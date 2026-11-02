# Proposal

## Why

A player's report listed two stopped features with the same first line, a NullReferenceException from Il2CppInterop, and nothing else. It took a reproduction in the game to learn that both failures followed leaving a world and entering one again, and where in Pocket Compendium they were thrown. A report that names where and when an error happened points at its cause without a reproduction.

## What Changes

- The details list every error Pocket Compendium logged since the game started, instead of only the features that stopped. Respawn tracking, a Bestiary page left to the game and a failed cleanup reach the report too.
- Each error in the details names what failed, where the player was at that moment, the exception's first line, the frame that threw it and the Pocket Compendium frames that led there, with file name and line.
- The details name how many worlds the player entered since the game started, and each error names the world it happened in or after. The log names the world's number on each world entry.
- The mod's DLL carries its debug symbols, with paths relative to the repository, so stack traces in the log and in the details name files and lines.
- An exception in a patch of a game method stops its feature instead of reaching the game, where it was logged on every frame and missed by the report.
- The problem form shows the details as plain text, so frames keep their lines and characters.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mod-feedback`: the details list every logged error with its location and circumstances and the number of worlds entered, the link leaves out frames before it gives up error lines, the problem form shows the details as text, the log numbers each world entry, and an error in a patch stops its feature.

## Impact

- `mods/PocketCompendium/Core/Log.cs`, `Core/Feedback/` (details, setup reader, a session record of worlds and errors), `Core/Features/FeatureRegistry.cs` and every `Log.Error` call site.
- `mods/PocketCompendium/Features/BestiaryPages/Patches/UIBestiaryDetailPatch.cs` and `Features/BestiaryPages/Ui/GamepadLootNavigation.cs`.
- `mods/PocketCompendium/PocketCompendium.csproj`: embedded symbols and a path map.
- `.github/ISSUE_TEMPLATE/pocket-compendium-problem.yml`.
- `tests/PocketCompendium.Tests/Core/ProblemReportTests.cs`.
