## 1. Keep zone-shot capture working

- [x] 1.1 Move character creation from CombatVerification into HotReplCommands as `character.create`, with its creator driver, method-name helper, DTOs, and tests, and verify that HotReplCommands.Tests pass (commit e019792b).
- [x] 1.2 Deploy the mods, remove the deployed DLLs of the removed mods, and run `character.create`, `world.enter`, and `game.quit` in a scratch session. Verify the command results and an unchanged player save hash.

## 2. Remove the engine and its verification

- [x] 2.1 Remove the combat engine, its verification corpus code, `verification/`, and the `test:combat-verification` script, and verify that svelte-check, knip, and the website tests pass (commit e7e4ae79).
- [x] 2.2 Remove `build-tool verify` with its fixture, observation, scratch, save-backup, and assembly-identity code and the session hooks only it used, and verify that the BuildTool.Tests pass (commit e7e4ae79).
- [x] 2.3 Remove the CombatVerification and CharacterCapture mods, their tests and solution entries, and the `world.summary` verification session field, and verify that every mod builds and every test project passes (commit e7e4ae79).
- [x] 2.4 Remove the planner payload, its input checks, and the snapshot identity check from `compendium build`, and verify that pytest passes, including a build without a decompiled snapshot, and that a real `compendium build` publishes the database (commit e7e4ae79).
- [x] 2.5 Update ARCHITECTURE.md, CONTRIBUTING.md, `mods/README.md`, and the agent skills, and verify that `compendium docs check` passes (commit e7e4ae79).
- [x] 2.6 Move the Unity float helpers to `website/src/lib/calculation/unity-math.ts`, and verify that svelte-check and the website tests pass (commit f82adac1).

## 3. Record the retirement

- [x] 3.1 Delete `decouple-build-from-decompiled-snapshot`, remove the planner payload from `prune-unread-database-data`, validate this change strictly, sync its deltas into `openspec/specs`, and archive it.
