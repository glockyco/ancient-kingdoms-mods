## Why

The repository describes three ways to run the game and supports one. `build-tool` carries a native Windows launch path, the README offers "CrossOver or another Wine setup", and `DetectGamePath` scans Windows drive letters. None of that has ever run. The one setup that works is macOS with the game in a CrossOver Steam bottle.

The same gap hides a defect in `update`. It invokes `steamcmd` with `+force_install_dir` pointed at the library install directory, and that flag produces a self-contained install root: the game files land in the named directory and a second manifest is written beneath it at `steamapps/appmanifest_2241380.acf`. Steam's own record, two levels up, is never touched. Running it would leave the bottle's Steam client believing an older build is installed while newer files sit on disk. The command is not merely unexercised. It cannot do what its name says.

The bottle's Steam client already installs and updates the game, and it is the only thing that ever has. The tooling should drive that rather than compete with it.

## What Changes

- **BREAKING** Remove the native Windows launch path. macOS with a CrossOver Steam bottle becomes the only supported host.
- **BREAKING** Reimplement `update` to drive the bottle's Steam client through a `steam://` protocol URL handed to CrossOver's launcher, instead of invoking `steamcmd`. Steam downloads into its own library, so no second copy can exist.
- Confirm the update by reading `StateFlags` and `buildid` from the Steam application manifest, rather than by trusting a process exit code.
- Remove the `steamcmd` dependency, the `[steam] username` setting, and the credential handling that existed only to feed it.
- Require `WINE_PATH` and `WINE_PREFIX` in `Local.props`. A configuration that cannot launch the game fails when it loads rather than when it launches.
- Locate the game through `appmanifest_2241380.acf` instead of the hardcoded folder name `Ancient Kingdoms`. The bottle holds five applications, so the application id is what identifies ours. `scripts/update-server-scripts.sh` already reads this file for `buildid`, so the two lookups stop disagreeing.
- Fail when more than one bottle holds the game, and name the candidates. Selecting one silently is a wrong answer delivered confidently.
- Accept an install only when its structure proves it usable, not when the executable file exists.
- Remove the second-install remnants: `.gitignore` for `.steam-download/`, the reference to it in the version-update skill, and the draft dedicated-server plan that proposes downloading outside the bottle.
- Correct the README, `CLAUDE.md`, and the version-update skill to describe the supported setup and nothing else.

## Capabilities

### New Capabilities

- `game-toolchain`: how the repository finds, validates, launches, and updates the one game installation, and what it requires of the workstation.

### Modified Capabilities

None. `compendium-build` and `compendium-redaction` describe the data pipeline, which this change does not touch.

## Impact

- **Removed:** `build-tool/Game/WindowsEnvironment.cs`, the non-macOS branch of `SetupCommand.DetectGamePath`, `SetupCommand.IsMacOS`, the `bool` service registration in `Program.cs`, the `includeWine` parameter through `LocalConfigWriter`, the null guard in `WineEnvironment`, and `UpdateCommand.ReadSteamUsername`.
- **Changed:** `LocalConfig.WinePath` and `LocalConfig.WinePrefix` become non-nullable. `LocalConfigLoader` requires both. `GameLauncher` no longer selects between platforms. `UpdateCommand` drives CrossOver's launcher and waits on the manifest.
- **Configuration:** `config.toml` loses its `[steam]` section. No new key is added. The CrossOver launcher sits beside the configured wine binary, so it is derived rather than configured.
- **Tests:** `PlatformEnvironmentTests` loses its Windows fixture. `ExportCommandTests`, `DeployCommandTests`, `DeployHostCommandTests`, and `LocalConfigLoaderTests` drop null wine paths. `UpdateCommandTests` asserts the launcher invocation and the manifest wait instead of a `steamcmd` argument list. New coverage for manifest discovery and ambiguity.
- **Docs:** `README.md`, `CLAUDE.md`, `.claude/skills/update-game-version/SKILL.md`, `config.toml` comments, `.gitignore`.
- **Dependencies:** one fewer. `steamcmd` is no longer required, so nothing needs to supply it.
- **Lost capability:** `steamcmd` can fetch a specific build id and Steam's client cannot. Nothing in the repository uses that today.
- **Unaffected:** the compendium build, the website, and the mods. No exported data changes.
