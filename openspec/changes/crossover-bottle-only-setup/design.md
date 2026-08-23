## Context

See proposal.md - Why.

Five facts shape the approach.

**`force_install_dir` builds a self-contained root, not a library entry.** The two layouts differ:

```
steamcmd +force_install_dir X      X/ancientkingdoms.exe
                                   X/steamapps/appmanifest_2241380.acf

Steam library                      <lib>/steamapps/common/<installdir>/ancientkingdoms.exe
                                   <lib>/steamapps/appmanifest_2241380.acf
```

The previous workstation shows the first shape on disk, with the executable and a `steamapps` directory as siblings, and its manifest recording build `24527611` while the bottle records `24771490`. Pointing that flag at the library install directory would nest a second manifest inside the first installation and leave Steam's record stale.

**The bottle holds five applications.** `appmanifest_2241380.acf` sits beside four others, including a second game this repository's sibling project works on. Matching the folder name `Ancient Kingdoms` works by luck. The manifest records `installdir` and `buildid`, and `scripts/update-server-scripts.sh` already parses it for the latter.

**Launching cannot be routed through Steam.** `WineEnvironment` sets `WINEDLLOVERRIDES=version=n,b` so MelonLoader loads. A `steam://rungameid` launch would start the game unmodded and the exporter would find no mod. The sibling project keeps both paths for this reason. So the update has to be its own step rather than a side effect of launching.

**CrossOver's launcher accepts protocol URLs and sits beside the configured wine binary.** The bottle registers the protocol, so `cxstart` resolves it to the client inside:

```
[Software\Classes\steam\Shell\Open\Command]
@="\"C:\\Program Files (x86)\\Steam\\steam.exe\" -- \"%1\""
```

`cxstart` lives in the same directory as `wine`, which `Local.props` already records, so no new configuration is needed.

**The update behaviour was measured, and two obvious approaches do not work.** Against the live bottle, holding build `24771490`:

| action | result |
|---|---|
| `steam://install/<id>`, client cold | `StateFlags` 4 → 6, 34 MB prefetched, then `Update delayed for 75389 secs` |
| the same, client left running 90 s | no download. `ScheduledAutoUpdate` set ~21 hours out |
| `steam://validate/<id>`, client running | `StateFlags` 6 → 1030 → 4, `buildid` 24771490 → 24878482, about 40 seconds |

`AutoUpdateWindowEnabled` is `0`, so the delay is not a configured window. It is the client's own stagger for an application last played weeks earlier. A user-initiated action overrides the stagger and a background one does not.

**`cxstart` does not return when it starts a cold client, and killing it kills the client.** The first measured run blocked for three minutes and the queued download died with the process. So the update cannot be a fire-and-forget invocation followed by a poll.

**The launch fork carries a `bool` through dependency injection.** `Program.cs` registers `OperatingSystem.IsMacOS()` as a bare `bool` service so `GameLauncher` can choose between two environments. The registration exists only to feed the fork.

## Goals / Non-Goals

**Goals**

- One installation, one downloader, one discovery rule.
- An update that proves what it did.
- Failures named at the point of detection.
- Removal that leaves no branch, parameter, or fixture behind.

**Non-Goals**

- Automating Steam's interface. The client owns its own interaction, and it may show a window.
- Fetching a specific build. Steam's client serves the current build only.
- A staleness gate on `export`. The manifest makes this easy afterwards, but version consistency is a separate subject and `scripts/update-server-scripts.sh` already guards the path where a stale install does damage.
- Changing how the game is launched once the paths are known.

## Decisions

**Steam updates the game, and the tooling asks it to.** Alternatives considered: keep `steamcmd` with `force_install_dir` pointed at the library install, which produces the nested manifest above; install `steamcmd` inside the bottle's Steam directory so the two share a library, which puts two clients on one installation and is unsupported; delete `update` entirely and rely on the operator opening Steam. The first is incorrect, the second is a hack, and the third discards a command that can be made correct. Driving the client keeps one installation by construction rather than by policy.

**The request is a validation, not an install.** Alternative: `steam://install/<id>`, which reads as the natural choice. Measured, it only detects the update and then defers the download by the client's stagger, so a command that waited for completion would wait about a day. `steam://validate/<id>` is user-initiated, overrides the stagger, and brought the live bottle current in about forty seconds including a full verify of 7.4 GB. The cost is that it verifies every file rather than only fetching the delta, which is the price of an action the client treats as immediate.

**The client is started first and kept alive, then asked.** A protocol URL alone does not sustain a download: the measured cold run died with the launcher that carried it. So the command starts the client, waits for it to be ready, issues the request, and holds the client until the manifest settles.

**The manifest is the proof, not the exit status.** A protocol URL returns as soon as the client accepts it, so the exit status says nothing about the download. `StateFlags` and `buildid` describe the installation itself. The observed transition is `6 → 1030 → 4`, where `1030` is the running update and `4` is the settled state, which also lets the command distinguish an installation that was already current from one it updated.

**The launcher path is derived, not configured.** `cxstart` is a sibling of the recorded wine binary. Adding a configuration key for a path that is always one directory entry away from a key we already require would be a second fact that can disagree with the first.

**Discovery reads the manifest rather than a directory name.** Alternative: keep the hardcoded name and add the application id as a second check. Rejected because two facts about one installation can disagree, and the manifest is the record Steam maintains. This also makes the C# agree with the shell script, which reads the same file.

**Ambiguity is an error, not a warning.** Alternative: warn and take the first match, as the sibling project does. Rejected because the caller cannot act on a warning it may not see, and a silently chosen bottle produces a build attributed to the wrong installation.

**Required configuration is enforced by the loader.** Alternative: an explicit platform check at startup. Rejected as redundant. Once the wine paths are required, a host that cannot supply them already fails at load with the missing key named. The runtime null guard in `WineEnvironment` is deleted rather than moved.

**Structural verification uses the managed assembly directory.** The mod build already depends on `MelonLoader/Il2CppAssemblies` under the game path, so a candidate without the managed tree cannot serve any command that needs it.

## Risks / Trade-offs

**Steam may present a window, so the update is not fully unattended.** → Accepted. The client has always been the real updater on both machines, and the manifest makes the outcome checkable even when the interaction is not.

**A validation verifies every file, so the update costs more input and output than the delta needs.** → Measured at about forty seconds for 7.4 GB against a local disk, against a download that would otherwise be deferred by roughly a day. The trade is accepted, and the alternative is recorded above so a later reader does not "optimise" it back to `install`.

**The client may present a window, so the update is not fully unattended.** → It is already logged in with a persistent token, so no credential prompt appears. The manifest makes the outcome checkable even when the interaction is not.

**Requiring wine paths breaks an existing `Local.props` that omits them.** → `setup` writes both today on macOS, and the loader failure names the missing key and the file. Re-running `setup` repairs it.

**Deleting the draft dedicated-server plan discards research.** → The plan is unimplemented and proposes a download outside the bottle. Git history retains it.

**The build-id capability is lost.** → Nothing in the repository passes a build id, and the workflow it would serve, reproducing an extraction against an older patch, is not one this project performs.

## Migration Plan

1. Land the removals and the discovery rewrite. Neither depends on the update work.
2. Reimplement `update` and measure it against the live bottle, which is currently one patch behind and therefore a real test case.
3. Run the next game version update through the new command and confirm `buildid` moves in the manifest.

Rollback is `git revert`. No external state changes, because the new command only asks Steam to do what the operator would otherwise do by hand.
