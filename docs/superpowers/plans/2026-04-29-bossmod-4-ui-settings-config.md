# BossMod Plan 4 — UI Surfaces, Settings, and Config Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skill://superpowers:executing-plans to implement this plan inline task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Pause for review at the checkpoint at the end of this plan.

**Goal:** Complete BossMod's user-facing HUD windows and Settings UI on top of Plan 3's Core contracts and minimal vertical runtime path.

**Architecture:** UI code renders from `UiFrame`, `PlayerBuffView`, `UiMode`, `WindowChrome`, `SkillCatalog`, `Globals`, and small UI services only. `BossModUi` owns the window instances and returns `true` only when persisted state changed. `BossMod.cs` remains the conductor that builds `UiFrame`, invokes `BossModUi.Render`, marks `StateFlusher` dirty, performs immediate flushes after import/reset, and handles hotkeys.

**Tech Stack:** C# net6.0, ImGui.NET 1.89.1, BossMod.Core contracts from Plan 3, UnityEngine APIs only in conductor/service files that need them. UI windows must not read IL2CPP game state.

**Spec:** `docs/superpowers/specs/2026-04-29-bossmod-design.md`

**Depends on:** Plan 3 committed with `UiFrame`, `PlayerBuffView`, `UiMode`, `WindowChrome`, `AlertOverlay`, `SoundBank`, `SoundPlayer`, `StateJson`, `StateFlusher`, `SettingsResolver`, `Globals.MasterVolume`, `ExpansionDefault`, `AudioMuted`, and a minimal `BossMod.cs` vertical path.

**Out of scope:** Core alert/audio/persistence contract changes, IL2CPP tracking adapters, renderer backend changes, live-game threshold tuning, and final E2E validation. Those are Plan 3 and Plan 5 responsibilities.

---

## File Structure

| Path | Responsibility | Status |
|---|---|---|
| `mods/BossMod/Ui/Theme.cs` | Shared colors and formatting helpers | Create/modify |
| `mods/BossMod/Ui/WindowChrome.cs` | Convert chrome records into ImGui flags | Modify |
| `mods/BossMod/Ui/BossModUi.cs` | Owns windows, toggles Settings, aggregates dirty result | Modify |
| `mods/BossMod/Ui/CastBarWindow.cs` | Active cast bars over `UiFrame` + catalog resolver | Create |
| `mods/BossMod/Ui/CooldownWindow.cs` | Active boss cooldown sections over `UiFrame` | Create |
| `mods/BossMod/Ui/BuffTrackerWindow.cs` | Player/boss buff and debuff sections over `UiFrame` | Create |
| `mods/BossMod/Ui/Settings/ISettingsMutator.cs` | Persisted settings mutation boundary | Create |
| `mods/BossMod/Ui/Settings/SettingsMutator.cs` | Truthful catalog/global mutations | Create |
| `mods/BossMod/Ui/Settings/SoundPreview.cs` | Small sound preview service | Create |
| `mods/BossMod/Ui/Settings/IStateFileActions.cs` | Import/export/reload/reset boundary | Create |
| `mods/BossMod/Ui/SettingsWindow.cs` | Settings shell and changed aggregation | Create |
| `mods/BossMod/Ui/Tabs/SkillsTab.cs` | Skill override editor | Create |
| `mods/BossMod/Ui/Tabs/BossesTab.cs` | Boss-skill override editor | Create |
| `mods/BossMod/Ui/Tabs/SoundsTab.cs` | Sound inventory/load-result UI | Create |
| `mods/BossMod/Ui/Tabs/GeneralTab.cs` | Global settings, Config Mode, hotkey display | Create |
| `mods/BossMod/Ui/Tabs/ExportImportTab.cs` | State file actions UI | Create |
| `mods/BossMod/ConfigMode.cs` | Config Mode scene gating and banner policy | Create |
| `mods/BossMod/HotkeyManager.cs` | F8 edge-detected Settings toggle | Create |
| `mods/BossMod/BossMod.cs` | Wire window instances, dirty result, hotkeys, services | Modify |

---

## Cross-cutting rules

- [ ] UI windows under `mods/BossMod/Ui/**` must not read `Il2Cpp.*`, `Player.localPlayer`, `NetworkManagerMMO`, `NetworkTime`, `Object.FindObjectOfType`, or scene game singletons.
- [ ] Use bare `UnityEngine.*` only in conductor/service files that actually need Unity APIs, such as `HotkeyManager`, `SoundPreview` if needed, and `BossMod.cs`.
- [ ] `Render()` methods return `true` only when persisted `SkillCatalog` or `Globals` data changed. Filtering text, expanding headers, previewing sounds, opening folders, rescanning sound files, and failed file actions return `false`.
- [ ] Each task ends with `dotnet run --project build-tool build` succeeding. If a task unexpectedly touches `mods/BossMod.Core/**`, also run `dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj`.
- [ ] Commit after each task. Do not commit a known broken build.

---

## Task 1: Shared UI theme and chrome helpers

**Files:**
- Create/modify: `mods/BossMod/Ui/Theme.cs`
- Modify: `mods/BossMod/Ui/WindowChrome.cs`

- [ ] **Step 1: Add shared theme helpers**

Create or update `mods/BossMod/Ui/Theme.cs` with centralized color helpers so windows do not invent status colors independently:

```csharp
using BossMod.Core.Catalog;

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

    public static uint ThreatColor(ThreatTier tier) => tier switch
    {
        ThreatTier.Critical => Critical,
        ThreatTier.High => High,
        ThreatTier.Medium => Medium,
        _ => Low,
    };
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

Do not add `ImGuiWindowFlags.NoSavedSettings` to normal HUD windows; ImGui's ini file must persist their positions and sizes.

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
- Cap by `_globals.MaxCastBars`.
- Remaining time is `Math.Max(0, cast.CastTimeEnd - frame.ServerTime)`.
- Progress is `1f - remaining / cast.TotalCastTime`, clamped to `[0, 1]`; if `TotalCastTime <= 0`, progress is `1`.
- Use `frame.Mode.CastBarChrome.ToImGuiFlags()`.
- In Config Mode with no rows, render an empty interactive window containing `Cast bars appear here when active bosses cast.`

- [ ] **Step 2: Wire CastBarWindow into `BossModUi` and conductor**

Update `BossModUi` to accept an optional/required `CastBarWindow` and call `_castBars.Render(frame)` before the alert overlay.

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
- Create: `mods/BossMod/Ui/CooldownWindow.cs`
- Modify: `mods/BossMod/Ui/BossModUi.cs`
- Modify: `mods/BossMod/BossMod.cs`

- [ ] **Step 1: Implement `CooldownWindow` with pure dependencies**

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
- Sort targeted boss first using `frame.TargetedBossId`, then `BossState.DistanceToPlayer` ascending.
- Render one `CollapsingHeader` per boss with display name, level, and HP percent.
- Initial expansion maps exactly from `ExpansionDefault`:
  - `ExpandAll` => open.
  - `CollapseAll` => closed.
  - `ExpandTargetedOnly` => open only for targeted boss.
- Cooldown rows use `BossState.Cooldowns` and `SkillCooldown.SkillIdx >= 1`.
- Sort by ETA ascending, where ready ETA is zero.
- Ready rows show `READY` in `Theme.Ready`; non-ready rows show remaining seconds clamped to zero.
- In Config Mode with no rows, render an interactive empty window containing `Cooldowns appear here for active bosses.`

- [ ] **Step 2: Wire into `BossModUi` and conductor**

Construct `CooldownWindow(_globals)` in `BossMod.cs`, pass to `BossModUi`, and call `_cooldowns.Render(frame)`.

- [ ] **Step 3: Verify boundary, build, and commit**

Search `mods/BossMod/Ui/CooldownWindow.cs` for forbidden patterns:

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
git add mods/BossMod/Ui/CooldownWindow.cs mods/BossMod/Ui/BossModUi.cs mods/BossMod/BossMod.cs
git commit -m "feat(bossmod): render cooldown groups from UI frames"
```

---

## Task 4: BuffTrackerWindow over UiFrame

**Files:**
- Create: `mods/BossMod/Ui/BuffTrackerWindow.cs`
- Modify: `mods/BossMod/Ui/BossModUi.cs`
- Modify: `mods/BossMod/BossMod.cs`

- [ ] **Step 1: Implement `BuffTrackerWindow`**

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
- Render an `On You` pseudo-section from `frame.PlayerBuffs`.
- Show only `PlayerBuffView.IsFromActiveBoss == true` rows outside Config Mode; in Config Mode, show non-active-source rows disabled with a `not from active boss` badge.
- Render one section per active boss from `BossState.Buffs`.
- Colors: aura => `Theme.Aura`, debuff => `Theme.Debuff`, otherwise `Theme.Buff`.
- Remaining time is clamped to zero using `BuffSnapshot.BuffTimeEnd - frame.ServerTime` for boss buffs and `PlayerBuffView.EndTime - frame.ServerTime` for player buffs.
- If `TotalBuffTime`/`TotalTime > 0`, show a progress bar; otherwise show text duration only.
- In Config Mode with no rows, render an interactive empty window with `Buffs and debuffs appear here for active bosses and the local player.`

- [ ] **Step 2: Wire into `BossModUi` and conductor**

Construct `BuffTrackerWindow(_globals)` in `BossMod.cs`, pass to `BossModUi`, and call `_buffs.Render(frame)`.

- [ ] **Step 3: Verify boundary, build, and commit**

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
git add mods/BossMod/Ui/BuffTrackerWindow.cs mods/BossMod/Ui/BossModUi.cs mods/BossMod/BossMod.cs
git commit -m "feat(bossmod): render buff tracker from UI frames"
```

---

## Task 5: Settings mutation boundary and Settings shell

**Files:**
- Create: `mods/BossMod/Ui/Settings/ISettingsMutator.cs`
- Create: `mods/BossMod/Ui/Settings/SettingsMutator.cs`
- Create: `mods/BossMod/Ui/SettingsWindow.cs`
- Modify: `mods/BossMod/Ui/BossModUi.cs`
- Modify: `mods/BossMod/BossMod.cs`

- [ ] **Step 1: Define patch records and mutator interface**

Create `mods/BossMod/Ui/Settings/ISettingsMutator.cs`:

```csharp
namespace BossMod.Ui.Settings;

public sealed record SkillOverridePatch(
    ThreatTier? UserThreat = null,
    string? Sound = null,
    string? AlertText = null,
    AlertTrigger? FireOn = null,
    bool? AudioMuted = null,
    bool ClearUserThreat = false,
    bool ClearSound = false,
    bool ClearAlertText = false,
    bool ClearFireOn = false,
    bool ClearAudioMuted = false);

public sealed record GlobalPatch(
    bool? Muted = null,
    float? MasterVolume = null,
    bool? AlertTextMuteOnMasterMute = null,
    float? ProximityRadius = null,
    float? UiScale = null,
    ExpansionDefault? ExpansionDefault = null,
    int? MaxCastBars = null,
    bool? ShowCastBarWindow = null,
    bool? ShowCooldownWindow = null,
    bool? ShowBuffTrackerWindow = null,
    bool? ConfigMode = null,
    IReadOnlyDictionary<string, string>? Hotkeys = null,
    Thresholds? Thresholds = null);

public interface ISettingsMutator
{
    bool SetSkillOverride(string skillId, SkillOverridePatch patch);
    bool SetBossSkillOverride(string bossId, string skillId, SkillOverridePatch patch);
    bool SetGlobal(GlobalPatch patch);
    bool ReplaceState(SkillCatalog catalog, Globals globals);
    bool ResetUserSettingsToDefaults();
}
```

- [ ] **Step 2: Implement `SettingsMutator`**

`SettingsMutator` takes references to the active `SkillCatalog` and `Globals`. Each method compares old/new values and returns `true` only if at least one persisted value changed. Clearing a nullable override sets that property to `null`. Setting empty `AlertText` is a real value meaning no overlay text, not inherit.

- [ ] **Step 3: Add a buildable Settings shell**

Create `mods/BossMod/Ui/SettingsWindow.cs` with a minimal tab shell that can be extended by later tasks:

```csharp
public sealed class SettingsWindow
{
    public bool Render(UiMode mode)
    {
        var changed = false;
        ImGui.SetNextWindowSize(new Vector2(720f, 520f), ImGuiCond.FirstUseEver);
        if (!ImGui.Begin("BossMod Settings"))
        {
            ImGui.End();
            return false;
        }

        if (ImGui.BeginTabBar("BossMod Settings Tabs"))
        {
            ImGui.TextDisabled("Settings tabs are added by subsequent Plan 4 tasks.");
            ImGui.EndTabBar();
        }

        ImGui.End();
        return changed;
    }
}
```

- [ ] **Step 4: Wire Settings into `BossModUi`**

`BossModUi` owns a `SettingsWindow`, exposes `ToggleSettings()`, and calls `_settings.Render(frame.Mode)` only when the Settings window is visible. The returned bool is ORed into `BossModUi.Render`'s dirty result.

`BossMod.cs` wires F8 in a later task; for now it only constructs the Settings shell and passes it to `BossModUi`.

- [ ] **Step 5: Build and commit**

Run:

```bash
dotnet run --project build-tool build
```

Expected: PASS.

Commit:

```bash
git add mods/BossMod/Ui/Settings/ISettingsMutator.cs mods/BossMod/Ui/Settings/SettingsMutator.cs mods/BossMod/Ui/SettingsWindow.cs mods/BossMod/Ui/BossModUi.cs mods/BossMod/BossMod.cs
git commit -m "feat(bossmod): add settings mutation boundary"
```

---

## Task 6: Skills and Bosses override tabs

**Files:**
- Create: `mods/BossMod/Ui/Tabs/SkillsTab.cs`
- Create: `mods/BossMod/Ui/Tabs/BossesTab.cs`
- Modify: `mods/BossMod/Ui/SettingsWindow.cs`

- [ ] **Step 1: Implement `SkillsTab.Render()`**

The tab keeps UI-only filter/selection state privately. Filter/selection changes return `false`. Persisted override changes call `_mutator.SetSkillOverride(...)` and OR the result into `changed`.

Required controls for each selected skill:

- `UserThreat` with inherit option.
- `Sound` with inherit option and preview button.
- `AlertText` with separate inherit control; empty string means overlay disabled.
- `FireOn` with inherit option.
- `AudioMuted` with inherit option.

Show resolved value/source badges using `SettingsResolver`; do not reimplement resolver logic.

- [ ] **Step 2: Implement `BossesTab.Render()`**

The tab keeps UI-only filter/selection state privately. Persisted boss-skill override changes call `_mutator.SetBossSkillOverride(...)`.

Required controls for each selected boss skill:

- `UserThreat` with inherit option.
- `Sound` with inherit option and preview button.
- `AlertText` with separate inherit control; empty string means overlay disabled.
- `FireOn` with inherit option.
- `AudioMuted` with inherit option.

The displayed resolved source order must be boss override -> skill override -> auto/default.

- [ ] **Step 3: Wire tabs into `SettingsWindow`**

Construct `SkillsTab` and `BossesTab` in `SettingsWindow`. In `Render`, add tab items for `Skills` and `Bosses`; each tab's returned `changed` value contributes to the SettingsWindow return value.

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
- Modify: `mods/BossMod/Ui/SettingsWindow.cs`
- Modify: `mods/BossMod/BossMod.cs`

- [ ] **Step 1: Expose sound inventory from `SoundBank`**

Ensure `SoundBank` exposes read-only inventory and load statuses:

```csharp
public IReadOnlyList<SoundEntry> Entries { get; }
public IReadOnlyList<SoundLoadResult> LoadResults { get; }
public void Rescan();
public const long MaxUserWavBytes = 5 * 1024 * 1024;
public const double MaxUserWavSeconds = 10.0;
```

`SoundLoadResult` must include file/name, status, and concise reason. Valid statuses include built-in, loaded, reserved-name skip, duplicate-name skip, invalid WAV, too large, and too long.

- [ ] **Step 2: Add `SoundPreview` service**

Create `mods/BossMod/Ui/Settings/SoundPreview.cs`:

```csharp
public sealed class SoundPreview
{
    private readonly SoundPlayer _player;
    private readonly Globals _globals;

    public SoundPreview(SoundPlayer player, Globals globals)
    {
        _player = player;
        _globals = globals;
    }

    public void Play(string soundName) => _player.Play(soundName, _globals);
}
```

Previewing a sound is not a persisted change.

- [ ] **Step 3: Implement `SoundsTab.Render()`**

The tab must:

- show built-in sounds first, then user sounds by case-insensitive name;
- show each load result with status and reason;
- provide `Preview` buttons for loaded sounds;
- provide `Rescan Sounds Folder`, which calls `SoundBank.Rescan()` and returns `false` because scan status is not persisted in v1;
- provide `Open Sounds Folder` through a conductor-provided `Action` so the tab does not compute user data paths itself;
- display exact limits from `SoundBank.MaxUserWavBytes` and `SoundBank.MaxUserWavSeconds`.

- [ ] **Step 4: Wire tab into SettingsWindow and conductor services**

Pass `SoundPreview`, `SoundBank`, sound folder path, and open-folder action into `SettingsWindow`. Wire `SoundsTab.Render()` return into SettingsWindow changed aggregation; it should normally return `false`.

- [ ] **Step 5: Build and commit**

Run:

```bash
dotnet run --project build-tool build
```

Expected: PASS.

Commit:

```bash
git add mods/BossMod/Ui/Tabs/SoundsTab.cs mods/BossMod/Ui/Settings/SoundPreview.cs mods/BossMod/Audio/SoundBank.cs mods/BossMod/Ui/SettingsWindow.cs mods/BossMod/BossMod.cs
git commit -m "feat(bossmod): add sound management settings"
```

---

## Task 8: General tab, Config Mode, and F8 hotkey

**Files:**
- Create: `mods/BossMod/Ui/Tabs/GeneralTab.cs`
- Create: `mods/BossMod/ConfigMode.cs`
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
Hotkeys["toggle_settings"]
```

Changing a control to the same value returns `false`. Config Mode checkbox is disabled when `!mode.InWorldScene` and shows `Config Mode is available only in World.`

- [ ] **Step 2: Implement centralized Config Mode policy**

Create `mods/BossMod/ConfigMode.cs` with a helper that produces `UiMode`/`WindowChrome` from `Globals.ConfigMode` and `inWorldScene`. CastBar, Cooldown, and BuffTracker become interactive only when both are true. AlertOverlay remains click-through in all modes.

If `Globals.ConfigMode` is true outside World, effective `UiMode.ConfigMode` must be false. If the implementation chooses to correct the persisted value to false, it must do so once and mark dirty once, not every frame.

- [ ] **Step 3: Implement F8 hotkey manager**

Create `mods/BossMod/HotkeyManager.cs` using `UnityEngine.InputSystem.Keyboard.current`. Required behavior:

- resolves `F1` through `F12` names;
- fires on key-down edge only;
- does not fire action hotkeys when `skipActions` is true because ImGui wants text input;
- default `toggle_settings` action toggles `BossModUi.ToggleSettings()`.

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
git add mods/BossMod/Ui/Tabs/GeneralTab.cs mods/BossMod/ConfigMode.cs mods/BossMod/HotkeyManager.cs mods/BossMod/Ui/SettingsWindow.cs mods/BossMod/Ui/BossModUi.cs mods/BossMod/BossMod.cs
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
    bool ExportTo(string path);
    StateActionResult ImportFrom(string path);
    StateActionResult ReloadActive();
    StateActionResult ResetUserSettingsToDefaults();
}

public readonly record struct StateActionResult(bool Changed, bool FlushImmediately, string Message);
```

- [ ] **Step 2: Implement `ExportImportTab.Render()`**

The tab must:

- show active state path;
- export to a user-entered path; successful export returns `false` because active state did not change;
- import from a user-entered path; successful import returns `Changed=true, FlushImmediately=true` when values differ;
- reload active state; if read status uses defaults due to missing/corrupt/unsupported state, display that status and return false unless the user explicitly resets;
- reset user settings to defaults without clearing discovered catalog records; button label is `Reset user settings to defaults`.

- [ ] **Step 3: Wire immediate flush in conductor**

When a state file action returns `FlushImmediately`, `BossMod.cs` must call:

```csharp
_flusher.MarkDirty();
_flusher.Flush();
```

Normal Settings changes still call only `MarkDirty()` and let debounce apply.

- [ ] **Step 4: Wire tab into SettingsWindow**

Add `Export / Import` tab. Its changed result contributes to SettingsWindow's returned `changed` value; immediate flush remains a conductor service responsibility.

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
SettingsMutator.ReplaceState
```

Expected: UI-only state changes return false; persisted mutations return true only when values actually differ; import/reset hard-flush only after changed state.

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
git add mods/BossMod/Ui/ mods/BossMod/BossMod.cs mods/BossMod/ConfigMode.cs mods/BossMod/HotkeyManager.cs
git commit -m "fix(bossmod): enforce UI settings boundaries"
```

If no edits were required, do not create an empty commit.

---

## Definition of Done

- [ ] `BossModUi` is the only application UI facade called by the renderer layout callback.
- [ ] CastBar, Cooldown, and BuffTracker windows render from `UiFrame` plus pure catalog/settings inputs only.
- [ ] Settings tabs return `true` only for actual persisted state changes.
- [ ] Skills and Bosses tabs expose `UserThreat`, `Sound`, `AlertText`, `FireOn`, and `AudioMuted` without collapsing inherit and empty-alert-text semantics.
- [ ] Sounds tab shows built-ins, user WAV load results, failure reasons, folder path, rescan, open-folder, and preview controls.
- [ ] Export/import/reload/reset distinguishes changed, unchanged, failed, debounced flush, and immediate flush.
- [ ] Config Mode is gated to World, renders a banner in World, and never makes `AlertOverlay` interactive.
- [ ] F8 toggles Settings with edge detection and does not fire while ImGui wants text input.
- [ ] Search under `mods/BossMod/Ui` finds no forbidden IL2CPP/game-singleton reads.
- [ ] `dotnet run --project build-tool build` passes after every committed task.

## Checkpoint

Pause after Task 10 and request review before starting Plan 5. Provide the build command result and the forbidden-read search result. Do not proceed to Plan 5 in the same execution session without review approval.
