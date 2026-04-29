# BossMod Plan 4 — Integration, Config Mode, Hotkeys, E2E

> **For agentic workers:** REQUIRED SUB-SKILL: Use skill://superpowers:subagent-driven-development (recommended) or skill://superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tie everything together. Replace plan 1's `ImGui.ShowDemoWindow` smoke test with the real overlays and settings UI. Add Config Mode, the F8 hotkey, debounced state-flushing, and run a live E2E pass to verify IL2CPP type access works and to tune threshold defaults from observed numbers.

**Architecture:** `BossMod.cs` is the conductor. On init it loads `state.json`, builds the Core stack (`SkillCatalog`, `Globals`, `AlertEngine`), the IL2CPP adapters (`MonsterWatcher`), the audio stack (`SoundBank`, `SoundPlayer`, `AlertSubscriber`), and the UI stack (all 5 windows). Per-frame: `MonsterWatcher.Tick` → diff prev/curr `BossState`s → `AlertEngine.Process` → `AlertSubscriber.Handle`. Per-OnGUI: render all overlays + Settings.

**Tech Stack:** Same as plans 1–3.

**Spec:** `docs/superpowers/specs/2026-04-29-bossmod-design.md`

**Depends on:** Plans 1, 2, 3 committed.

---

## File Structure

| Path | Responsibility | Status |
|---|---|---|
| `mods/BossMod/ConfigMode.cs` | Toggles `Locked` on overlays + renders the "CONFIG MODE" banner | Create |
| `mods/BossMod/HotkeyManager.cs` | Reads `Globals.Hotkeys`, polls InputSystem each frame, fires actions | Create |
| `mods/BossMod/StateFlusher.cs` | Debounced `state.json` write triggered by `MarkDirty()` | Create |
| `mods/BossMod/BossMod.cs` | Replace plan 1 stub with full wire-up | Modify |
| `mods/BossMod/CLAUDE.md` | Mod-specific docs | Create |

---

## Task 1: ConfigMode

**Files:**
- Create: `mods/BossMod/ConfigMode.cs`

`ConfigMode` toggles `Locked` on `CastBarWindow`, `CooldownWindow`, `BuffTrackerWindow`. `AlertOverlay` is always click-through (per spec). Active only in `World` scene; toggle disabled with a hint outside.

- [ ] **Step 1: Write file**

```csharp
using BossMod.Core.Persistence;
using BossMod.Ui;
using ImGuiNET;
using UnityEngine.SceneManagement;

namespace BossMod;

public sealed class ConfigMode
{
    private readonly Globals _globals;
    private readonly CastBarWindow _castBar;
    private readonly CooldownWindow _cooldown;
    private readonly BuffTrackerWindow _buffs;

    public ConfigMode(Globals globals, CastBarWindow castBar, CooldownWindow cooldown, BuffTrackerWindow buffs)
    {
        _globals = globals;
        _castBar = castBar;
        _cooldown = cooldown;
        _buffs = buffs;
    }

    /// <summary>Apply current Globals.ConfigMode + scene gating to overlay locks.</summary>
    public void ApplyLocks()
    {
        bool inWorld = SceneManager.GetActiveScene().name == "World";
        bool effective = _globals.ConfigMode && inWorld;
        _castBar.Locked  = !effective;
        _cooldown.Locked = !effective;
        _buffs.Locked    = !effective;
    }

    /// <summary>Render the "CONFIG MODE" banner if active. Click to exit.</summary>
    public void RenderBanner()
    {
        if (!_globals.ConfigMode) return;
        if (SceneManager.GetActiveScene().name != "World") return;

        var screenW = Il2Cpp.UnityEngine.Screen.width;
        ImGui.SetNextWindowPos(new System.Numerics.Vector2(screenW / 2f, 8),
            ImGuiCond.Always, new System.Numerics.Vector2(0.5f, 0));

        var flags = ImGuiWindowFlags.NoTitleBar | ImGuiWindowFlags.NoResize | ImGuiWindowFlags.NoMove
                  | ImGuiWindowFlags.AlwaysAutoResize | ImGuiWindowFlags.NoScrollbar;
        if (!ImGui.Begin("##bossmod_config_banner", flags)) { ImGui.End(); return; }

        ImGui.PushStyleColor(ImGuiCol.Text, new System.Numerics.Vector4(1f, 0.85f, 0.3f, 1f));
        ImGui.TextUnformatted("CONFIG MODE — drag windows to reposition");
        ImGui.PopStyleColor();
        ImGui.SameLine();
        if (ImGui.SmallButton("Exit"))
        {
            _globals.ConfigMode = false;
        }

        ImGui.End();
    }
}
```

- [ ] **Step 2: Update GeneralTab to surface the toggle**

In `mods/BossMod/Ui/Tabs/GeneralTab.cs`, after the existing checkboxes, add (right after the "Master mute" pair):

```csharp
        ImGui.Separator();

        // Config Mode
        var sceneOk = UnityEngine.SceneManagement.SceneManager.GetActiveScene().name == "World";
        bool config = _g.ConfigMode;
        if (!sceneOk) ImGui.BeginDisabled();
        if (ImGui.Checkbox("Config Mode (drag windows)", ref config)) _g.ConfigMode = config;
        if (!sceneOk)
        {
            ImGui.EndDisabled();
            ImGui.SameLine();
            ImGui.TextDisabled("(World scene only)");
        }
```

- [ ] **Step 3: Build, commit**

```bash
dotnet run --project build-tool build
git add mods/BossMod/ConfigMode.cs mods/BossMod/Ui/Tabs/GeneralTab.cs
git commit -m "feat(bossmod): add Config Mode toggle + banner"
```

---

## Task 2: HotkeyManager

**Files:**
- Create: `mods/BossMod/HotkeyManager.cs`

Reads hotkey strings from `Globals.Hotkeys` (e.g. `"F8"`) and polls the `Il2Cpp.UnityEngine.InputSystem.Keyboard.current` each frame, firing registered `Action`s on key-down edge.

For v1 only `toggle_settings` is bound by default. Future hotkeys (mute, individual window toggles, hot-reload) register through the same API.

- [ ] **Step 1: Write file**

```csharp
using System;
using System.Collections.Generic;
using BossMod.Core.Persistence;
using Il2Cpp.UnityEngine.InputSystem;
using Il2Cpp.UnityEngine.InputSystem.Controls;

namespace BossMod;

public sealed class HotkeyManager
{
    private readonly Globals _globals;
    private readonly Dictionary<string, Action> _bindings = new();
    private readonly Dictionary<string, bool> _wasPressed = new();

    public HotkeyManager(Globals globals) => _globals = globals;

    public void Register(string action, Action handler) => _bindings[action] = handler;

    public void Tick()
    {
        var keyboard = Keyboard.current;
        if (keyboard == null) return;

        foreach (var (action, keyName) in _globals.Hotkeys)
        {
            if (!_bindings.TryGetValue(action, out var handler)) continue;
            var control = ResolveControl(keyboard, keyName);
            if (control == null) continue;

            bool isPressed = control.isPressed;
            bool wasPressed = _wasPressed.TryGetValue(action, out var wp) && wp;
            if (isPressed && !wasPressed) handler();
            _wasPressed[action] = isPressed;
        }
    }

    private static KeyControl? ResolveControl(Keyboard k, string name) => name switch
    {
        "F1" => k.f1Key, "F2" => k.f2Key, "F3" => k.f3Key, "F4" => k.f4Key,
        "F5" => k.f5Key, "F6" => k.f6Key, "F7" => k.f7Key, "F8" => k.f8Key,
        "F9" => k.f9Key, "F10" => k.f10Key, "F11" => k.f11Key, "F12" => k.f12Key,
        _ => null
    };
}
```

> Note: Extending the resolver to letter keys / modifiers is a v2 polish item. F-keys cover the only default and are sufficient for plan 4.

- [ ] **Step 2: Build, commit**

```bash
dotnet run --project build-tool build
git add mods/BossMod/HotkeyManager.cs
git commit -m "feat(bossmod): add HotkeyManager with F-key resolver"
```

---

## Task 3: StateFlusher

**Files:**
- Create: `mods/BossMod/StateFlusher.cs`

Debounced state.json writer. `MarkDirty()` updates a "dirty since" timestamp. Each `Tick()` call (driven from `OnUpdate`) checks if `now - dirtyAt > 2s`, and if so, atomically writes via `StateJson.Write`. Hard flush on `Dispose`.

- [ ] **Step 1: Write file**

```csharp
using System;
using BossMod.Core.Catalog;
using BossMod.Core.Persistence;
using MelonLoader;

namespace BossMod;

public sealed class StateFlusher : IDisposable
{
    private readonly MelonLogger.Instance _log;
    private readonly SkillCatalog _catalog;
    private readonly Globals _globals;
    private readonly string _path;
    private DateTime? _dirtySince;
    private readonly TimeSpan _debounce = TimeSpan.FromSeconds(2);

    public StateFlusher(MelonLogger.Instance log, SkillCatalog catalog, Globals globals, string path)
    {
        _log = log;
        _catalog = catalog;
        _globals = globals;
        _path = path;
    }

    public void MarkDirty()
    {
        _dirtySince ??= DateTime.UtcNow;
    }

    /// <summary>Call from OnUpdate. Cheap when not dirty.</summary>
    public void Tick()
    {
        if (_dirtySince == null) return;
        if (DateTime.UtcNow - _dirtySince.Value < _debounce) return;
        Flush();
    }

    public void Flush()
    {
        try
        {
            StateJson.Write(_path, _catalog, _globals);
            _dirtySince = null;
        }
        catch (Exception ex)
        {
            _log.Warning($"state.json flush failed: {ex.Message}");
        }
    }

    public void Dispose()
    {
        if (_dirtySince != null) Flush();
    }
}
```

> Note: Triggering `MarkDirty()` from every Settings UI edit would require wiring through every checkbox/dropdown; instead we have `BossMod.cs` call `MarkDirty()` on every frame the SettingsWindow is open (cheap; the debounce coalesces it). Alternative: hash the catalog state and compare frame-to-frame. The "open = dirty" approach is simpler and correct enough.

- [ ] **Step 2: Build, commit**

```bash
dotnet run --project build-tool build
git add mods/BossMod/StateFlusher.cs
git commit -m "feat(bossmod): add debounced StateFlusher"
```

---

## Task 4: BossMod.cs end-to-end wire-up

**Files:**
- Modify: `mods/BossMod/BossMod.cs`

Replace the plan 1 demo-window stub with the real conductor. Wire-up order matters because of dependencies; comments in the code explain it.

- [ ] **Step 1: Replace `mods/BossMod/BossMod.cs`**

```csharp
using System.Collections.Generic;
using System.IO;
using BossMod.Audio;
using BossMod.Core.Alerts;
using BossMod.Core.Catalog;
using BossMod.Core.Effects;
using BossMod.Core.Persistence;
using BossMod.Core.Tracking;
using BossMod.Imgui;
using BossMod.Tracking;
using BossMod.Ui;
using MelonLoader;
using UnityEngine.SceneManagement;

[assembly: MelonInfo(typeof(BossMod.BossMod), "BossMod", "0.1.0", "ancient-kingdoms-mods")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace BossMod;

public class BossMod : MelonMod
{
    // Persistence
    private SkillCatalog _catalog = new();
    private Globals _globals = new();
    private string _statePath = "";
    private StateFlusher? _flusher;

    // Renderer
    private ImGuiRenderer? _renderer;

    // Logic
    private MonsterWatcher? _watcher;
    private AlertEngine? _alerts;
    private readonly Dictionary<uint, BossState> _prevStates = new();

    // Audio
    private SoundBank? _bank;
    private SoundPlayer? _player;
    private AlertSubscriber? _subscriber;

    // UI
    private CastBarWindow? _castBar;
    private CooldownWindow? _cooldown;
    private BuffTrackerWindow? _buffs;
    private AlertOverlay? _overlay;
    private SettingsWindow? _settings;
    private ConfigMode? _configMode;

    // Hotkeys
    private HotkeyManager? _hotkeys;

    public override void OnInitializeMelon()
    {
        var userData = Path.Combine(MelonUtils.UserDataDirectory, "BossMod");
        Directory.CreateDirectory(userData);
        _statePath = Path.Combine(userData, "state.json");

        // Load persisted state
        var (loadedCatalog, loadedGlobals) = StateJson.Read(_statePath);
        _catalog = loadedCatalog;
        _globals = loadedGlobals;

        // Renderer
        var iniPath = Path.Combine(userData, "imgui.ini");
        var cacheDir = Path.Combine(userData, "cache");
        _renderer = new ImGuiRenderer(LoggerInstance);
        if (!_renderer.Init(iniPath, cacheDir))
        {
            LoggerInstance.Error("Renderer init failed; mod disabled");
            _renderer = null;
            return;
        }

        // Audio
        _bank = new SoundBank(LoggerInstance, Path.Combine(userData, "Sounds"));
        _bank.Initialize();
        _player = new SoundPlayer(LoggerInstance, _bank);
        _player.Initialize();
        _player.MasterMute = _globals.Muted;

        // UI windows
        _castBar = new CastBarWindow(_catalog, _globals);
        _cooldown = new CooldownWindow(_catalog, _globals);
        _buffs = new BuffTrackerWindow(_catalog, _globals);
        _overlay = new AlertOverlay(_globals);
        _settings = new SettingsWindow(_catalog, _globals, _bank, _player, _statePath);

        _configMode = new ConfigMode(_globals, _castBar, _cooldown, _buffs);

        // Logic
        _watcher = new MonsterWatcher(LoggerInstance, _catalog, _globals);

        var defaults = new TierDefaults();   // built-in tone names match defaults
        _alerts = new AlertEngine(_catalog, defaults);
        _subscriber = new AlertSubscriber(_player, _overlay, _catalog);

        // Hotkeys
        _hotkeys = new HotkeyManager(_globals);
        _hotkeys.Register("toggle_settings", () => _settings.Open = !_settings.Open);

        // Persistence
        _flusher = new StateFlusher(LoggerInstance, _catalog, _globals, _statePath);

        // ImGui layout callback — runs per OnGUI Repaint
        _renderer.OnLayout = OnLayout;

        LoggerInstance.Msg("BossMod initialized");
    }

    public override void OnUpdate()
    {
        if (_renderer == null) return;

        _hotkeys?.Tick();

        // Master-mute updated by GeneralTab; sync to player each frame (cheap)
        if (_player != null) _player.MasterMute = _globals.Muted;

        // Snapshot bosses
        _watcher!.Tick();

        // Diff per monster, emit AlertEvents
        if (_alerts != null && _subscriber != null)
        {
            var current = _watcher.CurrentSnapshots;
            var seen = new HashSet<uint>();
            foreach (var curr in current)
            {
                seen.Add(curr.NetId);
                if (_prevStates.TryGetValue(curr.NetId, out var prev))
                {
                    foreach (var ev in _alerts.Process(prev, curr))
                        _subscriber.Handle(ev);
                }
                _prevStates[curr.NetId] = curr;
            }
            // Drop states for monsters no longer tracked
            var stale = new List<uint>();
            foreach (var k in _prevStates.Keys) if (!seen.Contains(k)) stale.Add(k);
            foreach (var k in stale) _prevStates.Remove(k);
        }

        // Mark dirty whenever Settings is open (covers user edits without per-control wiring)
        if (_settings?.Open == true) _flusher?.MarkDirty();
        _flusher?.Tick();
    }

    private void OnLayout()
    {
        // Apply Config Mode locks each frame so toggle takes effect immediately
        _configMode?.ApplyLocks();

        // Overlays
        var states = _watcher?.CurrentSnapshots ?? new List<BossState>();
        _castBar?.Render(states);
        _cooldown?.Render(states);
        _buffs?.Render(states);
        _overlay?.Render();

        // Settings + Config banner (drawn last so they're on top)
        _settings?.Render();
        _configMode?.RenderBanner();
    }

    public override void OnGUI() => _renderer?.OnGUI();

    public override void OnDeinitializeMelon()
    {
        _flusher?.Dispose();    // hard flush
        _renderer?.Dispose();
    }
}
```

- [ ] **Step 2: Build**

```bash
dotnet run --project build-tool build
```

Expected: builds clean.

- [ ] **Step 3: Deploy and run smoke**

Close game, then:

```bash
dotnet run --project build-tool all
```

Launch game.

- [ ] **Step 4: Verification (in main menu)**

| Check | How |
|---|---|
| Init succeeded | Log shows `BossMod initialized`, `ImGui.NET initialized` |
| F8 toggles Settings | Press F8 — Settings window appears/disappears |
| Settings shows zero skills | Tabs render; Skills/Bosses tables empty |
| Sounds tab plays builtins | Click Play next to "critical" — audible chime |
| state.json appears | After ~3s of editing in Settings, `UserData/BossMod/state.json` exists |

If any check fails, debug **before** moving to the in-world pass.

- [ ] **Step 5: Commit**

```bash
git add mods/BossMod/BossMod.cs
git commit -m "feat(bossmod): wire all layers in BossMod.cs (foundation E2E)"
```

---

## Task 5: In-world IL2CPP verification pass

This task is **observation + small fixes**, not new code. Goal: verify every IL2CPP type access in `MonsterWatcher` / `Activation` / `SkillSnapshotBuilder` / `EffectiveSnapshotBuilder` resolves correctly against the live game. Findings during this pass produce small fixup commits.

- [ ] **Step 1: Log into a character, find an Elite or Boss**

Move to a known elite spawn (consult `exported-data/monsters.json` for `is_elite: true` entries) and stand within proximity radius (30 m default).

- [ ] **Step 2: Open Settings → Bosses tab**

Expected: the boss appears in the table grouped by zone, with at least its default attack and one or more abilities listed.

- [ ] **Step 3: Engage**

Attack the elite. Watch:

| Check | What to confirm |
|---|---|
| Cooldown window appears | Lists the boss's special skills with ETA bars |
| Buff tracker section opens | Shows any buffs the boss casts on itself (often passive auras) |
| Cast bar appears on cast | When boss casts, top-of-screen bar shows skill name + countdown |
| Audio fires on CastStart | Default chime audible on first cast |
| Settings → Bosses → \[boss\] → \[skill\] | `auto: <tier>` reflects the classifier's verdict |

If any IL2CPP type access throws (`InvalidCastException`, `NullReferenceException`), capture the stack trace from `MelonLoader/Latest.log` and fix the offending field/cast. Common patterns:

- `monster.skills.skills[i].data is Il2Cpp.AreaDamageSkill` may not work in IL2CPP. Replace with `monster.skills.skills[i].data?.TryCast<Il2Cpp.AreaDamageSkill>() != null` (then assign).
- `LinearInt`/`LinearFloat` field access (`baseValue`) is a struct property — should work but if it throws, use `.Get(level)` instead.
- `Il2CppSystem.Object[]` from `FindObjectsOfType` may need `.Cast<Il2Cpp.Monster>()` at every iteration; the existing `MonsterWatcher` does this.

- [ ] **Step 4: Capture observations into commits**

For each fix:

```bash
# Example fixup commit pattern
git add mods/BossMod/Tracking/SkillSnapshotBuilder.cs
git commit -m "fix(bossmod): use TryCast for AreaDamageSkill detection in IL2CPP"
```

- [ ] **Step 5: Confirm Activation gate works**

Walk far away from the elite (>30 m). Wait for `aggroList` to clear (combat exit). Within 60 s:
- The boss should drop out of all overlays.
- Catalog entries persist (Settings → Bosses still lists it).

Walk back into proximity:
- The boss should reappear in overlays even without engaging.

Engage from far away with a ranged skill. Confirm:
- The boss appears in overlays even if outside proximity (engaged branch).

---

## Task 6: Threshold tuning pass

The `Thresholds` defaults from plan 2 (`CriticalDamage = 200`, `HighDamage = 80`, `AuraDpsHigh = 30`, `CriticalCastTime = 3.0`) are placeholders. This task tunes them by observing real numbers.

- [ ] **Step 1: Engage 3 different elites of different levels and 2 bosses**

For each:
- Open Settings → Bosses → \[boss\] → \[skill\] for each ability.
- Note `auto: <tier>` and the `EffectiveSnapshot.OutgoingDamage` (visible in the snapshot section once we surface it; if not yet surfaced, log via temporary `LoggerInstance.Msg($"...")` calls in `EffectiveSnapshotBuilder` and remove afterward).

- [ ] **Step 2: Capture target distribution**

Goal: most damage AOEs end up `High` or `Critical`; most single-target attacks end up `Medium`; most self-buffs end up `Low`. If everything is `Medium`, threshold values are too high; if everything is `Critical`, they're too low.

- [ ] **Step 3: Adjust `Thresholds` defaults**

In `mods/BossMod.Core/Catalog/Thresholds.cs`, update the default initializer values to match the observed mid-range:

```csharp
public int CriticalDamage { get; set; } = <observed-critical-floor>;
public int HighDamage { get; set; } = <observed-high-floor>;
public int AuraDpsHigh { get; set; } = <observed-aura-floor>;
public float CriticalCastTime { get; set; } = <observed-long-cast>;
```

- [ ] **Step 4: Delete observation logs**

Strip any temporary `LoggerInstance.Msg` calls added in Step 1.

- [ ] **Step 5: Commit tuning**

```bash
git add mods/BossMod.Core/Catalog/Thresholds.cs
git commit -m "tune(bossmod): set ThreatClassifier defaults from observed encounters"
```

---

## Task 7: mod-level CLAUDE.md

**Files:**
- Create: `mods/BossMod/CLAUDE.md`

- [ ] **Step 1: Write file**

```markdown
# BossMod

DBM-style boss-encounter helper. Uses ImGui.NET for UI; auto-discovers monsters and skills as the player encounters them.

## Architecture

```
mods/BossMod/         # IL2CPP-touching adapters + UI + audio + renderer
mods/BossMod.Core/    # Pure C# library (no IL2CPP refs); host-testable
tests/BossMod.Core.Tests/  # xunit tests for pure logic
```

`BossMod.Core` holds the data shapes (`SkillCatalog`, `BossState`), pure formulas (`EffectiveValues`), threat classifier, settings resolver, alert engine edge-detection, WAV header parser, and JSON persistence. Everything in Core is host-testable and has unit tests.

`BossMod` (this directory) holds:
- `Imgui/` — ImGui.NET renderer ported for IL2CPP/MelonLoader. Loads embedded `cimgui.dll` via `LoadLibrary`. Renders draw lists through Unity `CommandBuffer` + `DrawMesh`.
- `Tracking/` — `MonsterWatcher` reads live `Il2Cpp.Monster` SyncVars each frame and produces `BossState` snapshots; `Activation` is the engaged ∪ proximate gate.
- `Audio/` — `SoundBank` synthesizes built-in tones and loads user WAVs from `UserData/BossMod/Sounds/*.wav`. `SoundPlayer` is one hidden `GameObject` + `AudioSource` with anti-spam.
- `Ui/` — five ImGui windows. CastBar, Cooldown, BuffTracker, AlertOverlay are click-through in normal mode; Settings is normal.
- `BossMod.cs` — `MelonMod` entry; conductor.

## State persistence

`UserData/BossMod/state.json` (single file, atomically written). Schema versioned. Hand-editing not expected; all config is in-game.

`UserData/BossMod/imgui.ini` — ImGui's own window-state file (positions, sizes, collapsed state).

`UserData/BossMod/Sounds/*.wav` — user-supplied WAVs (16-bit PCM mono or stereo). Auto-discovered on startup and via the Sounds tab's Rescan button.

## Hotkeys (defaults; rebindable in Settings → General)

- `F8` — Toggle Settings window

That's it. Every other action is a button or checkbox in Settings.

## Activation rule

A boss/elite is **active** (renders in overlays + fires alerts) when:

- it has aggro on you, your party, your pets/mercenaries, OR
- you have it as your current target, OR
- it's within `proximity_radius` (default 30 m, slider).

Catalog discovery is **not** gated on activation — every boss/elite walked past is registered.

## Adding new windows or features

1. If pure logic, put it in `mods/BossMod.Core` and add unit tests in `tests/BossMod.Core.Tests/`.
2. If IL2CPP-touching, put it in `mods/BossMod/Tracking|Audio|Ui` and validate by in-game observation.
3. New UI windows go in `Ui/`. Follow the click-through-in-normal-mode pattern; Config Mode owns the lock toggle.
4. New per-skill or per-(boss, skill) settings go on `SkillRecord` or `BossSkillRecord` as nullable properties (null = inherit). Update `SettingsResolver` and `SkillsTab` / `BossesTab` editors.

## Testing

- Pure logic: `dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj`
- IL2CPP / rendering: in-game observation. Use HotRepl for fast iteration:
  ```bash
  dotnet run --project build-tool hotrepl-deploy
  dotnet run --project build-tool hotrepl-launch
  ```

## Specs and plans

- `docs/superpowers/specs/2026-04-29-bossmod-design.md` — design spec
- `docs/superpowers/plans/2026-04-29-bossmod-{1..4}-*.md` — implementation plans
```

- [ ] **Step 2: Commit**

```bash
git add mods/BossMod/CLAUDE.md
git commit -m "docs(bossmod): add mod-level CLAUDE.md"
```

---

## Definition of done

- F8 toggles Settings; all five tabs render and are functional.
- In-world: cast bars, cooldowns, buff tracker, alerts all paint correctly during a real elite/boss fight.
- Audio fires on CastStart events; master mute and per-skill mute both honored.
- Config Mode toggle in Settings → General unlocks overlays for repositioning; banner appears top-center; positions persist via `imgui.ini`.
- `state.json` round-trips: kill the game, restart, observed catalog and tunings preserved.
- All unit tests in `BossMod.Core.Tests` green.
- IL2CPP type access verified for at least 3 different elites and 2 bosses without crashes.
- Thresholds defaults updated from observation, not the placeholder 200/80/30/3.0 values.
- `mods/BossMod/CLAUDE.md` documents the architecture for future maintainers.

## Acceptance commands

These run after all tasks in this plan complete (not per-task):

```bash
# Build everything (mods + tests)
dotnet run --project build-tool build
dotnet build tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj

# Run pure tests
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj

# Deploy
dotnet run --project build-tool all

# In-game: launch, engage 1+ elite, confirm cast bar + alerts.
```

## Future work (not gating v1)

- Threat / aggro list HUD (data already in `Monster.aggroList`).
- Encounter timeline / pull tracker.
- Network-aware alerts (broadcast cast warnings to party members via Mirror RPC).
- Custom font (Roboto) instead of ProggyClean default.
- Per-(boss, skill) snapshot view in Settings UI (currently shown in Skills tab; could be richer).
- Threat tier rule iteration based on player feedback (hold off until v1 has shipped to actual users).
