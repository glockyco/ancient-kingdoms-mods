# BossMod Plan 4 — UI Surfaces, Settings, and Config Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skill://superpowers:executing-plans to implement this plan inline task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Pause for review at the checkpoint at the end of this plan.

**Goal:** Complete BossMod's user-facing HUD windows and Settings UI on top of Plan 3's Core contracts and minimal vertical runtime path.

**Architecture:** UI code renders from `UiFrame`, `PlayerBuffView`, `UiMode`, `WindowChrome`, `SkillCatalog`, `Globals`, and small UI services only. `BossModUi` owns the window instances and returns a structured `UiRenderResult` carrying dirty/immediate-flush/status outcomes; `BossMod.cs` remains the conductor that builds `UiFrame`, invokes `BossModUi.Render`, marks `StateFlusher` dirty, performs immediate flushes after import/reset, and handles the F8 hotkey. State import/reload/reset applies in place to the existing `SkillCatalog`/`Globals` object graphs unless a task explicitly rebuilds every dependent service in the same change.

**Tech Stack:** C# net6.0, ImGui.NET 1.89.1, BossMod.Core contracts from Plan 3, UnityEngine APIs only in conductor/service files that need them. UI windows must not read IL2CPP game state.

**Spec:** `docs/superpowers/specs/2026-04-29-bossmod-design.md`

**Depends on:** Plan 3 committed with `UiFrame`, `PlayerBuffView`, `UiMode`, `WindowChrome`, `AlertOverlay`, `SoundBank`, `SoundPlayer`, `StateJson`, `StateFlusher`, `SettingsResolver`, `Globals.MasterVolume`, `ExpansionDefault`, `AudioMuted`, and a minimal `BossMod.cs` vertical path.

**Out of scope:** Broad Core alert/audio/persistence redesigns, renderer backend changes, live-game threshold tuning, and final E2E validation. Focused pure-Core helpers for settings-source display, mutation/no-op detection, and in-place state application are in scope because Plan 4's Settings UI depends on them.

---

## File Structure

| Path | Responsibility | Status |
|---|---|---|
| `mods/BossMod.Core/Effects/SettingsResolver.cs` | Final and source-aware settings resolution for Settings badges | Modify |
| `mods/BossMod.Core/Persistence/StateJson.cs` | Existing state read/write contract used by import/reload | Reference |
| `mods/BossMod.Core/Tracking/BossState.cs` | Add pure view data needed by UI sorting (`DistanceToPlayer`, `IsTargeted`) | Modify |
| `tests/BossMod.Core.Tests/SettingsResolverTests.cs` | Source-aware resolver and inheritance tests | Modify |
| `tests/BossMod.Core.Tests/StateMutationTests.cs` | In-place apply/reset/no-op dirty semantics | Create |
| `mods/BossMod/Tracking/MonsterWatcher.cs` | Populate distance/target view data without UI game probes | Modify |
| `mods/BossMod/Tracking/PlayerContextBuilder.cs` | Build local-player buff context; no UI rendering | Modify |
| `mods/BossMod/Tracking/UiFrameBuilder.cs` | Assemble source-valid `PlayerBuffView`s from player context plus boss snapshots | Modify |
| `mods/BossMod/Ui/Theme.cs` | Shared colors, formatting helpers, and central UI scale application | Create/modify |
| `mods/BossMod/Ui/WindowChrome.cs` | Single owner of effective Config Mode/window chrome policy and ImGui flag conversion | Modify |
| `mods/BossMod/Ui/BossModUi.cs` | Owns windows, F8 Settings visibility, config banner, typed render result | Modify |
| `mods/BossMod/Ui/CastBarWindow.cs` | Active cast bars over `UiFrame` + catalog resolver | Create |
| `mods/BossMod/Ui/CooldownWindow.cs` | Active boss cooldown sections over `UiFrame` | Create |
| `mods/BossMod/Ui/BuffTrackerWindow.cs` | Player/boss buff and debuff sections over `UiFrame` | Create |
| `mods/BossMod/Ui/Settings/ISettingsMutator.cs` | Persisted settings mutation boundary; no reference-type records | Create |
| `mods/BossMod/Ui/Settings/SettingsMutator.cs` | Truthful catalog/global mutations and in-place state apply/reset | Create |
| `mods/BossMod/Ui/Settings/SoundPreview.cs` | Sound preview service that reads current globals and does not consume alert rate limiter | Create |
| `mods/BossMod/Ui/Settings/IStateFileActions.cs` | Import/export/reload/reset boundary | Create |
| `mods/BossMod/Ui/SettingsWindow.cs` | Settings shell and typed result aggregation | Create |
| `mods/BossMod/Ui/Tabs/SkillsTab.cs` | Skill override editor | Create |
| `mods/BossMod/Ui/Tabs/BossesTab.cs` | Boss-skill override editor | Create |
| `mods/BossMod/Ui/Tabs/SoundsTab.cs` | Sound inventory/load-status UI | Create |
| `mods/BossMod/Ui/Tabs/GeneralTab.cs` | Global settings, Config Mode, fixed-F8 hotkey display | Create |
| `mods/BossMod/Ui/Tabs/ExportImportTab.cs` | State file actions UI | Create |
| `mods/BossMod/HotkeyManager.cs` | F8 edge-detected Settings toggle | Create |
| `mods/BossMod/BossMod.cs` | Wire window instances, typed UI result, dirty/immediate flush, hotkeys, services | Modify |

---

## Cross-cutting rules

- [ ] UI windows under `mods/BossMod/Ui/**` must not read `Il2Cpp.*`, `Player.localPlayer`, `NetworkManagerMMO`, `NetworkTime`, `Object.FindObjectOfType`, or scene game singletons.
- [ ] Use bare `UnityEngine.*` only in conductor/service files that actually need Unity APIs, such as `HotkeyManager` and `BossMod.cs`; Settings/UI tabs must receive paths/actions/services rather than computing game or user-data state themselves.
- [ ] Do not introduce reference-type `record` declarations under `mods/BossMod/**`; Plan 3 proved they fail in this IL2CPP-referenced project. Use sealed classes or verified readonly structs.
- [ ] `BossModUi.Render`, `SettingsWindow.Render`, and settings tabs return structured results (`Dirty`, `FlushImmediately`, `StatusMessage`) rather than collapsing file actions into a bool. UI-only state changes, filtering text, expanding headers, previewing sounds, opening folders, rescanning sound files, and failed file actions leave `Dirty=false`.
- [ ] State import/reload/reset must preserve live-service coherence. Prefer in-place mutation of the existing `SkillCatalog` and `Globals` graphs; if root objects are replaced, `BossMod.cs` must rebuild every dependent service in the same task and reset frame/alert state.
- [ ] `Globals.UiScale` is applied centrally before BossMod windows render, not independently per window.
- [ ] Each task ends with `dotnet run --project build-tool build` succeeding. If a task touches `mods/BossMod.Core/**`, also run `dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj`.
- [ ] Commit after each task. Do not commit a known broken build.

---

## Task 1: Shared UI theme, scale, and chrome helpers

**Files:**
- Create/modify: `mods/BossMod/Ui/Theme.cs`
- Modify: `mods/BossMod/Ui/WindowChrome.cs`

- [ ] **Step 1: Add shared theme helpers**

Create or update `mods/BossMod/Ui/Theme.cs` with centralized color helpers and a single UI-scale entry point so windows do not invent status colors or scale behavior independently:

```csharp
using System;
using BossMod.Core.Catalog;
using BossMod.Core.Persistence;
using ImGuiNET;

namespace BossMod.Ui;

public static class Theme
{
    public const uint Critical = 0xFF3030FF;
    public const uint High = 0xFF4090FF;
    public const uint Medium = 0xFF40D0FF;
    public const uint Low = 0xFF80D080;
    public const uint Ready = 0xFF40D040;
    public const uint Aura = 0xFFD080FF;
    public const uint Debuff = 0xFF5050FF;
    public const uint Buff = 0xFFFFB060;
    public const uint ConfigOutline = 0xFF00D7FF;

    public const float MinUiScale = 0.6f;
    public const float MaxUiScale = 2.0f;

    public static uint ThreatColor(ThreatTier tier) => tier switch
    {
        ThreatTier.Critical => Critical,
        ThreatTier.High => High,
        ThreatTier.Medium => Medium,
        _ => Low,
    };

    public static void ApplyUiScale(Globals globals)
    {
        ImGui.GetIO().FontGlobalScale = Math.Clamp(globals.UiScale, MinUiScale, MaxUiScale);
    }
}
```

- [ ] **Step 2: Add `WindowChrome` to ImGui flag conversion**

Update `mods/BossMod/Ui/WindowChrome.cs` with a conversion helper:

```csharp
using ImGuiNET;

namespace BossMod.Ui;

public static class WindowChromeExtensions
{
    public static ImGuiWindowFlags ToImGuiFlags(this WindowChrome chrome)
    {
        var flags = ImGuiWindowFlags.NoScrollbar;

        if (chrome.ClickThrough) flags |= ImGuiWindowFlags.NoInputs;
        if (!chrome.ShowTitleBar) flags |= ImGuiWindowFlags.NoTitleBar;
        if (!chrome.ShowBackground) flags |= ImGuiWindowFlags.NoBackground;
        if (!chrome.Movable) flags |= ImGuiWindowFlags.NoMove;
        if (!chrome.Resizable) flags |= ImGuiWindowFlags.NoResize;

        return flags;
    }

    public static void DrawConfigOutline(WindowChrome chrome)
    {
        if (!chrome.ShowConfigOutline) return;
        var drawList = ImGui.GetWindowDrawList();
        drawList.AddRect(ImGui.GetWindowPos(), ImGui.GetWindowPos() + ImGui.GetWindowSize(), Theme.ConfigOutline, 4f, ImDrawFlags.None, 2f);
    }
}
```

Do not add `ImGuiWindowFlags.NoSavedSettings` to normal HUD windows; ImGui's ini file must persist their positions and sizes. `BossModUi.Render` must call `Theme.ApplyUiScale(_globals)` once before rendering HUD/Settings windows; individual windows must not apply their own scale.

- [ ] **Step 3: Verify and commit**

Run:

```bash
dotnet run --project build-tool build
```

Expected: PASS.

Commit:

```bash
git add mods/BossMod/Ui/Theme.cs mods/BossMod/Ui/WindowChrome.cs
git commit -m "feat(bossmod): add shared UI theme and chrome helpers"
```

---

## Task 2: CastBarWindow over UiFrame

**Files:**
- Create: `mods/BossMod/Ui/CastBarWindow.cs`
- Modify: `mods/BossMod/Ui/BossModUi.cs`
- Modify: `mods/BossMod/BossMod.cs`

- [ ] **Step 1: Implement `CastBarWindow` with pure dependencies**

Create `mods/BossMod/Ui/CastBarWindow.cs`. Constructor dependencies are `SkillCatalog` and `Globals`; these are pure model/settings dependencies, not game-state probes. Do not inject `MonsterWatcher`, `PlayerContextBuilder`, `Player`, `Monster`, or `NetworkManagerMMO`.

Required behavior:

```csharp
public sealed class CastBarWindow
{
    public CastBarWindow(SkillCatalog catalog, Globals globals);
    public void Render(UiFrame frame);
}
```

Inside `Render`:

- Return if `!frame.Mode.InWorldScene`.
- Return if `!_globals.ShowCastBarWindow`.
- Build rows from `frame.Bosses.Where(b => b.IsActive && b.ActiveCast.HasValue)`.
- Resolve threat with `SettingsResolver.ResolveThreat(skillRecord, bossSkillRecord)` using `BossState.BossId` and `CastInfo.SkillId`; fall back to `ThreatTier.Low` when catalog data is missing.
- Sort by threat descending, then by remaining cast time ascending.
- Cap visible rows by `_globals.MaxCastBars` and render a truthful overflow row such as `+N more casting` when active cast rows exceed the cap.
- Remaining time is `Math.Max(0, cast.CastTimeEnd - frame.ServerTime)`.
- Progress is `1f - remaining / cast.TotalCastTime`, clamped to `[0, 1]`; if `TotalCastTime <= 0`, progress is `1`.
- Use only `frame.Mode.CastBarChrome.ToImGuiFlags()` for window flags and call `WindowChromeExtensions.DrawConfigOutline(frame.Mode.CastBarChrome)` after `ImGui.Begin`.
- In Config Mode with no rows, render an empty interactive window containing `Cast bars appear here when active bosses cast.`

- [ ] **Step 2: Wire CastBarWindow into `BossModUi` and conductor**

Update `BossModUi` to accept an optional/required `CastBarWindow` and call `_castBars.Render(frame)` before cooldowns, buffs, and the alert overlay.

Update `BossMod.cs` initialization to construct:

```csharp
_castBars = new CastBarWindow(_catalog, _globals);
```

and pass it into `BossModUi`.

- [ ] **Step 3: Verify UI boundary, build, and commit**

Search `mods/BossMod/Ui/CastBarWindow.cs` for forbidden patterns:

```text
Il2Cpp|Player\.localPlayer|NetworkManagerMMO|NetworkTime|FindObjectOfType|Object\.Find
```

Expected: zero matches.

Run:

```bash
dotnet run --project build-tool build
```

Expected: PASS.

Commit:

```bash
git add mods/BossMod/Ui/CastBarWindow.cs mods/BossMod/Ui/BossModUi.cs mods/BossMod/BossMod.cs
git commit -m "feat(bossmod): render cast bars from UI frames"
```

---

## Task 3: CooldownWindow over UiFrame

**Files:**
- Modify: `mods/BossMod.Core/Tracking/BossState.cs`
- Modify: `mods/BossMod/Tracking/MonsterWatcher.cs`
- Create: `mods/BossMod/Ui/CooldownWindow.cs`
- Modify: `mods/BossMod/Ui/BossModUi.cs`
- Modify: `mods/BossMod/BossMod.cs`

- [ ] **Step 1: Add pure boss distance/target view data**

Before creating the window, extend `BossState` and `MonsterWatcher` so UI sorting does not need any IL2CPP probes:

```csharp
public sealed class BossState
{
    // existing properties...
    public float DistanceToPlayer { get; set; }
    public bool IsTargeted { get; set; }
}
```

`MonsterWatcher.BuildState` should receive the local player or local-player position, compute 2D X/Y distance from the live monster to the local player, and set `IsTargeted` by comparing `netId`. This must not change activation semantics; it only supplies view data.

- [ ] **Step 2: Implement `CooldownWindow` with pure dependencies**

Create `mods/BossMod/Ui/CooldownWindow.cs`:

```csharp
public sealed class CooldownWindow
{
    public CooldownWindow(Globals globals);
    public void Render(UiFrame frame);
}
```

Required behavior:

- Return if `!frame.Mode.InWorldScene` or `!_globals.ShowCooldownWindow`.
- Active bosses are `frame.Bosses.Where(b => b.IsActive)`.
- Sort targeted boss first using `BossState.IsTargeted` or `frame.TargetedBossId`, then `BossState.DistanceToPlayer` ascending.
- Use only `frame.Mode.CooldownChrome.ToImGuiFlags()` for window flags and call `WindowChromeExtensions.DrawConfigOutline(frame.Mode.CooldownChrome)` after `ImGui.Begin`.
- Render one `CollapsingHeader` per boss with display name, level, and HP percent.
- Initial expansion maps exactly from `ExpansionDefault`:
  - `ExpandAll` => open.
  - `CollapseAll` => closed.
  - `ExpandTargetedOnly` => open only for targeted boss.
- Cooldown rows use `BossState.Cooldowns` and `SkillCooldown.SkillIdx >= 1`.
- Sort by ETA ascending, where ready ETA is zero.
- Ready rows show `READY` in `Theme.Ready`; non-ready rows show remaining seconds clamped to zero.
- In Config Mode with no rows, render an interactive empty window containing `Cooldowns appear here for active bosses.`

- [ ] **Step 3: Wire into `BossModUi` and conductor**

Construct `CooldownWindow(_globals)` in `BossMod.cs`, pass to `BossModUi`, and call `_cooldowns.Render(frame)` after cast bars.

- [ ] **Step 4: Verify boundary, build, and commit**

Search `mods/BossMod/Ui/CooldownWindow.cs` for forbidden patterns:

```text
Il2Cpp|Player\.localPlayer|NetworkManagerMMO|NetworkTime|FindObjectOfType|Object\.Find
```

Expected: zero matches.

Run:

```bash
dotnet run --project build-tool build
```

Expected: PASS. Because this task touches `mods/BossMod.Core/**`, also run `dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj` and expect PASS.

Commit:

```bash
git add mods/BossMod.Core/Tracking/BossState.cs mods/BossMod/Tracking/MonsterWatcher.cs mods/BossMod/Ui/CooldownWindow.cs mods/BossMod/Ui/BossModUi.cs mods/BossMod/BossMod.cs
git commit -m "feat(bossmod): render cooldown groups from UI frames"
```

---

## Task 4: BuffTrackerWindow over UiFrame

**Files:**
- Modify: `mods/BossMod/Ui/UiFrame.cs`
- Modify: `mods/BossMod/Tracking/PlayerContextBuilder.cs`
- Modify: `mods/BossMod/Tracking/UiFrameBuilder.cs`
- Create: `mods/BossMod/Ui/BuffTrackerWindow.cs`
- Modify: `mods/BossMod/Ui/BossModUi.cs`
- Modify: `mods/BossMod/BossMod.cs`

- [ ] **Step 1: Preserve source attribution in `PlayerBuffView`**

Before creating the window, update the player-buff view contract so it can distinguish source-verified boss effects from unknown or non-boss effects. Prefer a single enum over parallel booleans:

```csharp
public enum PlayerBuffSourceStatus
{
    SourceUnknown,
    FromActiveBoss,
    NotFromActiveBoss,
}
```

`UiFrameBuilder` must set `FromActiveBoss` only when tracking can verify a source/caster netId or equivalent source-valid live field against the current active bosses. It must not infer boss ownership from `SkillId` alone. If the live `Buff` object does not expose source identity in the verified API surface, preserve `SourceUnknown` and let Plan 5 live E2E decide whether more source data exists.

- [ ] **Step 2: Implement `BuffTrackerWindow`**

Create `mods/BossMod/Ui/BuffTrackerWindow.cs`:

```csharp
public sealed class BuffTrackerWindow
{
    public BuffTrackerWindow(Globals globals);
    public void Render(UiFrame frame);
}
```

Required behavior:

- Return if `!frame.Mode.InWorldScene` or `!_globals.ShowBuffTrackerWindow`.
- Use only `frame.Mode.BuffTrackerChrome.ToImGuiFlags()` for window flags and call `WindowChromeExtensions.DrawConfigOutline(frame.Mode.BuffTrackerChrome)` after `ImGui.Begin`.
- Render an `On You` pseudo-section from `frame.PlayerBuffs`.
- Outside Config Mode, show only rows with `PlayerBuffSourceStatus.FromActiveBoss`.
- In Config Mode, show non-source-verified rows disabled with a truthful badge such as `source unknown` or `not from active boss`.
- Render one section per active boss from `BossState.Buffs`.
- Colors: aura => `Theme.Aura`, debuff => `Theme.Debuff`, otherwise `Theme.Buff`.
- Remaining time is clamped to zero using `BuffSnapshot.BuffTimeEnd - frame.ServerTime` for boss buffs and `PlayerBuffView.EndTime - frame.ServerTime` for player buffs.
- If `TotalBuffTime`/`TotalTime > 0`, show a progress bar; otherwise show text duration only.
- In Config Mode with no rows, render an interactive empty window with `Buffs and debuffs appear here for active bosses and the local player.`

- [ ] **Step 3: Wire into `BossModUi` and conductor**

Construct `BuffTrackerWindow(_globals)` in `BossMod.cs`, pass to `BossModUi`, and call `_buffs.Render(frame)`.

- [ ] **Step 4: Verify boundary, build, and commit**

Search `mods/BossMod/Ui/BuffTrackerWindow.cs` for forbidden patterns:

```text
Il2Cpp|Player\.localPlayer|NetworkManagerMMO|NetworkTime|FindObjectOfType|Object\.Find
```

Expected: zero matches.

Run:

```bash
dotnet run --project build-tool build
```

Expected: PASS.

Commit:

```bash
git add mods/BossMod/Ui/UiFrame.cs mods/BossMod/Tracking/PlayerContextBuilder.cs mods/BossMod/Tracking/UiFrameBuilder.cs mods/BossMod/Ui/BuffTrackerWindow.cs mods/BossMod/Ui/BossModUi.cs mods/BossMod/BossMod.cs
git commit -m "feat(bossmod): render buff tracker from UI frames"
```

---

## Task 5: Settings mutation boundary and Settings shell

**Files:**
- Modify: `mods/BossMod.Core/Effects/SettingsResolver.cs`
- Modify: `tests/BossMod.Core.Tests/SettingsResolverTests.cs`
- Create: `tests/BossMod.Core.Tests/StateMutationTests.cs`
- Create: `mods/BossMod/Ui/Settings/UiRenderResult.cs`
- Create: `mods/BossMod/Ui/Settings/ISettingsMutator.cs`
- Create: `mods/BossMod/Ui/Settings/SettingsMutator.cs`
- Create: `mods/BossMod/Ui/SettingsWindow.cs`
- Modify: `mods/BossMod/Ui/BossModUi.cs`
- Modify: `mods/BossMod/BossMod.cs`

- [ ] **Step 1: Add source-aware resolver helpers in Core**

Extend `SettingsResolver` with value+source helpers used only for Settings display badges; keep existing final-value methods for alert policy:

```csharp
public enum SettingSource
{
    BossOverride,
    SkillOverride,
    AutoThreat,
    TierDefault,
    HardDefault,
}

public readonly record struct ResolvedSetting<T>(T Value, SettingSource Source);
```

Add source-aware methods for threat, sound, alert text, fire trigger, and audio mute. Tests must cover boss override, skill override, auto/tier/default fallback, and the important distinction that `AlertText = ""` is an explicit `BossOverride`/`SkillOverride`, not inherit.

- [ ] **Step 2: Define BossMod-safe patch/result classes and mutator interface**

Create `mods/BossMod/Ui/Settings/UiRenderResult.cs` and `mods/BossMod/Ui/Settings/ISettingsMutator.cs`. Do not use reference-type records in `mods/BossMod/**`:

```csharp
namespace BossMod.Ui.Settings;

public sealed class UiRenderResult
{
    public static readonly UiRenderResult None = new();

    public bool Dirty { get; set; }
    public bool FlushImmediately { get; set; }
    public string StatusMessage { get; set; } = "";

    public void Merge(UiRenderResult other)
    {
        Dirty |= other.Dirty;
        FlushImmediately |= other.FlushImmediately;
        if (!string.IsNullOrWhiteSpace(other.StatusMessage)) StatusMessage = other.StatusMessage;
    }
}

public sealed class SkillOverridePatch
{
    public ThreatTier? UserThreat { get; set; }
    public string? Sound { get; set; }
    public string? AlertText { get; set; }
    public AlertTrigger? FireOn { get; set; }
    public bool? AudioMuted { get; set; }
    public bool ClearUserThreat { get; set; }
    public bool ClearSound { get; set; }
    public bool ClearAlertText { get; set; }
    public bool ClearFireOn { get; set; }
    public bool ClearAudioMuted { get; set; }
}

public sealed class GlobalPatch
{
    public bool? Muted { get; set; }
    public float? MasterVolume { get; set; }
    public bool? AlertTextMuteOnMasterMute { get; set; }
    public float? ProximityRadius { get; set; }
    public float? UiScale { get; set; }
    public ExpansionDefault? ExpansionDefault { get; set; }
    public int? MaxCastBars { get; set; }
    public bool? ShowCastBarWindow { get; set; }
    public bool? ShowCooldownWindow { get; set; }
    public bool? ShowBuffTrackerWindow { get; set; }
    public bool? ConfigMode { get; set; }
    public int? CriticalDamage { get; set; }
    public int? HighDamage { get; set; }
    public int? AuraDpsHigh { get; set; }
    public float? CriticalCastTime { get; set; }
}

public interface ISettingsMutator
{
    bool SetSkillOverride(string skillId, SkillOverridePatch patch);
    bool SetBossSkillOverride(string bossId, string skillId, SkillOverridePatch patch);
    bool SetGlobal(GlobalPatch patch);
    bool ApplyLoadedStateInPlace(SkillCatalog loadedCatalog, Globals loadedGlobals);
    bool ResetUserSettingsToDefaults();
}
```

`ApplyLoadedStateInPlace` mutates the existing live `SkillCatalog` and `Globals` graphs so `AlertEngine`, `MonsterWatcher`, UI windows, and audio services do not keep stale references. It must compare old/new values and return `true` only when persisted state actually differs.

- [ ] **Step 3: Implement `SettingsMutator` with no-op detection**

`SettingsMutator` takes references to the active `SkillCatalog` and `Globals`. Each method compares old/new values and returns `true` only if at least one persisted value changed. Clearing a nullable override sets that property to `null`. Setting empty `AlertText` is a real value meaning no overlay text, not inherit. `ResetUserSettingsToDefaults()` restores `Globals` defaults and clears only user-owned overrides while preserving discovered bosses, skills, snapshots, auto-threat, first/last-seen metadata, and sound inventory state.

Add `tests/BossMod.Core.Tests/StateMutationTests.cs` or equivalent pure tests for the mutation rules if the comparison/apply/reset helper lives in Core; if the mutator stays in `mods/BossMod`, keep the logic simple and covered by build plus Plan 5 manual checks.

- [ ] **Step 4: Add a buildable Settings shell**

Create `mods/BossMod/Ui/SettingsWindow.cs` with a minimal tab shell that can be extended by later tasks:

```csharp
public sealed class SettingsWindow
{
    public UiRenderResult Render(UiMode mode)
    {
        var result = new UiRenderResult();
        ImGui.SetNextWindowSize(new Vector2(720f, 520f), ImGuiCond.FirstUseEver);
        if (!ImGui.Begin("BossMod Settings"))
        {
            ImGui.End();
            return result;
        }

        if (ImGui.BeginTabBar("BossMod Settings Tabs"))
        {
            ImGui.TextDisabled("Settings tabs are added by subsequent Plan 4 tasks.");
            ImGui.EndTabBar();
        }

        ImGui.End();
        return result;
    }
}
```

- [ ] **Step 5: Wire Settings into `BossModUi`**

`BossModUi` owns a `SettingsWindow`, exposes `ToggleSettings()`, calls `Theme.ApplyUiScale(_globals)` once per frame before rendering BossMod windows, and calls `_settings.Render(frame.Mode)` only when the Settings window is visible. `BossModUi.Render` returns `UiRenderResult`; `BossMod.cs` marks dirty when `Dirty` is true and performs immediate flush only when `FlushImmediately` is true.

`BossMod.cs` wires F8 in a later task; for now it only constructs the Settings shell and passes it to `BossModUi`.

- [ ] **Step 6: Build and commit**

Run:

```bash
dotnet run --project build-tool build
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj
```

Expected: PASS.

Commit:

```bash
git add mods/BossMod.Core/Effects/SettingsResolver.cs tests/BossMod.Core.Tests/SettingsResolverTests.cs tests/BossMod.Core.Tests/StateMutationTests.cs mods/BossMod/Ui/Settings/UiRenderResult.cs mods/BossMod/Ui/Settings/ISettingsMutator.cs mods/BossMod/Ui/Settings/SettingsMutator.cs mods/BossMod/Ui/SettingsWindow.cs mods/BossMod/Ui/BossModUi.cs mods/BossMod/BossMod.cs
git commit -m "feat(bossmod): add settings mutation boundary"
```

---

## Task 6: Skills and Bosses override tabs

**Files:**
- Create: `mods/BossMod/Ui/Tabs/SkillsTab.cs`
- Create: `mods/BossMod/Ui/Tabs/BossesTab.cs`
- Modify: `mods/BossMod/Ui/SettingsWindow.cs`

- [ ] **Step 1: Implement `SkillsTab.Render()`**

The tab keeps UI-only filter/selection state privately. Filter/selection changes return `UiRenderResult.None`. Persisted override changes call `_mutator.SetSkillOverride(...)` and set `Dirty=true` only when the mutator returns `true`.

Required controls for each selected skill:

- `UserThreat` with inherit option.
- `Sound` with inherit option; show the resolved sound name and a missing-sound badge if a `SoundBank` inventory lookup is already wired. Preview buttons are added in Task 7, when `SoundPreview` exists.
- `AlertText` with separate inherit control; empty string means overlay disabled.
- `FireOn` with inherit option.
- `AudioMuted` with inherit option.

Show resolved value/source badges using the source-aware `SettingsResolver` helpers from Task 5; do not reimplement resolver logic in UI.

- [ ] **Step 2: Implement `BossesTab.Render()`**

The tab keeps UI-only filter/selection state privately. Persisted boss-skill override changes call `_mutator.SetBossSkillOverride(...)` and set `Dirty=true` only when the mutator returns `true`.

Required controls for each selected boss skill:

- `UserThreat` with inherit option.
- `Sound` with inherit option; show the resolved sound name and a missing-sound badge if a `SoundBank` inventory lookup is already wired. Preview buttons are added in Task 7, when `SoundPreview` exists.
- `AlertText` with separate inherit control; empty string means overlay disabled.
- `FireOn` with inherit option.
- `AudioMuted` with inherit option.

The displayed resolved source order must be boss override -> skill override -> auto/tier/default and must come from the source-aware resolver helpers.

- [ ] **Step 3: Wire tabs into `SettingsWindow`**

Construct `SkillsTab` and `BossesTab` in `SettingsWindow`. In `Render`, add tab items for `Skills` and `Bosses`; merge each tab's `UiRenderResult` into the SettingsWindow result.

- [ ] **Step 4: Build and commit**

Run:

```bash
dotnet run --project build-tool build
```

Expected: PASS.

Commit:

```bash
git add mods/BossMod/Ui/Tabs/SkillsTab.cs mods/BossMod/Ui/Tabs/BossesTab.cs mods/BossMod/Ui/SettingsWindow.cs
git commit -m "feat(bossmod): add skill and boss settings tabs"
```

---

## Task 7: Sounds tab with load results and preview

**Files:**
- Create: `mods/BossMod/Ui/Tabs/SoundsTab.cs`
- Create: `mods/BossMod/Ui/Settings/SoundPreview.cs`
- Modify: `mods/BossMod/Audio/SoundBank.cs`
- Modify: `mods/BossMod/Audio/SoundPlayer.cs`
- Modify: `mods/BossMod/Ui/Tabs/SkillsTab.cs`
- Modify: `mods/BossMod/Ui/Tabs/BossesTab.cs`
- Modify: `mods/BossMod/Ui/SettingsWindow.cs`
- Modify: `mods/BossMod/BossMod.cs`

- [ ] **Step 1: Expose sound inventory from `SoundBank`**

Ensure `SoundBank` exposes one truthful inventory model while preserving the Plan 3 scan-status concept:

```csharp
public IReadOnlyList<SoundEntry> Entries { get; }
public IReadOnlyList<SoundLoadStatus> LoadStatuses { get; }
public void RescanUserSounds();
public const long MaxUserWavBytes = 5 * 1024 * 1024;
public const double MaxUserWavSeconds = 10.0;
```

`SoundEntry` must distinguish built-in vs user sounds and must be a sealed class or readonly struct, not a reference-type record. Built-ins belong in `Entries`; invalid/skipped user WAVs belong in `LoadStatuses`. Do not leave parallel APIs such as both `Rescan()` and `RescanUserSounds()` or both `LoadResults` and `LoadStatuses` alive after the task.

- [ ] **Step 2: Add `SoundPreview` service**

Create `mods/BossMod/Ui/Settings/SoundPreview.cs`:

```csharp
public sealed class SoundPreview
{
    private readonly SoundPlayer _player;
    private readonly Func<Globals> _globals;

    public SoundPreview(SoundPlayer player, Func<Globals> globals)
    {
        _player = player;
        _globals = globals;
    }

    public void Play(string soundName) => _player.PlayPreview(soundName, _globals());
}
```

Previewing a sound is not a persisted change. `PlayPreview` must respect current master mute/volume and missing-clip handling, but it must not consume the live alert `SoundRateLimiter` state used by real encounter alerts.

- [ ] **Step 3: Implement `SoundsTab.Render()`**

The tab must:

- show built-in sounds first, then user sounds by case-insensitive name;
- show each load result with status and reason;
- provide `Preview` buttons for loaded sounds;
- provide `Rescan Sounds Folder`, which calls `SoundBank.RescanUserSounds()` and returns `UiRenderResult.None` because scan status is not persisted in v1;
- provide `Open Sounds Folder` through a conductor-provided `Action` so the tab does not compute user data paths itself;
- display exact limits from `SoundBank.MaxUserWavBytes` and `SoundBank.MaxUserWavSeconds`.

- [ ] **Step 4: Wire tab into SettingsWindow and conductor services**

Pass `SoundPreview`, `SoundBank`, sound folder path, and open-folder action into `SettingsWindow`. Wire `SoundsTab.Render()` into SettingsWindow result merging; it should normally return `UiRenderResult.None`.
Also pass sound inventory and `SoundPreview` into `SkillsTab` and `BossesTab` so their Sound override rows can show missing-sound badges and enable `Preview` only for names present in `SoundBank.Entries`.

- [ ] **Step 5: Build and commit**

Run:

```bash
dotnet run --project build-tool build
```

Expected: PASS.

Commit:

```bash
git add mods/BossMod/Ui/Tabs/SoundsTab.cs mods/BossMod/Ui/Settings/SoundPreview.cs mods/BossMod/Audio/SoundBank.cs mods/BossMod/Audio/SoundPlayer.cs mods/BossMod/Ui/Tabs/SkillsTab.cs mods/BossMod/Ui/Tabs/BossesTab.cs mods/BossMod/Ui/SettingsWindow.cs mods/BossMod/BossMod.cs
git commit -m "feat(bossmod): add sound management settings"
```

---

## Task 8: General tab, Config Mode, and F8 hotkey

**Files:**
- Create: `mods/BossMod/Ui/Tabs/GeneralTab.cs`
- Modify: `mods/BossMod/Ui/WindowChrome.cs`
- Create: `mods/BossMod/HotkeyManager.cs`
- Modify: `mods/BossMod/Ui/SettingsWindow.cs`
- Modify: `mods/BossMod/Ui/BossModUi.cs`
- Modify: `mods/BossMod/BossMod.cs`

- [ ] **Step 1: Implement `GeneralTab.Render(UiMode mode)`**

`GeneralTab` edits globals through `_mutator.SetGlobal(...)`. Controls:

```text
ShowCastBarWindow
ShowCooldownWindow
ShowBuffTrackerWindow
ConfigMode
ProximityRadius
MaxCastBars
ExpansionDefault
UiScale
Thresholds.CriticalDamage
Thresholds.HighDamage
Thresholds.AuraDpsHigh
Thresholds.CriticalCastTime
Muted
MasterVolume
AlertTextMuteOnMasterMute
F8 hotkey display (read-only for v1)
```

Changing a control to the same value returns `UiRenderResult.None`. Config Mode checkbox is disabled when `!mode.InWorldScene` and shows `Config Mode is available only in World.` The hotkey row is display-only for v1: `F8 toggles Settings`; do not expose rebinding until a later plan.

- [ ] **Step 2: Keep Config Mode policy single-owned**

`WindowChrome.ForMode(bool inWorldScene, bool configMode)` remains the single owner of effective mode/chrome derivation. CastBar, Cooldown, and BuffTracker become interactive only when both inputs are true. AlertOverlay remains click-through in all modes. Do not add a parallel Config Mode policy helper.

If `Globals.ConfigMode` is true outside World, effective `UiMode.ConfigMode` must be false. Do not mutate the persisted value from the frame-building hot path. `BossModUi` may render a World-only top-center banner with an `Exit` button while effective Config Mode is true; clicking `Exit` calls `_mutator.SetGlobal(new GlobalPatch { ConfigMode = false })` once and returns `Dirty=true`.

- [ ] **Step 3: Implement F8 hotkey manager**

Create `mods/BossMod/HotkeyManager.cs` using `UnityEngine.InputSystem.Keyboard.current`. Required behavior:

- watches F8 only for v1;
- fires on key-down edge only;
- does not fire action hotkeys when `skipActions` is true because ImGui wants text input;
- F8 toggles `BossModUi.ToggleSettings()`.

- [ ] **Step 4: Wire General tab and hotkey into Settings/conductor**

Add `GeneralTab` to `SettingsWindow`. In `BossMod.OnUpdate`, call hotkey polling before tracking:

```csharp
_hotkeys.Tick(skipActions: _renderer.WantTextInput);
```

Register:

```csharp
_hotkeys.Register("toggle_settings", _ui.ToggleSettings);
```

- [ ] **Step 5: Build and commit**

Run:

```bash
dotnet run --project build-tool build
```

Expected: PASS.

Commit:

```bash
git add mods/BossMod/Ui/Tabs/GeneralTab.cs mods/BossMod/Ui/WindowChrome.cs mods/BossMod/HotkeyManager.cs mods/BossMod/Ui/SettingsWindow.cs mods/BossMod/Ui/BossModUi.cs mods/BossMod/BossMod.cs
git commit -m "feat(bossmod): add general settings and config mode gating"
```

---

## Task 9: Export/import/reload/reset controls

**Files:**
- Create: `mods/BossMod/Ui/Settings/IStateFileActions.cs`
- Create: `mods/BossMod/Ui/Tabs/ExportImportTab.cs`
- Modify: `mods/BossMod/Ui/Settings/SettingsMutator.cs`
- Modify: `mods/BossMod/Ui/SettingsWindow.cs`
- Modify: `mods/BossMod/BossMod.cs`

- [ ] **Step 1: Define file action service boundary**

Create `mods/BossMod/Ui/Settings/IStateFileActions.cs`:

```csharp
public interface IStateFileActions
{
    string ActiveStatePath { get; }
    string LastStatus { get; }
    StateActionResult ExportTo(string path);
    StateActionResult ImportFrom(string path);
    StateActionResult ReloadActive();
    StateActionResult ResetUserSettingsToDefaults();
}

public readonly struct StateActionResult
{
    public StateActionResult(bool changed, bool flushImmediately, string message)
    {
        Changed = changed;
        FlushImmediately = flushImmediately;
        Message = message;
    }

    public bool Changed { get; }
    public bool FlushImmediately { get; }
    public string Message { get; }
}
```

- [ ] **Step 2: Implement `ExportImportTab.Render()`**

The tab must:

- show active state path;
- export to a user-entered path; reject `ActiveStatePath` with a clear message so Export cannot silently overwrite the live `state.json`; successful export returns `Changed=false` because active state did not change;
- import from a user-entered path; call `StateJson.Read(path)` and apply loaded state in place only when `Status == StateReadStatus.Loaded`; corrupt/missing/unsupported reads preserve current in-memory state and return `Changed=false, FlushImmediately=false` with a truthful message;
- successful import returns `Changed=true, FlushImmediately=true` only when values differ after in-place apply;
- reload active state follows the same `Status == Loaded` rule; it must not replace current live state with defaults returned for missing/corrupt/unsupported reads;
- reset user settings to defaults without clearing discovered catalog records; button label is `Reset user settings to defaults`; changed reset returns `Changed=true, FlushImmediately=true`.

- [ ] **Step 3: Wire immediate flush in conductor**

When a state file action returns `FlushImmediately`, `BossMod.cs` must execute the flush and publish the final flush status back to the tab/status field:

```csharp
_flusher.MarkDirty();
_flusher.Flush();
```

Normal Settings changes still call only `MarkDirty()` and let debounce apply. If `_flusher.Flush()` throws or reports through `OnFlushError`, the UI status must say the state is still dirty/retryable rather than claiming the action saved.

- [ ] **Step 4: Wire tab into SettingsWindow**

Add `Export / Import` tab. Merge the tab's `UiRenderResult` into `SettingsWindow`'s result; immediate flush remains a conductor service responsibility and must not be hidden behind a bool-only dirty return.

- [ ] **Step 5: Build and commit**

Run:

```bash
dotnet run --project build-tool build
```

Expected: PASS.

Commit:

```bash
git add mods/BossMod/Ui/Settings/IStateFileActions.cs mods/BossMod/Ui/Tabs/ExportImportTab.cs mods/BossMod/Ui/Settings/SettingsMutator.cs mods/BossMod/Ui/SettingsWindow.cs mods/BossMod/BossMod.cs
git commit -m "feat(bossmod): add settings import export controls"
```

---

## Task 10: Final UI boundary audit

**Files:**
- Modify only files with issues found by this audit.

- [ ] **Step 1: Audit UI for forbidden game-state reads**

Search under `mods/BossMod/Ui` for forbidden terms:

```text
Il2Cpp|Player\.localPlayer|NetworkManagerMMO|NetworkTime|FindObjectOfType|Object\.Find
```

Expected: zero matches. If a match exists, move that data access to Plan 3 adapter/conductor contracts and pass pure data into UI.

- [ ] **Step 2: Audit dirty tracking**

Inspect:

```text
BossModUi.Render
SettingsWindow.Render
SkillsTab.Render
BossesTab.Render
SoundsTab.Render
GeneralTab.Render
ExportImportTab.Render
SettingsMutator.SetSkillOverride
SettingsMutator.SetBossSkillOverride
SettingsMutator.SetGlobal
SettingsMutator.ApplyLoadedStateInPlace
```

Expected: UI-only state changes return `UiRenderResult.None`; persisted mutations set `Dirty=true` only when values actually differ; import/reset hard-flush only after changed state and only through the conductor.

- [ ] **Step 3: Run verification commands**

Run:

```bash
dotnet run --project build-tool build
```

Expected: PASS.

Run if any `mods/BossMod.Core/**` file changed during this plan:

```bash
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj
```

Expected: PASS.

- [ ] **Step 4: Commit audit fixes if any**

If Step 1 or Step 2 required edits, commit them:

```bash
git add mods/BossMod/Ui/ mods/BossMod/BossMod.cs mods/BossMod/HotkeyManager.cs mods/BossMod/Tracking/ mods/BossMod.Core/Effects/SettingsResolver.cs mods/BossMod.Core/Tracking/BossState.cs tests/BossMod.Core.Tests/
git commit -m "fix(bossmod): enforce UI settings boundaries"
```

If no edits were required, do not create an empty commit.

---

## Definition of Done

- [ ] `BossModUi` is the only application UI facade called by the renderer layout callback.
- [ ] CastBar, Cooldown, and BuffTracker windows render from `UiFrame` plus pure catalog/settings inputs only.
- [ ] Settings tabs return `UiRenderResult` values and set `Dirty=true` only for actual persisted state changes.
- [ ] Settings/source badge helpers are shared through `SettingsResolver`; UI does not reimplement inheritance.
- [ ] Skills and Bosses tabs expose `UserThreat`, `Sound`, `AlertText`, `FireOn`, and `AudioMuted` without collapsing inherit and empty-alert-text semantics.
- [ ] Cast bars cap at `Globals.MaxCastBars` and show an explicit `+N more casting` overflow row.
- [ ] Sounds tab shows built-ins, user WAV load results, failure reasons, folder path, rescan, open-folder, and preview controls.
- [ ] Sound preview reads current globals, does not consume the live alert rate limiter, and Skills/Bosses show missing-sound badges from `SoundBank.Entries`.
- [ ] Export/import/reload/reset distinguishes changed, unchanged, failed, debounced flush, and immediate flush; corrupt/missing/unsupported reads preserve current live state unless the user explicitly resets.
- [ ] Import/reload/reset applies state in place or rebuilds all dependent services in one cutover; no service keeps stale `SkillCatalog`/`Globals` references.
- [ ] Config Mode is gated to World, renders a banner in World, and never makes `AlertOverlay` interactive.
- [ ] F8 toggles Settings with edge detection and does not fire while ImGui wants text input; hotkey rebinding is display-only/deferred for v1.
- [ ] `Globals.UiScale` is applied centrally once per BossMod UI frame.
- [ ] Search under `mods/BossMod/Ui` finds no forbidden IL2CPP/game-singleton reads.
- [ ] `dotnet run --project build-tool build` passes after every committed task.

## Checkpoint

Pause after Task 10 and request review before starting Plan 5. Provide the build command result and the forbidden-read search result. Do not proceed to Plan 5 in the same execution session without review approval.
