# BossMod Plan 5 — E2E Hardening, Tuning, Documentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use skill://superpowers:subagent-driven-development (recommended) or skill://superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Validate BossMod against the live game, harden any reliability gaps found at runtime, tune default threat thresholds from observed elites/bosses, verify renderer/audio lifecycle behavior under realistic UI load, and finish maintainer docs plus stale-plan cleanup.

**Architecture:** This plan does not add a new horizontal subsystem. It verifies and tightens the completed vertical path: `BossMod.cs` owns lifecycle and ordering; `MonsterWatcher`/`PlayerContextBuilder` are the only IL2CPP readers; `BossMod.Core` remains pure C# policy/persistence logic; UI renders over `UiFrame`/`PlayerBuffView`/`UiMode`/`WindowChrome`; `AlertEngine` emits post-policy `AlertEvent`s; audio is owned by one disposable `SoundPlayer` hidden `GameObject`.

**Tech Stack:** C# net6.0, MelonLoader, IL2CPP Unity 6000.3.x, ImGui.NET 1.89.1, xunit.

**Spec:** `docs/superpowers/specs/2026-04-29-bossmod-design.md`

**Depends on:** Plans 1–4 committed. Plan 5 is intentionally the only plan that relies heavily on manual in-game verification because IL2CPP scene state, Unity audio object lifetime, renderer allocation behavior, live monster SyncVars, and real encounter timings cannot be proven by host-side tests alone.

**Out of scope:** New gameplay features, static exported-data runtime dependency, encounter timeline UI, party broadcast alerts, threat/aggro HUD, or broad renderer rewrites unless live observation shows v1-breaking allocation spikes.

**Clean-cutover boundary:** Keep the refreshed design as the only representation. If verification reveals stale Plan 3/4 names, old `Muted` semantics, UI-side IL2CPP probing, duplicate lifecycle owners, or compatibility shims, remove them in the same task that fixes the runtime issue. Do not leave forwarding comments, aliases, or old docs behind.

---

## File Structure

| Path | Responsibility | Status |
|---|---|---|
| `mods/BossMod.Core/Catalog/Thresholds.cs` | Default threat thresholds tuned from live observations | Modify if tuning changes defaults |
| `tests/BossMod.Core.Tests/ThreatClassifierTests.cs` | Host assertions aligned to tuned defaults | Modify if tuning changes defaults |
| `mods/BossMod/BossMod.cs` | Conductor lifecycle/dirty/alert behavior fixes discovered by E2E | Modify only if verification exposes a defect |
| `mods/BossMod/Tracking/MonsterWatcher.cs` | Catalog discovery/activation fixes discovered by E2E | Modify only if verification exposes a defect |
| `mods/BossMod/Tracking/PlayerContextBuilder.cs` | Target/player buff/source fixes discovered by E2E | Modify only if verification exposes a defect |
| `mods/BossMod/Tracking/UiFrameBuilder.cs` | Pure frame assembly fixes discovered by E2E | Modify only if verification exposes a defect |
| `mods/BossMod/Audio/SoundPlayer.cs` | Hidden audio object lifecycle fixes discovered by E2E | Modify only if verification exposes a defect |
| `mods/BossMod/Ui/AlertOverlay.cs` | Coalescing/rendering fixes discovered by E2E | Modify only if verification exposes a defect |
| `mods/BossMod/Ui/*.cs`, `mods/BossMod/Ui/Tabs/*.cs` | Settings/UI allocation or changed-return fixes discovered by E2E | Modify only if verification exposes a defect |
| `mods/BossMod/CLAUDE.md` | Mod-specific maintainer rules and verification notes | Create or update |
| `docs/superpowers/plans/2026-04-29-bossmod-{3,4,5}-*.md` | Current refreshed implementation plans; verify no obsolete Plan 3/4 files remain | Reference |

---

## Consistency Boundaries and Commit Rules

- [ ] Each task below ends at a checkpoint pause. Commit only after the listed build/test/manual evidence for that task is collected.
- [ ] Every committed code task must build. Do not commit intentionally broken instrumentation or a partially applied threshold change.
- [ ] Temporary logs/instrumentation are allowed during manual verification only when they are removed before commit. Before every commit, search for and remove temporary markers such as `PLAN5`, `TEMP`, `DEBUG`, `MelonLogger.Msg("[BossMod E2E`, and one-off counter dumps.
- [ ] Manual findings must be written into the commit message body or PR notes with the scene, character/location, observed monster names, and expected/actual outcome.
- [ ] Host tests remain authoritative for pure logic. Manual verification is authoritative only for runtime boundaries: IL2CPP access, Unity audio/render lifecycle, real SyncVar discovery, and observed encounter timings.

Common commands used by multiple tasks:

```bash
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj
dotnet run --project build-tool build
dotnet run --project build-tool all
```

Expected command outcomes:

- `dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj` exits 0 and all `BossMod.Core.Tests` tests pass.
- `dotnet run --project build-tool build` exits 0 and produces the repacked BossMod artifact without treating native `cimgui` runtime assets as managed mods.
- `dotnet run --project build-tool all` exits 0 and builds/deploys the current mods to the configured Ancient Kingdoms/MelonLoader mods location.

---

## Task 1: Main-menu runtime verification

**Files:**

- Reference: `mods/BossMod/BossMod.cs`
- Reference: `mods/BossMod/Imgui/ImGuiRenderer.cs`
- Reference: `mods/BossMod/Audio/SoundPlayer.cs`
- Reference: `mods/BossMod/Ui/SettingsWindow.cs`
- Reference: `mods/BossMod/Ui/Tabs/SoundsTab.cs`
- Modify only if a defect is observed.

- [ ] **Step 1: Build and deploy the current mod**

Run:

```bash
dotnet run --project build-tool build
dotnet run --project build-tool all
```

Expected:

- Build and deploy commands exit 0.
- Deployed BossMod starts without MelonLoader assembly-load errors.
- Logs do not show `cimgui` managed-load attempts from copied NuGet runtime directories.

- [ ] **Step 2: Verify main-menu renderer initialization**

Manual checklist at the game main menu:

- [ ] BossMod logs a truthful state-load status: loaded, missing/defaults, corrupt/defaults, or unsupported/defaults.
- [ ] ImGui renderer initializes once.
- [ ] No `NullReferenceException`, `EntryPointNotFoundException`, `DllNotFoundException`, or repeated font-atlas rebuild spam appears while idling for 30 seconds.
- [ ] The Settings window can render over the main menu without entering `World`.
- [ ] UI text is legible and not replaced by blank boxes for ASCII labels.

If this fails:

- Fix the lifecycle owner that is lying. Renderer fixes belong in `mods/BossMod/Imgui/*`; conductor ordering fixes belong in `mods/BossMod/BossMod.cs`.
- Keep Unity types bare `UnityEngine.*` and Assembly-CSharp game types under `Il2Cpp.*`.
- Re-run build/deploy and repeat the checklist before moving on.

- [ ] **Step 3: Verify F8 Settings behavior from the main menu**

Manual checklist:

- [ ] Pressing F8 once opens Settings.
- [ ] Pressing F8 again closes Settings.
- [ ] Holding F8 does not toggle every frame; the hotkey is edge-detected.
- [ ] F8 does not fire while ImGui wants text input during a text-field edit.
- [ ] General tab truthfully shows Config Mode as unavailable outside `World`.

Expected implementation state if code must be changed:

- Hotkeys use `UnityEngine.InputSystem.Keyboard.current`.
- The conductor passes renderer text-input state to hotkey polling.
- No UI code probes `Il2Cpp.Player.localPlayer`, `NetworkManagerMMO`, `Monster`, or scene game singletons.

- [ ] **Step 4: Verify sound preview from Settings**

Manual checklist in Settings → Sounds:

- [ ] Built-in sounds appear with stable names: `low`, `medium`, `high`, `critical`, `chime`, `klaxon`.
- [ ] Previewing each built-in plays one short 2D UI sound at the current master volume.
- [ ] Master mute suppresses preview audio without disabling visual Settings interactions.
- [ ] Missing or invalid user WAV entries show a concise load status and do not crash preview.
- [ ] Re-scanning the Sounds folder is deterministic: built-ins remain present and invalid files remain reported with reasons.

If this fails:

- Sound registry fixes belong in `mods/BossMod/Audio/SoundBank.cs`.
- Playback/lifecycle fixes belong in `mods/BossMod/Audio/SoundPlayer.cs`.
- WAV parsing/rate-limit defects belong in `mods/BossMod.Core.Audio` with host tests.

- [ ] **Step 5: Verify no duplicate audio object across reload/deinit**

Manual checklist:

- [ ] Start at main menu, preview one sound, then return to desktop normally.
- [ ] Restart the game, preview one sound, then use the MelonLoader reload/deinit path available in the local harness if present.
- [ ] Across restart/reload/deinit, there is never more than one hidden `BossMod_Audio` `GameObject` alive.
- [ ] `SoundPlayer.Dispose()` destroys the hidden `GameObject` and Unity resources it owns.
- [ ] No sound continues playing after BossMod deinitializes.

Observation method:

- Prefer Unity-side object lookup logging only during the check. If temporary object-count logging is added, remove it before commit.
- Acceptable temporary log text during investigation: include the count and lifecycle phase. Remove the logging before the task is committed.

- [ ] **Step 6: Verify after any fixes**

Run:

```bash
dotnet run --project build-tool build
dotnet run --project build-tool all
```

If any pure Core audio helper changed, also run:

```bash
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj
```

Expected:

- Commands exit 0.
- Main-menu manual checklist is fully passing.
- Temporary logs/instrumentation are removed before commit.

**Checkpoint:** Commit main-menu hardening fixes and manual verification notes, or record that no code changes were required.

---

## Task 2: World-scene discovery, activation, alerts, multi-boss, and BuffTracker verification

**Files:**

- Reference: `mods/BossMod/BossMod.cs`
- Reference: `mods/BossMod/Tracking/MonsterWatcher.cs`
- Reference: `mods/BossMod/Tracking/Activation.cs`
- Reference: `mods/BossMod/Tracking/PlayerContextBuilder.cs`
- Reference: `mods/BossMod/Tracking/UiFrameBuilder.cs`
- Reference: `mods/BossMod.Core/Alerts/AlertEngine.cs`
- Reference: `mods/BossMod/Ui/CastBarWindow.cs`
- Reference: `mods/BossMod/Ui/CooldownWindow.cs`
- Reference: `mods/BossMod/Ui/BuffTrackerWindow.cs`
- Reference: `mods/BossMod/Ui/AlertOverlay.cs`
- Modify only if a defect is observed.

- [ ] **Step 1: Build, deploy, and enter `World`**

Run:

```bash
dotnet run --project build-tool build
dotnet run --project build-tool all
```

Manual setup:

- [ ] Launch the game with the deployed BossMod.
- [ ] Enter a character into the `World` scene.
- [ ] Keep Settings closed for the first discovery pass.
- [ ] Locate at least three live elite/boss monsters, including one nearby proximate monster and one far visible monster if the game area allows it.

Expected:

- No `World` entry exception.
- No Settings interaction is needed for catalog discovery.

- [ ] **Step 2: Verify catalog discovery persists without opening Settings**

Manual checklist:

- [ ] Approach or observe an elite/boss with Settings closed.
- [ ] Let `MonsterWatcher` tick for at least 10 seconds while the monster is alive.
- [ ] Exit to menu or desktop normally so `StateFlusher.Dispose()` can hard-flush pending state.
- [ ] Inspect `UserData/BossMod/state.json` outside the game.
- [ ] Confirm the observed boss record, skill records, and boss-skill effective snapshots are present.
- [ ] Confirm persisted changes are not only timestamp churn; repeated idle ticks do not rewrite state every frame.

Expected implementation state if code must be changed:

- `MonsterWatcher.Tick()` returns `catalogChanged` only for persisted state changes.
- Discovery is not gated on activation.
- The conductor calls `_flusher.MarkDirty()` only when `catalogChanged`, Settings mutation, import, or reset returns changed.

Verification after fixes:

```bash
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj
dotnet run --project build-tool build
dotnet run --project build-tool all
```

- [ ] **Step 3: Verify activation branches**

Manual checklist using at least two encounter situations:

- [ ] Proximate branch: an alive boss/elite within `Globals.ProximityRadius` becomes active, renders in relevant windows, and is alert-eligible.
- [ ] Far inactive branch: an alive boss/elite outside proximity, not targeted, and not engaged is discovered but does not render as active and does not alert.
- [ ] Target branch: targeting a boss/elite activates it even before combat if the game exposes target identity.
- [ ] Engagement branch: a boss/elite outside proximity activates if its aggro list contains the local player, local pet/mercenary, party member, or party member pet/mercenary.
- [ ] Dead branch: a dead boss/elite does not remain active.
- [ ] Scene branch: leaving `World` clears current snapshots and resets/prunes alert dedupe state.

Expected implementation state if code must be changed:

- Activation uses 2D X/Y distance.
- Empty party is handled as `party.members == null` without throwing.
- Entity comparison uses `netId`, not IL2CPP wrapper reference equality.
- Active status affects overlays and alert eligibility only, not catalog discovery.

- [ ] **Step 4: Verify `AlertEngine` inactive gating and alert-policy ownership**

Manual checklist:

- [ ] A far inactive boss casting or finishing cooldown produces no sound and no overlay text.
- [ ] The same boss becomes alert-eligible after proximity, target, or engagement activation.
- [ ] FireOn policy is respected: a skill configured for `CooldownReady` does not alert on `CastStart`, and a skill configured for `CastStart` does not alert on `CooldownReady`.
- [ ] `AudioMuted = true` suppresses sound but does not suppress non-empty alert text.
- [ ] Empty alert text suppresses overlay text without implying inheritance.
- [ ] Master mute suppresses sound globally and only suppresses alert text if `AlertTextMuteOnMasterMute` is true.

If this fails:

- Fix policy in `mods/BossMod.Core/Alerts/AlertEngine.cs` and add/adjust host tests in `tests/BossMod.Core.Tests/AlertEngineTests.cs`.
- Keep `AlertSubscriber` thin: it may dispatch audio/text and global text suppression, but it must not re-resolve inheritance or decide FireOn eligibility.

Verification after AlertEngine fixes:

```bash
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj
dotnet run --project build-tool build
dotnet run --project build-tool all
```

- [ ] **Step 5: Verify multi-boss and coalescing behavior**

Manual checklist with two or more active bosses/elites:

- [ ] Cast bars stack across bosses.
- [ ] Cast bars sort by effective threat descending, then remaining cast time ascending.
- [ ] Cast bars cap at `Globals.MaxCastBars` and show a `+N more casting` overflow when exceeded.
- [ ] Cooldown and Buff windows group rows by boss in collapsible sections.
- [ ] Targeted boss sorts first in windows where the spec requires it.
- [ ] Simultaneous same-skill overlay alerts coalesce across bosses as `Skill Display Name (xN)` using ASCII-safe text such as `Inferno Blast (x3)`.
- [ ] Coalescing key is `SkillId` for v1, not `BossId`.

If this fails:

- UI grouping/sorting fixes belong in the relevant `mods/BossMod/Ui/*Window.cs` file.
- Overlay coalescing fixes belong in `mods/BossMod/Ui/AlertOverlay.cs`.
- Do not move game-state probing into UI windows to make sorting easier; fix `UiFrame` contents instead.

- [ ] **Step 6: Verify BuffTracker `On You` behavior**

Manual checklist:

- [ ] `On You` appears as the top pseudo-section.
- [ ] `On You` includes boss-known buffs/debuffs on the local player when the source/active information supports the claim.
- [ ] `On You` does not claim an unrelated player buff is boss-related merely because the skill id matches a known boss skill.
- [ ] Boss sections still show boss-owned buffs/debuffs/auras from `BossState.Buffs`.
- [ ] Aura, debuff, and buff color categories are visually distinct.

If this fails:

- Source/active attribution fixes belong in `PlayerContextBuilder` or `UiFrameBuilder`.
- Display fixes belong in `BuffTrackerWindow`.
- Preserve the boundary that UI consumes `PlayerBuffView`; UI must not read IL2CPP player buff state directly.

- [ ] **Step 7: Verify after any fixes**

Run:

```bash
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj
dotnet run --project build-tool build
dotnet run --project build-tool all
```

Expected:

- Commands exit 0.
- World-scene manual checklist is fully passing.
- Temporary logs/instrumentation are removed before commit.

**Checkpoint:** Commit world-scene hardening fixes and manual verification notes, or record that no code changes were required.

---

## Task 3: Threshold tuning from observed elites/bosses

**Files:**

- Modify: `mods/BossMod.Core/Catalog/Thresholds.cs`
- Modify: `tests/BossMod.Core.Tests/ThreatClassifierTests.cs`
- Reference: `mods/BossMod.Core/Effects/ThreatClassifier.cs`
- Reference: `UserData/BossMod/state.json` produced by live discovery

- [ ] **Step 1: Collect observed encounter data**

Manual checklist:

- [ ] Observe at least six live elite/boss skill sets across at least three distinct monster names.
- [ ] Include at least one low-impact skill, one medium-impact skill, one high-impact skill, and one obviously dangerous skill if available.
- [ ] For each observed skill, record boss name, boss level, skill display name, damage/effective damage, cast time, cooldown, aura or debuff information, and current auto threat.
- [ ] Prefer values from persisted `state.json` effective snapshots over visual estimates.

Minimum observation table to include in commit/PR notes:

| Boss | Level | Skill | Damage/effective value | Cast time | Cooldown | Buff/debuff/aura evidence | Current tier | Desired tier | Reason |
|---|---:|---|---:|---:|---:|---|---|---|---|

Do not commit sample values in the observation notes. Fill every table row with real encounter data, or put the real observations in the PR body instead of this table.

- [ ] **Step 2: Choose tuned defaults**

Update `mods/BossMod.Core/Catalog/Thresholds.cs` only after observations justify the change.

Rules:

- Keep thresholds simple and explainable.
- Do not tune around one outlier if it makes common boss skills misleading.
- Defaults should make obviously lethal/long-cast/high-DPS aura skills land in `High` or `Critical` without marking ordinary filler abilities as `Critical`.
- Preserve user override semantics: defaults are a starting point and Settings can override threat per skill or boss-skill.

Initial spec values that must be revisited:

```text
CriticalDamage = 200
HighDamage = 80
AuraDpsHigh = 30
CriticalCastTime = 3.0
```

- [ ] **Step 3: Update tests to lock the tuned defaults**

In `tests/BossMod.Core.Tests/ThreatClassifierTests.cs`:

- [ ] Assert default `Thresholds` property values match the tuned numbers.
- [ ] Assert representative observed low/medium/high/critical examples classify as intended.
- [ ] Assert boundary values immediately below/at thresholds behave intentionally.
- [ ] Keep tests pure; do not load Unity, IL2CPP, or live `state.json` from unit tests.

- [ ] **Step 4: Verify threshold tuning**

Run:

```bash
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj
dotnet run --project build-tool build
dotnet run --project build-tool all
```

Manual checklist after deploy:

- [ ] Revisit at least two previously observed bosses.
- [ ] Confirm Settings and overlays display tuned auto-threat tiers that match the desired tiers from the observation notes.
- [ ] Confirm user threat overrides still win over auto-threat.
- [ ] Confirm reset/default behavior uses the tuned threshold defaults.

Expected:

- Tests and build exit 0.
- Tuned defaults are documented in commit/PR notes with real observation evidence.
- Temporary observation logs/instrumentation are removed before commit.

**Checkpoint:** Commit threshold defaults, tests, and observation evidence.

---

## Task 4: Renderer/UI allocation and performance observation with populated Settings tables

**Files:**

- Reference: `mods/BossMod/Imgui/ImGuiRenderer.Render.cs`
- Reference: `mods/BossMod/Ui/SettingsWindow.cs`
- Reference: `mods/BossMod/Ui/GroupableTable.cs`
- Reference: `mods/BossMod/Ui/Tabs/SkillsTab.cs`
- Reference: `mods/BossMod/Ui/Tabs/BossesTab.cs`
- Reference: `mods/BossMod/Ui/Tabs/SoundsTab.cs`
- Reference: `mods/BossMod/Ui/Tabs/GeneralTab.cs`
- Reference: `mods/BossMod/Ui/Tabs/ExportImportTab.cs`
- Modify only if live observation shows unacceptable allocation spikes, broken changed-return semantics, or UI unusability.

- [ ] **Step 1: Populate Settings tables**

Manual setup:

- [ ] Use the discovered `state.json` from Task 2/3 with multiple bosses and skills.
- [ ] Add at least three valid user WAV files and at least two invalid WAV files under `UserData/BossMod/Sounds/`.
- [ ] Open Settings and visit Skills, Bosses, Sounds, General, and Export/Import tabs.

Expected:

- Tables render without exceptions.
- Invalid sound files show concise statuses.
- Filtering/grouping controls remain responsive.
- Settings edits return `changed` only when persisted state actually changes.

- [ ] **Step 2: Observe allocations and frame behavior**

Manual checklist:

- [ ] Idle in the main menu with Settings closed for 30 seconds.
- [ ] Idle in the main menu with populated Settings open for 30 seconds.
- [ ] Idle in `World` with populated Settings open and active overlays for 30 seconds.
- [ ] Scroll large Skills and Bosses tables.
- [ ] Change a setting once and confirm the state file is eventually flushed once after debounce, not rewritten every frame.
- [ ] Confirm renderer does not allocate in an unbounded pattern as rows are scrolled repeatedly.

Observation methods:

- Prefer existing MelonLoader/Unity profiler output if available.
- If temporary GC counters or allocation logs are added, log at coarse intervals only and remove the code before commit.
- Accept the spec's v1 tradeoff that the current render path allocates managed arrays and `MaterialPropertyBlock`s per frame/draw command unless live Settings-scale use shows visible stutter or GC spikes.

- [ ] **Step 3: Apply only earned performance fixes**

If observation shows v1-breaking spikes or unusable Settings behavior:

- [ ] First fix truthful changed-return/dirty tracking if repeated persistence is the source of the spike.
- [ ] Then reduce avoidable per-row allocations in Settings tabs or `GroupableTable`.
- [ ] Only pool renderer `MaterialPropertyBlock`s or grow/reuse vertex/index buffers if UI-side fixes do not address the observed issue.
- [ ] Keep `ImGuiRenderer` backend-only; do not let it know about catalog, settings, BossState, audio, or persistence.

If no v1-breaking issue is observed:

- [ ] Do not refactor renderer internals speculatively.
- [ ] Record the observed acceptable behavior in commit/PR notes.

- [ ] **Step 4: Verify after any fixes**

Run:

```bash
dotnet run --project build-tool build
dotnet run --project build-tool all
```

If any pure Core dirty/persistence helper changed, also run:

```bash
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj
```

Manual expected outcomes:

- Populated Settings tables remain usable.
- No repeated state flush occurs without real changes.
- Temporary logs/instrumentation are removed before commit.

**Checkpoint:** Commit earned renderer/UI hardening fixes and performance observations, or record that no code changes were required.

---

## Task 5: Final `mods/BossMod/CLAUDE.md` maintainer guide

**Files:**

- Create or update: `mods/BossMod/CLAUDE.md`
- Reference: `docs/superpowers/specs/2026-04-29-bossmod-design.md`
- Reference: current implementation after Plans 1–5

- [ ] **Step 1: Write the maintainer guide**

`mods/BossMod/CLAUDE.md` must include:

- [ ] Project boundary: `mods/BossMod.Core` is pure C#; `mods/BossMod` owns IL2CPP, Unity audio, ImGui, renderer, and MelonMod lifecycle.
- [ ] Type namespace rule: bare `UnityEngine.*` for Unity types; `Il2Cpp.*` for Assembly-CSharp game types.
- [ ] User data rule: use `MelonEnvironment.UserDataDirectory` and persist only under `UserData/BossMod/`.
- [ ] UI boundary: UI windows render only over `UiFrame`, `PlayerBuffView`, `UiMode`, `WindowChrome`, catalog/globals, and Settings mutators; UI windows must not probe IL2CPP game state.
- [ ] Alert boundary: `AlertEngine` owns FireOn filtering, inactive gating, dedupe, settings resolution, and emits post-policy `AlertEvent`s.
- [ ] Audio semantics: `AudioMuted` suppresses sound only; empty alert text suppresses overlay text; master mute and alert-text suppression are global settings.
- [ ] Dirty tracking rule: `SettingsWindow.Render()`/tabs/mutators return changed only for persisted changes; `MonsterWatcher.Tick()` reports catalog changes only for persisted discovery changes; conductor marks dirty only for real changed values.
- [ ] Lifecycle rule: one hidden `BossMod_Audio` object, renderer/audio/flusher disposed during deinit, alert dedupe reset/pruned on World exit.
- [ ] Verification commands for future maintainers:

```bash
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj
dotnet run --project build-tool build
dotnet run --project build-tool all
```

- [ ] Manual smoke checklist: main-menu Settings/F8/sound preview, World discovery without Settings, activation branch, inactive gating, multi-boss coalescing, BuffTracker `On You`, Config Mode World-only, state persistence/restart.
- [ ] Instruction to remove temporary logs/instrumentation before commit.

- [ ] **Step 2: Verify guide is accurate against implementation**

Checklist:

- [ ] Every named file/path in `mods/BossMod/CLAUDE.md` exists or is an intentional documented project boundary.
- [ ] Guide does not describe old Plan 3/4 concepts as current.
- [ ] Guide does not mention `Muted` as a per-skill setting; it uses `AudioMuted`.
- [ ] Guide does not allow UI windows to read `Il2Cpp.*` game state directly.
- [ ] Guide does not recommend compatibility aliases, forwarding addresses, or stale wrappers.

**Checkpoint:** Commit `mods/BossMod/CLAUDE.md` after accuracy review.

---

## Task 6: Stale plan/doc cleanup and final release-candidate verification

**Files:**

- Reference: `docs/superpowers/specs/2026-04-29-bossmod-design.md`
- Reference: `docs/superpowers/plans/2026-04-29-bossmod-1-foundation-renderer.md`
- Reference: `docs/superpowers/plans/2026-04-29-bossmod-2-catalog-tracking-alerts.md`
- Reference: refreshed Plan 3/4/5 files
- Remove only after main-agent review identifies stale old-plan files.

- [ ] **Step 1: Confirm cleanup scope with the main agent's review result**

Rules:

- The plan author does not guess which old files to remove.
- Remove stale old Plan 3/4 concept files only after the main agent has reviewed the refreshed Plan 3/4/5 set and named the obsolete files.
- Do not remove Plan 1 or Plan 2; they are complete and remain historical implementation records.
- Do not remove the refreshed holistic spec.

Expected cleanup outcome:

- The docs tree contains one coherent refreshed BossMod plan sequence.
- No stale plan tells workers to implement the old horizontal split after the refreshed vertical-slice plans exist.

- [ ] **Step 2: Search for stale design terminology**

Use repository search for these terms and update or remove stale docs/code references found in BossMod-owned files:

```text
Muted
ImGui.ShowDemoWindow
Plan 3 audio and UI
Plan 4 integration
old horizontal split
Settings window is open
```

Rules:

- Do not mechanically replace unrelated uses.
- `Muted` is still valid as a global master mute property if the implementation uses that name from `Globals`; it is stale only when used as a per-skill/per-boss setting instead of `AudioMuted`.
- Remove stale documentation rather than adding comments that point to new locations.

- [ ] **Step 3: Final automated verification**

Run:

```bash
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj
dotnet run --project build-tool build
dotnet run --project build-tool all
```

Expected:

- Core tests exit 0.
- Build exits 0.
- Deploy exits 0.
- No temporary logs/instrumentation remain in committed files.

- [ ] **Step 4: Final manual release-candidate checklist**

Main menu:

- [ ] Renderer initializes once and Settings renders.
- [ ] F8 toggles Settings with edge detection.
- [ ] Sound preview works for built-ins.
- [ ] Master mute suppresses preview audio.
- [ ] Reload/deinit/restart does not leave duplicate `BossMod_Audio` objects.

World scene:

- [ ] Catalog discovery persists without opening Settings.
- [ ] Proximate, target, and engaged activation branches work.
- [ ] Far inactive bosses do not alert.
- [ ] `AlertEngine` FireOn policy is respected.
- [ ] Multi-boss cast bars cap/sort correctly.
- [ ] Same-skill overlay alerts coalesce across bosses as `Name (xN)`.
- [ ] BuffTracker `On You` shows only source-valid boss-known effects.
- [ ] Config Mode unlocks CastBar/Cooldown/BuffTracker in `World` only; AlertOverlay remains click-through.
- [ ] User settings survive restart.
- [ ] Corrupt state logs a warning/status and uses explicit defaults rather than silently lying.
- [ ] Tuned thresholds produce expected auto-threat tiers for previously observed bosses.

Documentation:

- [ ] `mods/BossMod/CLAUDE.md` matches the final code boundaries.
- [ ] Stale old-plan files named by review are removed.
- [ ] No empty fill-in markers, unfinished task notes, or temporary investigation notes remain in final docs.

**Checkpoint:** Commit cleanup and final verification notes.

---

## Final Definition of Done

Plan 5 is complete only when all of the following are true:

- [ ] Main-menu verification passed: renderer initializes, F8 toggles Settings, sound preview works, and no duplicate audio object survives reload/deinit/restart.
- [ ] World-scene verification passed: catalog discovery persists without opening Settings; activation branches work; inactive bosses do not alert; FireOn policy is respected; multi-boss windows and overlay coalescing behave correctly; BuffTracker `On You` is source-valid.
- [ ] Threshold defaults in `mods/BossMod.Core/Catalog/Thresholds.cs` are tuned from observed elites/bosses, and `tests/BossMod.Core.Tests/ThreatClassifierTests.cs` locks the tuned behavior.
- [ ] Renderer/UI allocation and populated Settings-table behavior were observed; any v1-breaking issues were fixed; speculative renderer rewrites were avoided if not earned by evidence.
- [ ] `mods/BossMod/CLAUDE.md` exists and accurately documents boundaries, commands, and manual smoke checks.
- [ ] Stale plan/doc cleanup was performed after review identified obsolete files.
- [ ] Temporary logs and instrumentation were removed before every commit.
- [ ] `dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj` exits 0.
- [ ] `dotnet run --project build-tool build` exits 0.
- [ ] `dotnet run --project build-tool all` exits 0.
- [ ] Final manual release-candidate checklist is fully passing and recorded in the commit/PR notes.
