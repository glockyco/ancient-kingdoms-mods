## 1. Baseline

- [x] 1.1 Record the current `buildid`, `StateFlags`, and `installdir` from `appmanifest_2241380.acf`, and the current `dotnet test tests/BuildTool.Tests` count, so later steps compare against a measurement. The spike behind this change left the installation at build `24878482`.
      Measured 2026-08-23: `buildid` `24878482`, `StateFlags` `4`, `installdir` `Ancient Kingdoms`,
      `SizeOnDisk` `7413776621`. Tests: 88 passed, 0 failed.
      The bottle holds five applications, as the design states: `1154960` Ardenfall, `1837770`
      Ardenfall Demo, `2241380` Ancient Kingdoms, `228980` Steamworks Common Redistributables,
      `2382520` Erenshor.
- [x] 1.2 Record that exactly one installation of the game exists on this machine, so the single-installation claim can be rechecked after the update work.
      Measured 2026-08-23 by searching `$HOME` to depth 14: one `ancientkingdoms.exe`, one
      `appmanifest_2241380.acf`, both in the bottle's Steam library, and no `steamapps` directory
      nested inside the installation.

## 2. Remove the second host

- [x] 2.1 Delete `build-tool/Game/WindowsEnvironment.cs`.
- [x] 2.2 Reduce `GameLauncher` to the wine path and drop its `bool` parameter.
- [x] 2.3 Delete the `AddSingleton(typeof(bool), OperatingSystem.IsMacOS())` registration in `Program.cs` and the corresponding constructor parameters in `LaunchCommand` and `ExportCommand`.
- [x] 2.4 Delete the non-macOS branch of `SetupCommand.DetectGamePath` and `SetupCommand.IsMacOS`. Make the wine prompt and its validation unconditional.
- [x] 2.5 Delete the `includeWine` parameter from `LocalConfigWriter.Write` and `LocalConfigWriter.NoteChanges` and every call site.
- [x] 2.6 Reduce `PlatformEnvironmentTests` to the wine case and delete its `WindowsConfig` fixture.

## 3. Make launch configuration required

- [x] 3.1 Change `LocalConfig.WinePath` and `LocalConfig.WinePrefix` to non-nullable and update `LocalConfig.Empty`.
- [x] 3.2 Read both with `Require` in `LocalConfigLoader`.
- [x] 3.3 Delete the null guard at the top of `WineEnvironment.BuildLaunchRequest`.
- [x] 3.4 Update `ExportCommandTests`, `DeployCommandTests`, `DeployHostCommandTests`, and `LocalConfigLoaderTests` to stop constructing configurations with null wine paths.
- [x] 3.5 Add a test proving a `Local.props` without a wine key fails at load and names the key and the file.

## 4. Identify the installation by application id

- [x] 4.1 Add manifest reading that returns `installdir`, `buildid`, and `StateFlags` for a given application id, and a single constant for the application id `2241380`.
- [x] 4.2 Rewrite `SetupCommand.DetectGamePath` to scan bottles, read each manifest, and resolve candidates from the recorded `installdir`.
- [x] 4.3 Accept a candidate only when its managed assembly directory exists.
- [x] 4.4 Fail and name every candidate when more than one bottle matches, instead of selecting one.
- [x] 4.5 Add tests for the manifest lookup, a renamed installation directory, two matching bottles, and a candidate holding only the executable.
- [x] 4.6 Confirm discovery against the live bottle, which holds five applications including a second game, and verify it selects Ancient Kingdoms.
      Confirmed 2026-08-23 by moving `Local.props` aside so no stored value could supply the
      default, then running `setup`. Discovery resolved
      `.../Bottles/Steam/drive_c/Program Files (x86)/Steam/steamapps/common/Ancient Kingdoms`
      from `appmanifest_2241380.acf`, and the file it wrote is byte-identical to the previous one.
      The bottle also holds Ardenfall, Ardenfall Demo, Erenshor, and Steamworks Common
      Redistributables, none of which were selected.

## 5. Reimplement the update through Steam

- [x] 5.1 Derive the CrossOver launcher path from the directory of the configured wine binary, and fail naming the program and that path when it is absent.
- [x] 5.2 Derive the bottle name from the configured wine prefix, as `WineEnvironment` already does.
- [x] 5.3 Start the Steam client in that bottle and wait until it is ready, because a protocol URL alone does not sustain a download and the measured cold run died with the launcher that carried it.
- [x] 5.4 Issue `steam://validate/<application id>` through the launcher. Do not use `steam://install`: measured against the live bottle it detected the update and then deferred the download by roughly a day through the client's own stagger.
- [x] 5.5 Poll the manifest through the transition `6 → 1030 → 4` and hold the client until it settles. Report the recorded build identifier. Fail and report the observed state if it does not settle within the time allowed.
- [x] 5.6 Report that the installation was already current when the build identifier does not change.
- [x] 5.7 Rewrite `UpdateCommandTests` to assert the client start, the validate URL, the bottle, the application id, and the manifest wait. Delete the assertions about `steamcmd` arguments. Pin that the request is a validation, so a later edit to `install` fails the test.
- [x] 5.8 Delete `UpdateCommand.ReadSteamUsername` and the `[steam]` section from `config.toml`.

## 6. Remove the second-installation remnants

- [x] 6.1 Delete the `.steam-download/` entry from `.gitignore`.
- [x] 6.2 Delete `docs/plans/2026-05-27-server-auto-update-design.md` and its entry in `docs/plans/INDEX.md`.
- [x] 6.3 Delete the `.steam-download/` reference from `.claude/skills/update-game-version/SKILL.md`.
- [x] 6.4 Search the repository for any remaining reference to a second game location or to `steamcmd` and remove what it finds.

## 7. Describe the supported setup

- [x] 7.1 Rewrite the README requirement for the game install to name the CrossOver Steam bottle, and remove the `steamcmd` prerequisite.
- [x] 7.2 Replace "CrossOver or another Wine setup" in the README with the supported setup.
- [x] 7.3 Change `CLAUDE.md` to describe the mods as macOS through CrossOver.
- [x] 7.4 Update `.claude/skills/update-game-version/SKILL.md` so its steps match the surviving commands, including how the update is now performed and verified.
- [x] 7.5 Confirm the remediation message in `scripts/update-server-scripts.sh` still names a command that exists.
      Confirmed: lines 9 and 120 name `dotnet run --project build-tool update`, which survives.
- [x] 7.6 Read every changed document for historical framing and remove it. The documents describe the current setup only.
      Read `README.md`, `CLAUDE.md`, `mods/CLAUDE.md`, the version-update skill, `docs/plans/INDEX.md`
      and the overview. No historical framing was introduced. The three matches for words such as
      "previously" are a description of purpose and two rules that forbid temporal language.
      `mods/CLAUDE.md` claimed the mods work "natively on Windows" directly above a `build-tool
      setup` invocation that cannot run there; corrected to name the one supported host.

## 8. Verification

- [x] 8.1 Run `dotnet test tests/BuildTool.Tests` and compare against the task 1.1 count.
      104 passed, 0 failed, against a baseline of 88. Two Windows cases were deleted and
      eighteen were added: required configuration, manifest discovery, and the update.
- [x] 8.2 Run `dotnet run --project build-tool setup` and confirm it detects the bottle by application id and writes every required key.
      All four required keys written. With `Local.props` moved aside so no stored value could
      supply a default, discovery still resolved the install from `appmanifest_2241380.acf`, and
      the file written was byte-identical to the previous one.
- [x] 8.3 Run the new `update` against the live bottle. Confirm `StateFlags` returns to `4` and the reported build identifier matches the manifest. The installation is already current, so this exercises the already-current report rather than a download.
      Exit 0. `StateFlags` reads `4` and the reported build `24878482` matches the manifest, so
      the already-current report is exercised as intended.
      Two observations that the run measured rather than assumed:
      - Steam did act on the request. Its own `logs/content_log.txt` records
        `AppID 2241380 App update changed : Running Update,Verifying Installed,` at 15:02:17 and
        `scheduler finished : removed from schedule (result No Error, ...)` at 15:02:29.
      - The manifest never moved. `LastUpdated` and `buildid` are unchanged, so Steam did not
        rewrite the file for a validation that changed nothing. The work-start poll therefore
        saw nothing and the command concluded "already current" by exhausting its two-minute
        work-start timeout rather than by observing the transition. The result is right and the
        reasoning is not, and the whole command took 2m25s for a no-op.
      Recorded, not fixed here: the run finished about one second before the timeout would have
      cancelled the client mid-verification. A real update rewrites the manifest, so the settle
      wait covers it; only the no-op path depends on the timeout.
- [x] 8.4 Confirm exactly one installation of the game still exists, and that no nested `steamapps` directory was created inside it.
      One `ancientkingdoms.exe`, one `appmanifest_2241380.acf`, no `steamapps` directory inside
      the installation. The nesting the old `+force_install_dir` call would have produced did
      not occur.
- [x] 8.5 Run `dotnet run --project build-tool export` end to end and confirm it produces a complete export from the updated install.
      Exit 0 in 1m44s. The game launched through the wine path with no platform fork, HotRepl
      drove the export, and all 34 JSON files were written and parse.
- [x] 8.6 Run `openspec validate crossover-bottle-only-setup --strict`.
      Valid. The four main specs also pass `--strict`.
- [x] 8.7 Grep the repository for `Windows`, `another Wine`, `steamcmd`, and `.steam-download` and confirm every survivor is legitimate.
      `steamcmd`, `another Wine`, `.steam-download`, `WindowsEnvironment` and `isMacOs` all reach
      zero outside the OpenSpec artifacts. Every surviving `Windows` was read:
      - vendored ILSpy and the decompiled `server-scripts*` trees, neither of them ours;
      - `SteamBottle.SteamExecutableWindowsPath`, the path form inside the bottle;
      - "CrossOver runs the Windows game as x86-64" and the Cpp2IL note, both describing the
        game binary rather than a host;
      - `SetupCommand.DefaultProfilePath`, which selects where HotRepl's `profiles.json` lives
        and still branches on Windows and XDG. Recorded rather than removed: it is not a game
        launch path, and the proposal's removal list does not name it. On the one supported
        host those branches are unreachable, so it is a candidate for a later change.
