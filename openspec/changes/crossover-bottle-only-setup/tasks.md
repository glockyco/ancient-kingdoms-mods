## 1. Baseline

- [ ] 1.1 Record the current `buildid`, `StateFlags`, and `installdir` from `appmanifest_2241380.acf`, and the current `dotnet test tests/BuildTool.Tests` count, so later steps compare against a measurement. The spike behind this change left the installation at build `24878482`.
- [ ] 1.2 Record that exactly one installation of the game exists on this machine, so the single-installation claim can be rechecked after the update work.

## 2. Remove the second host

- [ ] 2.1 Delete `build-tool/Game/WindowsEnvironment.cs`.
- [ ] 2.2 Reduce `GameLauncher` to the wine path and drop its `bool` parameter.
- [ ] 2.3 Delete the `AddSingleton(typeof(bool), OperatingSystem.IsMacOS())` registration in `Program.cs` and the corresponding constructor parameters in `LaunchCommand` and `ExportCommand`.
- [ ] 2.4 Delete the non-macOS branch of `SetupCommand.DetectGamePath` and `SetupCommand.IsMacOS`. Make the wine prompt and its validation unconditional.
- [ ] 2.5 Delete the `includeWine` parameter from `LocalConfigWriter.Write` and `LocalConfigWriter.NoteChanges` and every call site.
- [ ] 2.6 Reduce `PlatformEnvironmentTests` to the wine case and delete its `WindowsConfig` fixture.

## 3. Make launch configuration required

- [ ] 3.1 Change `LocalConfig.WinePath` and `LocalConfig.WinePrefix` to non-nullable and update `LocalConfig.Empty`.
- [ ] 3.2 Read both with `Require` in `LocalConfigLoader`.
- [ ] 3.3 Delete the null guard at the top of `WineEnvironment.BuildLaunchRequest`.
- [ ] 3.4 Update `ExportCommandTests`, `DeployCommandTests`, `DeployHostCommandTests`, and `LocalConfigLoaderTests` to stop constructing configurations with null wine paths.
- [ ] 3.5 Add a test proving a `Local.props` without a wine key fails at load and names the key and the file.

## 4. Identify the installation by application id

- [ ] 4.1 Add manifest reading that returns `installdir`, `buildid`, and `StateFlags` for a given application id, and a single constant for the application id `2241380`.
- [ ] 4.2 Rewrite `SetupCommand.DetectGamePath` to scan bottles, read each manifest, and resolve candidates from the recorded `installdir`.
- [ ] 4.3 Accept a candidate only when its managed assembly directory exists.
- [ ] 4.4 Fail and name every candidate when more than one bottle matches, instead of selecting one.
- [ ] 4.5 Add tests for the manifest lookup, a renamed installation directory, two matching bottles, and a candidate holding only the executable.
- [ ] 4.6 Confirm discovery against the live bottle, which holds five applications including a second game, and verify it selects Ancient Kingdoms.

## 5. Reimplement the update through Steam

- [ ] 5.1 Derive the CrossOver launcher path from the directory of the configured wine binary, and fail naming the program and that path when it is absent.
- [ ] 5.2 Derive the bottle name from the configured wine prefix, as `WineEnvironment` already does.
- [ ] 5.3 Start the Steam client in that bottle and wait until it is ready, because a protocol URL alone does not sustain a download and the measured cold run died with the launcher that carried it.
- [ ] 5.4 Issue `steam://validate/<application id>` through the launcher. Do not use `steam://install`: measured against the live bottle it detected the update and then deferred the download by roughly a day through the client's own stagger.
- [ ] 5.5 Poll the manifest through the transition `6 → 1030 → 4` and hold the client until it settles. Report the recorded build identifier. Fail and report the observed state if it does not settle within the time allowed.
- [ ] 5.6 Report that the installation was already current when the build identifier does not change.
- [ ] 5.7 Rewrite `UpdateCommandTests` to assert the client start, the validate URL, the bottle, the application id, and the manifest wait. Delete the assertions about `steamcmd` arguments. Pin that the request is a validation, so a later edit to `install` fails the test.
- [ ] 5.8 Delete `UpdateCommand.ReadSteamUsername` and the `[steam]` section from `config.toml`.

## 6. Remove the second-installation remnants

- [ ] 6.1 Delete the `.steam-download/` entry from `.gitignore`.
- [ ] 6.2 Delete `docs/plans/2026-05-27-server-auto-update-design.md` and its entry in `docs/plans/INDEX.md`.
- [ ] 6.3 Delete the `.steam-download/` reference from `.claude/skills/update-game-version/SKILL.md`.
- [ ] 6.4 Search the repository for any remaining reference to a second game location or to `steamcmd` and remove what it finds.

## 7. Describe the supported setup

- [ ] 7.1 Rewrite the README requirement for the game install to name the CrossOver Steam bottle, and remove the `steamcmd` prerequisite.
- [ ] 7.2 Replace "CrossOver or another Wine setup" in the README with the supported setup.
- [ ] 7.3 Change `CLAUDE.md` to describe the mods as macOS through CrossOver.
- [ ] 7.4 Update `.claude/skills/update-game-version/SKILL.md` so its steps match the surviving commands, including how the update is now performed and verified.
- [ ] 7.5 Confirm the remediation message in `scripts/update-server-scripts.sh` still names a command that exists.
- [ ] 7.6 Read every changed document for historical framing and remove it. The documents describe the current setup only.

## 8. Verification

- [ ] 8.1 Run `dotnet test tests/BuildTool.Tests` and compare against the task 1.1 count.
- [ ] 8.2 Run `dotnet run --project build-tool setup` and confirm it detects the bottle by application id and writes every required key.
- [ ] 8.3 Run the new `update` against the live bottle. Confirm `StateFlags` returns to `4` and the reported build identifier matches the manifest. The installation is already current, so this exercises the already-current report rather than a download.
- [ ] 8.4 Confirm exactly one installation of the game still exists, and that no nested `steamapps` directory was created inside it.
- [ ] 8.5 Run `dotnet run --project build-tool export` end to end and confirm it produces a complete export from the updated install.
- [ ] 8.6 Run `openspec validate crossover-bottle-only-setup --strict`.
- [ ] 8.7 Grep the repository for `Windows`, `another Wine`, `steamcmd`, and `.steam-download` and confirm every survivor is legitimate.
