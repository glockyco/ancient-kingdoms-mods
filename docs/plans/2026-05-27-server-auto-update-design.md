---
title: "Ancient Kingdoms Server Auto-Update Design Research"
type: spec
status: active
created: 2026-05-27
parent:
superseded_by:
archived:
---

# Ancient Kingdoms Server Auto-Update Design Research

**Status:** Requires review.
**Date:** 2026-05-27
**Scope:** Detect Steam updates for the Ancient Kingdoms dedicated server, announce maintenance in-game, shut down safely, update via SteamCMD, and restart under service supervision.

## Context confirmed locally

Ancient Kingdoms ships a dedicated server build in the Steam install tree:

- `.steam-download/server/server.exe`
- `.steam-download/server/server_Data/Managed/Assembly-CSharp.dll`
- `.steam-download/server/server_Data/boot.config`

The local Steam manifest is `.steam-download/steamapps/appmanifest_2241380.acf`; at the time of inspection it reported `appid = 2241380`, `buildid = 23282946`, and `TargetBuildID = 23282946`. `boot.config` exposes server-oriented settings including `dedicatedServer-port=7777`, `dedicatedServer-queryport=20000`, and `dedicatedServer-querytype=SQP`.

Implication: server auto-update should be treated as process orchestration around a Steam-managed Unity dedicated server, plus a small in-server control surface for player announcements and graceful shutdown. The updater should not be only a mod inside the game process, because the updater must continue running after the server process exits.

## Recommended architecture

Use two cooperating pieces:

1. **External supervisor/updater**
   - Owns process lifecycle, update polling, SteamCMD execution, restart, health checks, logs, lock files, and failure handling.
   - Runs outside `server.exe` so it survives shutdown and failed game updates.
   - On Linux/Wine: model `server.exe` as a `systemd` service and the updater as a separate `oneshot` service/timer.
   - On Windows: run `server.exe` under a real Windows Service wrapper such as WinSW; use Task Scheduler or a service-owned scheduled task only to trigger the updater, not to supervise the long-lived server.

2. **Server-side control mod/plugin**
   - Receives local authenticated commands from the updater: enter maintenance mode, broadcast countdown, reject new joins, save/checkpoint if supported, and shut down.
   - Should use the server's existing networking/chat/RPC paths, not OS-level console scraping, wherever possible.
   - Should be small and conservative: no update downloads, no Steam credentials, no broad admin API exposed to the network.

Clean separation matters: the mod handles in-world semantics; the supervisor handles files and process state.

## Update detection

Preferred detection model:

1. Read the local build from `steamapps/appmanifest_2241380.acf` (`buildid` / `TargetBuildID`).
2. Compare it with remote Steam app/branch build metadata for the exact app ID and branch being run.
3. If remote detection is unavailable or unreliable, fall back to a scheduled SteamCMD check/update during a maintenance window and let `app_update` decide whether files are current.

Do not rely on `steamcmd app_status` as the sole detector. A Steam Community server-operator thread reports that `app_status` can report only that an app is fully installed, not that a remote update is available; operators instead compare remote build IDs from `app_info_print`, Web API checks, or Steam appcache data against the local app manifest.

Steam Web API caveat: `ISteamApps/UpToDateCheck` is public and takes `appid` plus installed `version`, but other build/branch APIs such as `GetAppBuilds`, `GetAppBetas`, and `GetAppDepotVersions` require a publisher key and must only be called from a secure server. For Ancient Kingdoms, we likely do not have publisher-key access, so a practical implementation should either parse public SteamCMD/appinfo data or use SteamCMD itself as the final authority.

Polling cadence: mature game-server tooling such as LinuxGSM recommends checking for Steam updates about once per hour, not tight polling.

## Update application flow

Recommended transaction:

1. Acquire a single-instance updater lock.
2. Detect update for the configured app ID and branch.
3. If update exists, tell the server mod to enter maintenance mode.
4. Announce a countdown to connected players.
5. Reject new joins while maintenance is pending.
6. At the deadline, request a save/checkpoint if the game exposes one.
7. Ask the game to shut down gracefully.
8. Supervisor waits a bounded grace period, then escalates only if the process does not exit.
9. Back up mutable state and config before mutating files.
10. Run SteamCMD with the configured install directory and app ID.
11. Reapply or verify server mods/plugins that Steam may have overwritten.
12. Restart `server.exe` through the supervisor.
13. Verify health: process alive, expected port/query response, logs free of startup errors, and optionally build/version matches target.
14. If health check fails, keep the server closed, alert the operator, and avoid restart loops. If a rollback mechanism exists, roll back to the last known-good install plus matching mods.

SteamCMD basics from Valve/LinuxGSM practice:

- Use SteamCMD as the file updater source of truth for Steam-distributed dedicated servers.
- Set `force_install_dir` before `app_update`.
- Use the exact app ID and branch/beta that the server runs.
- Use `validate` sparingly: it repairs missing/corrupt files, but Valve documents that validation overwrites changed files, which can break customized servers. Keep mods/config outside Steam-owned paths where possible, or reapply them after every update.

## Player-facing shutdown behavior

Recommended player UX:

- External notice if there is a planned maintenance window.
- In-game broadcasts once an update is detected and before shutdown.
- Reasonable default cadence for small self-hosted servers: `30m`, `15m`, `10m`, `5m`, `1m`, `30s`, `10s`, then shutdown.
- If updates should apply quickly, make the long warnings configurable, e.g. `maxCountdown=10m` for urgent compatibility updates.
- Every message should say what will happen: update detected, new joins disabled, server shuts down at countdown zero, reconnect after restart.

Use a maintenance lock/drain phase:

- Stop admitting new players before the final countdown.
- For Mirror-based servers, admission control belongs around authentication/connect approval. Mirror documentation notes that failed authentication should explicitly disconnect, and if a failure message is sent first the server should delay disconnect at least one frame so the message can be delivered.
- Connected players should receive staged countdowns and then a clean disconnect/kick at the deadline.

The Colyseus graceful-shutdown model is a good general reference even though Ancient Kingdoms is Unity/Mirror: call pre-shutdown hooks, exclude the process from matchmaking/new room creation, lock rooms, notify users, wait for rooms/clients to drain, close transports/drivers, then kill the process.

## Supervisor and shutdown semantics

Linux/Wine/systemd:

- Use a `.service` unit for the long-running game server. `systemd.service` recommends `Type=exec` for long-running services because start failures such as missing executables/users are tracked better than with `Type=simple`.
- Use `Restart=on-failure` for crash recovery, with sane `RestartSec` and start-rate limiting.
- Use a separate `.timer` + `oneshot` updater service so update logic does not live inside the long-running service unit.
- Configure `TimeoutStopSec` long enough for the game to save and shut down. systemd uses it both for `ExecStop=` command timeouts and the final wait before forceful termination.
- Avoid `KillMode=process` or `KillMode=none`; systemd warns these let child processes escape service lifecycle/resource management.

Windows:

- Prefer Windows Service Control Manager semantics via a wrapper. Microsoft describes SCM as maintaining installed services, starting services, maintaining running status, and transmitting control requests.
- WinSW is a strong fit: it wraps an arbitrary executable, supports XML config, logs, start/stop arguments, pre/post start/stop hooks, and configurable `stoptimeout`.
- WinSW attempts a graceful console Ctrl+C / window close before termination, defaulting to 15 seconds unless `stoptimeout` is configured. If a dedicated server control command exists, `stoparguments` / `stopexecutable` can invoke it instead.
- Task Scheduler is fine for triggering the updater on a schedule, but not as the primary supervisor for a long-lived game server.

## Pitfalls to design around

### Steam/update pitfalls

- **Wrong branch/app ID:** compare and update the exact app ID and branch being served.
- **`app_status` false confidence:** it can report fully installed without proving no remote update exists.
- **Credentials and Steam Guard:** unattended updates need a noninteractive credential strategy. Avoid embedding personal Steam credentials in a game mod. Prefer anonymous login if the app permits it; if not, store secrets only in the supervisor environment/OS secret store.
- **`validate` overwriting customizations:** keep mods/configs outside Steam-owned files where possible; otherwise reapply and verify after update.
- **Updating live files:** stop the server before SteamCMD mutates files, especially on Windows where locked files can cause incomplete updates.
- **Partial downloads / Steam outage:** update transaction must leave the previous server state understandable and alert on failure.

### Game-state pitfalls

- **Forced process death can corrupt or lose state:** always attempt in-game save/checkpoint and graceful shutdown first.
- **New joins during countdown:** reject new sessions once maintenance starts.
- **Final message not delivered:** if sending a rejection/shutdown reason over Mirror, delay disconnect enough for the message to flush.
- **Restart loop after bad update:** health check before reopening; stop retrying after bounded failures.
- **Mod/API compatibility after updates:** because this is a Mono Unity server assembly, server mods may break when `Assembly-CSharp.dll` changes. The updater should detect missing plugin load / patch failures and keep the server closed rather than silently running unmodded if the maintenance control mod is required.

### Operational pitfalls

- **Updater inside the server process:** once the process exits, it cannot update/restart itself reliably.
- **No single-instance lock:** overlapping scheduled runs can race and corrupt install state.
- **No observability:** log every state transition: detected build, countdown started, joins locked, stop requested, process exited, SteamCMD result, target build, startup health, reopened/failed.
- **No rollback story:** at minimum back up configs, save/database files, and plugin files before update. A full install rollback is better but may be expensive.
- **Planned stop treated as crash:** configure supervisor failure/restart logic so intentional maintenance stops do not fight the updater.

## Implementation implications for this repo

If we build this later, it should likely be a new small subsystem rather than bolting behavior onto the current client-side MelonLoader mods:

- `server.exe` is a Mono Unity server, not the IL2CPP client target used by the current mods.
- Server-side patching should be a separate server plugin/mod project referencing `.steam-download/server/server_Data/Managed/Assembly-CSharp.dll` and Mirror/Unity managed assemblies.
- The external updater can be written as a boring CLI/service wrapper script or .NET tool. It should own SteamCMD calls, file backups, lock files, and service control.
- The server plugin should expose only local authenticated control: announce, maintenance lock, graceful stop. Do not expose Steam credentials or arbitrary shell execution to the game network.
- Health checks can start with process + port checks using `dedicatedServer-port=7777` / `dedicatedServer-queryport=20000`, then grow into a stronger game-aware check if needed.

## Sources

- Steamworks `ISteamApps` Web API: `UpToDateCheck`, publisher-key requirements for build/beta/depot APIs, and `GetServersAtAddress`: https://partner.steamgames.com/doc/webapi/ISteamApps
- Valve Developer Community SteamCMD documentation: command-line Steam server install/update flow, `force_install_dir`, `app_update`, beta branch flags, and `validate` overwrite caveat: https://developer.valvesoftware.com/wiki/SteamCMD
- LinuxGSM `update`: checks for updates, applies updates, restarts if already running, and recommends hourly scheduled checks: https://docs.linuxgsm.com/commands/update
- LinuxGSM `check-update`: check-only command that sends alerts without applying updates: https://docs.linuxgsm.com/commands/check-update
- Steam Community server-operator report on `app_status` unreliability and app manifest build IDs: https://steamcommunity.com/discussions/forum/14/541906348058122152/
- systemd service unit documentation: service supervision, `Type=exec`, `Restart=`, `RestartSec`, `TimeoutStopSec`, `ExecStop`: https://man7.org/linux/man-pages/man5/systemd.service.5.html
- systemd kill procedure documentation: `KillMode`, SIGTERM/SIGKILL escalation, and warnings about `process` / `none`: https://man7.org/linux/man-pages/man5/systemd.kill.5.html
- Microsoft Windows Service Control Manager overview: https://learn.microsoft.com/en-us/windows/win32/services/service-control-manager
- WinSW XML configuration: wrapping executables, stop hooks, `stoptimeout`, preshutdown, logging, and environment configuration: https://github.com/winsw/winsw/blob/v3/docs/xml-config-file.md
- Colyseus graceful shutdown process: pre-shutdown hook, exclude from matchmaking, lock rooms, notify users, wait for disposal, close transport: https://docs.colyseus.io/server/graceful-shutdown
- Mirror Network Authenticators: pre-connect authentication, rejection/disconnect behavior, and delaying disconnect after sending a failure message: https://mirror-networking.gitbook.io/docs/manual/components/network-authenticators
- Unturned server auto-restart/update warnings: configurable scheduled/update shutdown warnings and updater restart loop examples: https://docs.smartlydressedgames.com/en/latest/servers/server-auto-restart.html
