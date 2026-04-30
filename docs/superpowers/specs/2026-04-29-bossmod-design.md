# BossMod Design

**Status:** Refresh approved for implementation planning
**Date:** 2026-04-29
**Owner:** mods/

## Goal

BossMod is a DBM-style boss-encounter helper for Ancient Kingdoms, rendered with ImGui.NET. It surfaces boss cast bars, per-ability cooldown timers, buff/debuff trackers, and configurable audio plus on-screen alerts. It auto-discovers monsters and skills from live SyncVars as the player encounters them; it does not depend on a static data export. All configuration is in-game through ImGui Settings windows and persists to one `UserData/BossMod/state.json` file.

## Non-goals for v1

- Threat/aggro-list HUD.
- Encounter timeline/pull tracker.
- Custom replacements for the game's ground warning circles.
- Multi-boss raid-frame HUD beyond grouped sections in existing windows.
- Network/party broadcast alerts.
- Static exported-data dependency for runtime behavior.

## Current implementation facts

These facts supersede older drafts and must be treated as the canonical implementation baseline.

- The mod runs under MelonLoader net6 against IL2CPP Unity 6000.3.x via CrossOver.
- Unity-generated assemblies expose Unity types under bare `UnityEngine.*` and `UnityEngine.InputSystem.*`. Use `Il2Cpp.*` only for Assembly-CSharp game types such as `Player`, `Monster`, `Skill`, `NetworkManagerMMO`, and `DamageType`.
- User data path is `MelonLoader.Utils.MelonEnvironment.UserDataDirectory`.
- `cimgui.dll` is embedded from the ImGui.NET 1.89.1 NuGet cache as `BossMod.cimgui.dll`; no native binary is checked into the repo.
- `mods/BossMod/ILRepack.targets` merges ImGui.NET and BossMod.Core into `BossMod.dll` and strips copied NuGet `runtimes/` assets so MelonLoader does not try to load native cimgui as a managed mod.
- `mods/BossMod.Core` is pure C# and contains no IL2CPP or Unity references.
- `mods/BossMod` contains IL2CPP adapters, Unity audio, ImGui UI, renderer, and the MelonMod conductor.
- Runtime skill discovery reads live `monster.skills.skills` entries, not static templates, because live `Skill` instances carry per-instance level, cooldown index, `castTimeEnd`, and `cooldownEnd`.
- `Party` is a struct; empty party is represented by `party.members == null`.
- IL2CPP wrapper reference equality is unreliable across casts; compare game entities by `netId`.
- `AreaBuffSkill.isAura` exists on `AreaBuffSkill`, not on `BuffSkill`.
- `ScriptableSkill` subclass detection uses `TryCast<T>()` precedence chains.
- ImGui.NET 1.89.1 lacks `ImGuiKey.Mod*` aliases; use left/right modifier keys.
- Keyboard text input events are generated as `keyboard.add_onTextInput(handler)` / `remove_onTextInput(handler)` methods, not C# events.

## Architecture overview

BossMod uses a small vertical architecture: game adapters read live state, Core decides policy and persistence, UI/audio are consumers, and `BossMod.cs` is the only conductor.

```text
                 +-----------------------------+
                 |          BossMod.cs          |
                 | lifecycle / conductor only   |
                 +--------------+--------------+
                                |
        +-----------------------+------------------------+
        |                        |                        |
        v                        v                        v
+---------------+        +---------------+        +---------------+
| Tracking      |        | BossMod.Core  |        | UI / Audio    |
| IL2CPP reads  |        | pure logic    |        | Unity/ImGui   |
+---------------+        +---------------+        +---------------+
| MonsterWatcher| -----> | SkillCatalog  | -----> | Settings UI   |
| PlayerContext |        | AlertEngine   | -----> | AlertOverlay  |
| UiFrame build |        | StateJson     |        | SoundPlayer   |
+---------------+        | StateFlusher  |        | SoundBank     |
                         | WAV/rate/tone |        +---------------+
                         +---------------+
```

Data flows one way during normal play:

```text
Mirror SyncVars / SyncLists
        |
        v
MonsterWatcher / PlayerContextBuilder
        |                         \
        | catalogChanged           \ UiFrame
        v                           v
SkillCatalog ---------------> UI windows
        |
        v
AlertEngine -- AlertEvent --> AlertSubscriber --> SoundPlayer
                                      |
                                      v
                                AlertOverlay
```

Design rules:

- UI never probes IL2CPP game singletons directly.
- Audio and overlay consumers do not re-resolve settings inheritance.
- Core emits post-policy `AlertEvent`s, not raw transitions.
- Dirty tracking is truthful: mark dirty only when persisted state actually changed.
- Every committed implementation slice must build; no intentionally build-broken intermediate commits.

## File structure

```text
mods/BossMod/
├── BossMod.cs                    # MelonMod conductor: init, update, layout, teardown
├── BossMod.csproj                # ImGui.NET, ILRepack, IL2CPP/Unity refs, cimgui resource
├── ILRepack.targets              # Merge managed deps, strip native runtime assets
├── Imgui/                        # ImGui backend only
│   ├── ImGuiRenderer.cs          # cimgui load, context, ini path, lifecycle
│   ├── ImGuiRenderer.FontAtlas.cs
│   ├── ImGuiRenderer.Input.cs
│   ├── ImGuiRenderer.Render.cs
│   ├── ImGuiRenderer.TextInput.cs
│   └── CimguiNative.cs
├── Tracking/                     # IL2CPP adapters; no rendering
│   ├── MonsterWatcher.cs         # monster scan, catalog harvest, BossState snapshots
│   ├── Activation.cs             # engaged union proximate gate
│   ├── SkillSnapshotBuilder.cs
│   ├── EffectiveSnapshotBuilder.cs
│   ├── PlayerContextBuilder.cs   # target boss id, player buffs, player position
│   └── UiFrameBuilder.cs         # pure frame input assembled from current snapshots
├── Audio/                        # Unity audio wrappers
│   ├── SoundBank.cs              # built-ins + user WAV AudioClip creation
│   ├── SoundPlayer.cs            # hidden GameObject + AudioSource + cleanup
│   └── AlertSubscriber.cs        # thin dispatcher: AlertEvent -> audio/overlay
├── Ui/                           # ImGui windows over UiFrame/catalog/globals only
│   ├── BossModUi.cs              # owns window instances; renders one frame
│   ├── UiFrame.cs                # view input classes used by all windows
│   ├── Theme.cs
│   ├── WindowChrome.cs           # centralized normal/config-mode flags
│   ├── CastBarWindow.cs
│   ├── CooldownWindow.cs
│   ├── BuffTrackerWindow.cs
│   ├── AlertOverlay.cs
│   ├── SettingsWindow.cs
│   └── Tabs/
│       ├── SkillsTab.cs
│       ├── BossesTab.cs
│       ├── SoundsTab.cs
│       ├── GeneralTab.cs
│       └── ExportImportTab.cs
├── HotkeyManager.cs              # InputSystem edge detection
└── CLAUDE.md                     # mod-specific maintenance guide

mods/BossMod.Core/
├── Catalog/                      # persistent catalog records and snapshots
├── Tracking/                     # pure snapshot records consumed by Core/UI
├── Effects/                      # formulas, threat classifier, settings resolver
├── Alerts/                       # AlertEngine + AlertEvent
├── Audio/                        # WAV parser, tone synthesis, sound rate limiter
└── Persistence/                  # Globals, StateJson, StateFlusher

tests/BossMod.Core.Tests/         # host-side xunit tests for pure logic
```

Files may be introduced incrementally, but their responsibilities should remain as above.

## Core domain model

### Catalog records

```csharp
public sealed class SkillRecord
{
    public string Id { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public DateTime FirstSeenUtc { get; set; }
    public string LastSeenInBoss { get; set; } = "";
    public SkillSnapshot RawSnapshot { get; set; } = new();

    // Skill-level overrides. null means inherit.
    public ThreatTier? UserThreat { get; set; }
    public string? Sound { get; set; }
    public string? AlertText { get; set; }
    public AlertTrigger? FireOn { get; set; }
    public bool? AudioMuted { get; set; }
}

public sealed class BossRecord
{
    public string Id { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string Type { get; set; } = "";
    public string Class { get; set; } = "";
    public string ZoneBestiary { get; set; } = "";
    public BossKind Kind { get; set; } = BossKind.Boss;
    public int LastSeenLevel { get; set; }
    public DateTime FirstSeenUtc { get; set; }
    public DateTime LastSeenUtc { get; set; }
    public Dictionary<string, BossSkillRecord> Skills { get; set; } = new();
}

public sealed class BossSkillRecord
{
    public BossSkillSnapshot EffectiveSnapshot { get; set; } = new();
    public ThreatTier AutoThreat { get; set; } = ThreatTier.Low;

    // Boss-level overrides. Wins over SkillRecord. null means inherit.
    public ThreatTier? UserThreat { get; set; }
    public string? Sound { get; set; }
    public string? AlertText { get; set; }
    public AlertTrigger? FireOn { get; set; }
    public bool? AudioMuted { get; set; }

    public DateTime LastObservedUtc { get; set; }
}
```

`AudioMuted` replaces the ambiguous old `Muted` meaning. It suppresses sound playback only. Visual alert suppression is represented by empty alert text and by the global `AlertTextMuteOnMasterMute` setting.

### Enumerations

```csharp
public enum ThreatTier { Low, Medium, High, Critical }
public enum AlertTrigger { CastStart, CastFinish, CooldownReady }
public enum BossKind { Boss, Elite, Fabled, WorldBoss }
public enum DamageType { Normal, Magic, Fire, Cold, Poison, Disease }
public enum ExpansionDefault { ExpandTargetedOnly, ExpandAll, CollapseAll }

[Flags]
public enum DebuffKind
{
    None = 0,
    Stun = 1,
    Fear = 2,
    Blindness = 4,
    Mezz = 8,
    Poison = 16,
    Disease = 32,
    Fire = 64,
    Cold = 128,
}
```

`ExpansionDefault` should be an enum, not a free string. It serializes with the existing `JsonStringEnumConverter`.

### Globals

```csharp
public sealed class Globals
{
    public Thresholds Thresholds { get; set; } = new();
    public float ProximityRadius { get; set; } = 30f;
    public float UiScale { get; set; } = 1.0f;

    public bool Muted { get; set; }
    public float MasterVolume { get; set; } = 1.0f;
    public bool AlertTextMuteOnMasterMute { get; set; } = true;

    public ExpansionDefault ExpansionDefault { get; set; } = ExpansionDefault.ExpandTargetedOnly;
    public int MaxCastBars { get; set; } = 3;

    public Dictionary<string, string> Hotkeys { get; set; } = new()
    {
        ["toggle_settings"] = "F8",
    };

    public bool ShowCastBarWindow { get; set; } = true;
    public bool ShowCooldownWindow { get; set; } = true;
    public bool ShowBuffTrackerWindow { get; set; } = true;
    public bool ConfigMode { get; set; }
}
```

Master mute and master volume are persisted in `Globals`. `SoundPlayer` consumes current global settings; it is not an independent settings owner.

## Tracking and catalog discovery

`MonsterWatcher` runs only in the `World` scene. Outside `World`, it clears current snapshots and reports no current bosses. It uses the existing cached scan pattern: refresh `Object.FindObjectsOfType(Il2CppType.Of<Monster>())` on scene entry or large player teleport, then iterate the cached array each update.

For each cached live boss/elite with health > 0:

1. Harvest/refresh catalog data from live `monster.skills.skills`.
2. Build a fresh `BossState` snapshot.
3. Set `BossState.IsActive` using the activation gate.
4. Return whether persisted catalog state changed.

Discovery is not gated on activation. Active state controls overlays and alert eligibility only.

### Changed tracking for discovery

Catalog harvesting must report meaningful persisted changes so discovery survives even if Settings is never opened.

A change should be reported when:

- A new `SkillRecord`, `BossRecord`, or `BossSkillRecord` is created.
- Display metadata changes.
- `RawSnapshot`, `EffectiveSnapshot`, or `AutoThreat` changes.
- User-owned override fields are modified through Settings/import.

A change should not be reported merely because an internal timestamp is refreshed every frame. If `LastObservedUtc` must persist, update it only on first sight or on a coarse interval, not every tick.

### BossState

`BossState` is a frame snapshot owned by tracking. UI and Core must treat it as read-only.

```csharp
public sealed class BossState
{
    public uint NetId { get; set; }
    public string BossId { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public int Level { get; set; }
    public BossKind Kind { get; set; }

    public float PositionX { get; set; }
    public float PositionY { get; set; }
    public float DistanceToPlayer { get; set; }
    public bool IsTargeted { get; set; }

    public int HealthCurrent { get; set; }
    public int HealthMax { get; set; }

    public CastInfo? ActiveCast { get; set; }
    public List<SkillCooldown> Cooldowns { get; set; } = new();
    public List<BuffSnapshot> Buffs { get; set; } = new();

    public double ServerTime { get; set; }
    public bool IsActive { get; set; }
}
```

`DistanceToPlayer` and `IsTargeted` are pure view data populated by tracking/conductor code. UI must not compute them by reading `Il2Cpp.Player.localPlayer`.

## Activation

A boss/elite is active when:

```text
World scene
AND health.current > 0
AND (
  explicitly targeted by local player
  OR aggroList contains local player netId
  OR aggroList contains local player's pet/mercenary netId
  OR aggroList contains party member netId
  OR aggroList contains party member pet/mercenary netId
  OR 2D distance to local player <= Globals.ProximityRadius
)
```

Use 2D X/Y distance, matching current isometric coordinate assumptions.

Activation has two effects:

- Active bosses render in CastBar/Cooldown/Buff windows.
- Active bosses are eligible for alert emission.

Catalog discovery still runs for visible boss/elite instances regardless of activation.

## Alert semantics

`AlertEngine` is pure Core logic and owns alert policy.

```text
prev BossState + curr BossState
    |
    v
AlertEngine
  - if curr.IsActive == false: emit nothing
  - detect transition
  - dedupe per (netId, skillIdx, relevant deadline)
  - resolve threat/sound/text/fireOn/audioMuted
  - filter by FireOn
  - emit AlertEvent
```

`AlertEvent` represents a post-policy, user-actionable alert. It is not a raw transition.

```csharp
public readonly record struct AlertEvent(
    AlertTrigger Trigger,
    uint MonsterNetId,
    string BossId,
    string BossDisplayName,
    string SkillId,
    string SkillDisplayName,
    ThreatTier EffectiveThreat,
    string EffectiveSound,
    string EffectiveAlertText,
    bool AudioMuted,
    double ServerTimeAtEvent);
```

Resolution order:

```text
threat     = BossSkill.UserThreat   ?? Skill.UserThreat   ?? BossSkill.AutoThreat
sound      = BossSkill.Sound        ?? Skill.Sound        ?? TierDefaults.SoundFor(threat)
alertText  = BossSkill.AlertText    ?? Skill.AlertText    ?? "{DisplayName}!"
fireOn     = BossSkill.FireOn       ?? Skill.FireOn       ?? CastStart
audioMuted = BossSkill.AudioMuted   ?? Skill.AudioMuted   ?? false
```

`AlertEngine` emits only when `trigger == fireOn`. Audio and overlay consumers do not re-open the catalog and do not re-resolve inheritance.

### Transition detection

```text
CastStart:
  prev.ActiveCast == null
  curr.ActiveCast != null
  castTimeEnd value has not already fired for (netId, skillIdx)

CastFinish:
  prev.ActiveCast != null
  curr.ActiveCast == null
  previous cast appears to have naturally reached deadline

CooldownReady:
  prev cooldownEnd > prev.serverTime
  curr cooldownEnd <= curr.serverTime
  cooldownEnd value did not change between prev and curr
  cooldownEnd value has not already fired for (netId, skillIdx)
```

CastFinish is best-effort because long frame stalls can make a natural finish resemble a cancellation. The conservative rule is: suppress ambiguous CastFinish rather than emit a plausible lie.

### AlertEngine lifecycle

`AlertEngine` stores dedupe dictionaries. It should expose either:

```csharp
public void Reset();
```

or:

```csharp
public void PruneToActiveNetIds(IEnumerable<uint> netIds);
```

The conductor calls this on scene changes/World exit so stale netIds do not influence future encounters.

## Alert subscribers

`AlertSubscriber` is intentionally thin:

```text
Handle(AlertEvent ev):
  if !ev.AudioMuted:
      SoundPlayer.Play(ev.EffectiveSound)
  if ev.EffectiveAlertText is not empty:
      AlertOverlay.Push(ev)
```

It may also honor global text suppression by checking `Globals.Muted && Globals.AlertTextMuteOnMasterMute`, but it must not resolve per-skill inheritance or decide FireOn eligibility.

For tests, either keep it trivial enough for integration smoke coverage or inject tiny sink interfaces:

```csharp
public interface IAlertAudioSink { void Play(string soundName); }
public interface IAlertOverlaySink { void Push(AlertEvent ev); }
```

## UI frame and rendering boundary

UI windows render over a pure `UiFrame`. They do not access `Il2Cpp.*`, `UnityEngine.Object.FindObjectOfType`, `Player.localPlayer`, `NetworkManagerMMO`, or `NetworkTime`.

```csharp
public sealed class UiFrame
{
    public IReadOnlyList<BossState> Bosses { get; }
    public string TargetedBossId { get; }
    public double ServerTime { get; }
    public double UnscaledNow { get; }
    public IReadOnlyList<PlayerBuffView> PlayerBuffs { get; }
    public UiMode Mode { get; }
}

public enum PlayerBuffSourceStatus
{
    SourceUnknown,
    FromActiveBoss,
    NotFromActiveBoss,
}

public sealed class PlayerBuffView
{
    public string SkillId { get; }
    public string DisplayName { get; }
    public double EndTime { get; }
    public double TotalTime { get; }
    public bool IsDebuff { get; }
    public bool IsAura { get; }
    public PlayerBuffSourceStatus SourceStatus { get; }
}

public readonly record struct UiMode(
    bool InWorldScene,
    bool ConfigMode,
    WindowChrome CastBarChrome,
    WindowChrome CooldownChrome,
    WindowChrome BuffTrackerChrome,
    WindowChrome AlertChrome);

public readonly record struct WindowChrome(
    bool ClickThrough,
    bool ShowTitleBar,
    bool ShowBackground,
    bool Movable,
    bool Resizable,
    bool ShowConfigOutline);
```

`PlayerContextBuilder` reads IL2CPP local player state and produces target id, player buffs, and server time. `MonsterWatcher` supplies pure boss distance/target data. `UiFrameBuilder` combines those values with `MonsterWatcher.CurrentSnapshots` and `Globals`. Player-buff source status must be source-valid; it must not claim a boss source from `SkillId` alone.

Render signatures:

```csharp
public void CastBarWindow.Render(UiFrame frame);
public void CooldownWindow.Render(UiFrame frame);
public void BuffTrackerWindow.Render(UiFrame frame);
public void AlertOverlay.Render(double unscaledNow);
public UiRenderResult SettingsWindow.Render(UiMode mode);
```

`BossModUi` owns window instances:

```csharp
public sealed class BossModUi
{
    public UiRenderResult Render(UiFrame frame)
    {
        Theme.ApplyUiScale(_globals);
        var result = new UiRenderResult();
        _castBar.Render(frame);
        _cooldowns.Render(frame);
        _buffs.Render(frame);
        _alertOverlay.Render(frame.UnscaledNow);
        if (_settingsVisible) result.Merge(_settings.Render(frame.Mode));
        return result;
    }
}
```

The renderer remains backend-only. `ImGuiRenderer.OnLayout` invokes the application UI callback but does not know about catalog, BossState, audio, or persistence.

## UI windows

### CastBarWindow

- Renders active bosses with `ActiveCast != null`.
- Sorts by effective threat descending, then remaining cast time ascending.
- Caps at `Globals.MaxCastBars` (default 3) and shows `+N more casting` overflow.
- Uses threat-colored progress bars.
- Normal mode is click-through; Config Mode unlocks movement/resizing through centralized `WindowChrome`.

### CooldownWindow

- Renders one collapsible section per active boss.
- Header: boss display name, level, HP percent.
- Ordering: targeted boss first, then distance ascending.
- Skill rows are idx >= 1 special abilities, sorted by ETA ascending.
- Ready rows show a green `READY` tag.
- Expansion policy comes from `Globals.ExpansionDefault`.

### BuffTrackerWindow

- Top pseudo-section: `On You`, using `UiFrame.PlayerBuffs`.
- `On You` includes boss-known debuffs/buffs on the local player and must carry enough source/active information to avoid claiming a buff is boss-related when only the skill id matches by coincidence.
- Then one collapsible section per active boss, rendering boss buffs/debuffs/auras from `BossState.Buffs`.
- Colors: aura purple, debuff red, buff blue.

### AlertOverlay

- Stack of up to 4 ephemeral text alerts.
- Coalescing key is `SkillId` for the v1 cross-boss behavior: simultaneous same-skill alerts collapse to `Inferno Blast (x3)`.
- If trigger-specific coalescing becomes necessary, key by `(SkillId, Trigger)`; do not key by `BossId` for cross-boss coalescing.
- TTL: 3 seconds normally, 5 seconds for Critical.
- Always click-through, including Config Mode.

### SettingsWindow

Settings edits write through a mutation boundary and return a structured result so file actions can request immediate flush and surface truthful status.

Minimum acceptable implementation:

```csharp
public sealed class UiRenderResult
{
    public bool Dirty { get; set; }
    public bool FlushImmediately { get; set; }
    public string StatusMessage { get; set; } = "";
}

public UiRenderResult SettingsWindow.Render(UiMode mode);
public UiRenderResult SkillsTab.Render();
public UiRenderResult BossesTab.Render();
public UiRenderResult SoundsTab.Render();
public UiRenderResult GeneralTab.Render(UiMode mode);
public UiRenderResult ExportImportTab.Render();

public interface ISettingsMutator
{
    bool SetSkillOverride(string skillId, SkillOverridePatch patch);
    bool SetBossSkillOverride(string bossId, string skillId, SkillOverridePatch patch);
    bool SetGlobal(GlobalPatch patch);
    bool ApplyLoadedStateInPlace(SkillCatalog loadedCatalog, Globals loadedGlobals);
    bool ResetUserSettingsToDefaults();
}
```

Tabs:

- **Skills**: group/filter skill records, show raw/effective context where available, edit skill-level `UserThreat`, `Sound`, `AlertText`, `FireOn`, `AudioMuted`, preview sounds once the sound preview service is wired, and show missing-sound badges from the sound inventory.
- **Bosses**: group/filter boss records, show boss skill records, edit the full boss-level override surface: `UserThreat`, `Sound`, `AlertText`, `FireOn`, `AudioMuted`, preview sounds once wired, and show boss override -> skill override -> auto/default source badges.
- **Sounds**: list built-ins and user WAVs, show load status/failure reason, preview sounds, rescan folder, open folder.
- **General**: window toggles, Config Mode toggle, proximity radius, max cast bars, expansion policy, UI scale, thresholds, master mute, master volume, alert-text suppression, and read-only F8 hotkey display for v1.
- **Export/Import**: export to chosen non-active path, import/reload only when `StateJson.Read` returns `Loaded`, apply valid state in place, reset defaults without clearing discovered catalog records, and request immediate flush only when active persisted state changed.

Settings UI should display resolved values and source badges where useful:

```text
Threat: Critical (boss override)
Sound: high (skill default)
Fire on: CastStart (auto)
```

## Config Mode

Config Mode is available only in `World`. Outside `World`, the checkbox is disabled with a hint and effective `UiMode.ConfigMode` is false even if `Globals.ConfigMode` is true.
`WindowChrome.ForMode` is the single owner of effective mode/chrome derivation; do not add a parallel Config Mode policy helper.

Normal mode:

```text
CastBar / Cooldown / BuffTracker / Alert:
  NoInputs | NoTitleBar | NoBackground | NoMove | NoResize | NoScrollbar
Settings:
  normal interactive window
```

Config Mode:

```text
CastBar / Cooldown / BuffTracker:
  interactive, title visible, background/outline visible, movable, resizable
AlertOverlay:
  always click-through
Settings:
  normal interactive window
```

A top-center banner renders while effective Config Mode is active in `World`:

```text
CONFIG MODE - drag windows to reposition - Exit
```

Clicking Exit or disabling the checkbox leaves Config Mode. If Escape handling is implemented, it must not conflict with ImGui text input.

## Hotkeys

Default hotkeys:

```text
F8 -> Toggle Settings
```

No other action is bound by default. Other actions remain buttons/checkboxes in Settings.

Implementation rules:

- Use `UnityEngine.InputSystem.Keyboard.current`.
- Use edge detection; fire on key down, not every pressed frame.
- Do not fire action hotkeys while ImGui wants text input.
- F8 may work outside `World` so settings can be opened from menu unless a later in-game finding shows that is unsafe.
- Hotkey rebinding is deferred for v1. The Settings UI displays F8 truthfully but does not expose a writable binding unless a later plan reopens that scope.

## Audio

### Core audio helpers

Pure, host-tested code lives in `BossMod.Core.Audio`:

- `WavHeader`: validates and parses 16-bit PCM WAV files.
- `Tone`: generates built-in tone sample arrays.
- `SoundRateLimiter`: enforces per-sound anti-spam windows.

### WAV support

v1 supports:

- RIFF/WAVE.
- PCM format code 1.
- 16-bit samples.
- Mono or stereo.
- Any positive sane sample rate.
- Stereo downmixed to mono by averaging channels.

Parser must reject:

- missing RIFF/WAVE signatures.
- missing `fmt ` or `data` chunk.
- negative or oversized chunk sizes.
- `fmt ` chunk shorter than fields read.
- channel count other than 1 or 2.
- sample rate <= 0.
- invalid `blockAlign` or `byteRate` for PCM16.
- `dataOffset + dataLength > bytes.Length`.
- data length not divisible by frame size.

### Built-in tones

Built-ins are generated at startup and converted to Unity `AudioClip`s:

```text
low      -> low-priority short sine
medium   -> medium-priority sine
high     -> higher-pitch sine/pulse
critical -> triple pulse
chime    -> sweep
klaxon   -> alternating square/square-like warning tone
```

The refreshed plan must choose one exact frequency table and keep spec/tests/code aligned. Tone tests must assert finite samples, amplitude in [-1, +1], expected lengths, and non-clicky attack/decay endpoints.

### SoundBank

`SoundBank` owns the registry of available sound names to Unity `AudioClip`s.

Rules:

- Built-in names are reserved.
- User WAVs live in `UserData/BossMod/Sounds/*.wav`.
- Rescan clears previously loaded user clips, preserves built-ins, then reloads valid user WAVs deterministically.
- Name matching is case-insensitive after trimming the file stem for collision detection.
- Invalid/skipped files are recorded with a concise status for the Sounds tab.
- File size/duration bounds are `5 MiB` and `10 seconds` for v1 to prevent unbounded memory use.
- `Entries` is the sound inventory; scan failures/skips are load statuses. Do not keep parallel `LoadResults`/`LoadStatuses` or `Rescan`/`RescanUserSounds` APIs alive.

### SoundPlayer

`SoundPlayer` owns one hidden `BossMod_Audio` `GameObject` with one `AudioSource`.

Rules:

- `spatialBlend = 0f` for 2D UI audio.
- `playOnAwake = false`.
- `Initialize()` is idempotent or explicitly guarded.
- `Dispose()` destroys the hidden GameObject and any Unity resources it owns.
- `Play(name)` checks master mute, source availability, clip existence, then rate limiter, then `PlayOneShot(clip, Globals.MasterVolume)`.
- `PlayPreview(name)` checks current master mute/volume and missing clips but does not consume the live alert rate limiter.
- Missing clip names log once per name and do not poison the rate limiter.

## Persistence

`UserData/BossMod/state.json` is the single persisted state file. It contains:

```jsonc
{
  "version": 1,
  "global": { ... },
  "skills": { ... },
  "bosses": { ... }
}
```

`StateJson.Write` writes atomically enough for v1 by writing a `.tmp`, flushing to disk, then replacing/moving into place in the same directory. If using delete+move, the small no-destination window must be documented; prefer `File.Replace` when available and destination exists, with a safe fallback.

`StateJson.Read` should return both data and status, or otherwise let the caller log status:

```csharp
public enum StateReadStatus
{
    Loaded,
    MissingUsedDefaults,
    CorruptUsedDefaults,
    UnsupportedVersionUsedDefaults,
}
```

Silent reset on corrupt state is not acceptable as a user-facing truth: the mod may continue with defaults, but logs/UI should say defaults are active because loading failed.

### StateFlusher

`StateFlusher` is pure Core filesystem/clock logic with tests. It owns debounce and hard flush.

```csharp
public sealed class StateFlusher : IDisposable
{
    public void MarkDirty();
    public void Tick();
    public void Flush();
    public void Dispose();
    public Action<Exception>? OnFlushError { get; set; }
}
```

Rules:

- `MarkDirty` records the first dirty timestamp; repeated marks do not reset the debounce window.
- `Tick` writes after debounce elapses.
- `Dispose` hard-flushes pending dirty state.
- If flush fails, dirty state remains pending and an error is surfaced.
- Dirty means persisted state changed; do not use “Settings window is open” as a proxy.

Dirty sources:

```text
settingsResult  = SettingsWindow.Render() / BossModUi.Render()
catalogChanged  = MonsterWatcher.Tick()
importResult    = ExportImportTab action (`Dirty`, `FlushImmediately`, status)
resetResult     = reset defaults action (`Dirty`, `FlushImmediately`, status)
```

Import/reload applies loaded state only when `StateJson.Read(...).Status == Loaded`; missing/corrupt/unsupported reads preserve the current live object graph and surface a status. Valid import/reset mutates existing `SkillCatalog`/`Globals` instances in place unless `BossMod.cs` rebuilds every dependent service in the same cutover.

## BossMod conductor

`BossMod.cs` owns lifecycle and ordering. It should not contain detailed rendering, audio synthesis, WAV parsing, or threat logic.

Initialization order:

1. Compute `UserData/BossMod` path using `MelonEnvironment.UserDataDirectory`.
2. Load `state.json` and log/read-status truthfully.
3. Initialize renderer.
4. Initialize audio bank/player.
5. Initialize Core services: catalog/globals/defaults/alert engine/flusher.
6. Initialize tracking/context builders.
7. Initialize UI facade/windows.
8. Register hotkeys.
9. Set renderer layout callback.

Per update:

```csharp
public override void OnUpdate()
{
    if (_renderer == null) return;

    _hotkeys.Tick(skipActions: _renderer.WantTextInput);

    var catalogChanged = _watcher.Tick();
    var frame = _uiFrameBuilder.Build(_watcher.CurrentSnapshots);

    ProcessAlerts(_watcher.CurrentSnapshots);

    if (catalogChanged) _flusher.MarkDirty();
    _flusher.Tick();
}
```

Per layout:

```csharp
private void OnLayout()
{
    var result = _ui.Render(_currentFrame);
    if (result.Dirty) _flusher.MarkDirty();
    if (result.FlushImmediately) _flusher.Flush();
}
```

Alert processing:

- Update previous states for all visible bosses so inactive bosses have continuity if they become active.
- Emit alerts only through `AlertEngine`, which checks `IsActive`.
- Clear/prune previous states and reset alert dedupe on World exit/scene generation change.

Teardown:

```csharp
public override void OnDeinitializeMelon()
{
    _flusher?.Dispose();
    _soundPlayer?.Dispose();
    _renderer?.Dispose();
}
```

## ImGui renderer

The renderer is already implemented as a backend and should stay that way.

Current choices:

- Extract embedded `BossMod.cimgui.dll` to cache and `LoadLibrary` it.
- Skip rewrite if the DLL already exists to avoid file-lock issues.
- Pin ImGui ini path for context lifetime.
- Build default font atlas into Unity `Texture2D`.
- Use `MelonMod.OnGUI()` and render only on `EventType.Repaint`.
- One mesh per ImDrawList, one submesh per ImDrawCmd.
- `CommandBuffer` + `DrawMesh` render path.
- Unity types are bare `UnityEngine.*`.
- Input bridge uses new InputSystem and forwards text input through generated `add_onTextInput`/`remove_onTextInput` methods.

Known v1 performance tradeoff:

- Current render path allocates managed arrays and `MaterialPropertyBlock`s per frame/draw command. Accept this for HUD-scale v1 unless E2E profiling shows GC spikes with large Settings tables. If spikes appear, pool material property blocks and grow/reuse vertex/index buffers.

## Settings inheritance and display

Core resolver is the only owner of inheritance semantics. UI may call it to display resolved values; UI must not reimplement it.

Mutation rules:

- `null` means inherit.
- Empty `AlertText` means intentionally no overlay text, not inherit. If UI needs a way to clear back to inherit, use a separate “inherit” checkbox/button rather than overloading empty string.
- Boss-level override wins over skill-level override.
- Skill-level override wins over auto/default.

## Threat classification

Plan 2's thresholds remain placeholders until E2E tuning:

```text
CriticalDamage = 200
HighDamage = 80
AuraDpsHigh = 30
CriticalCastTime = 3.0
```

These values must be tuned from observed encounters before v1 completion. ThreatClassifier remains pure and host-tested. Settings exposes threshold sliders, but defaults should be adjusted after live validation.

## Multi-boss behavior

- Cast bars stack across bosses, max `Globals.MaxCastBars`, sorted threat desc then remaining cast time asc.
- Cooldown and Buff windows group by boss in collapsible sections.
- Targeted boss sorts first where applicable.
- AlertOverlay coalesces same `SkillId` cross-boss into one alert count.
- Cross-boss coalescing text uses ASCII-safe fallback in docs/tests as `Inferno Blast (x3)`; UI may render the multiplication symbol if confirmed fonts handle it.

## Testing strategy

### Core unit tests

Required host tests:

- `EffectiveValues` formulas.
- `ThreatClassifier` rules.
- `SettingsResolver` inheritance, including `AudioMuted`, empty alert text, and tier sound defaults.
- `AlertEngine`:
  - CastStart default emits.
  - FireOn suppresses non-matching triggers.
  - CooldownReady emits when configured.
  - boss override wins over skill override.
  - inactive boss emits nothing.
  - muted emits `AudioMuted = true` but still includes alert text.
  - CastFinish boundary/cancel ambiguity is conservative.
  - reset/prune clears dedupe state.
- `StateJson` read/write, corrupt read status, unsupported version/defaulting, atomic write behavior.
- `StateFlusher` debounce, repeated dirty marks, flush failure behavior, dispose hard flush.
- `WavHeader` malformed chunk coverage and sample conversion.
- `Tone` generated sample shape/range.
- `SoundRateLimiter` per-name anti-spam behavior.

### Build verification

- Every implementation slice must build.
- `dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj` must pass after Core changes.
- `dotnet run --project build-tool build` must pass after mod changes.

### In-game verification

Before v1 completion:

- Main menu: renderer initializes; F8 opens Settings; Sounds preview works; no duplicate audio object on reload/deinit.
- World scene: catalog discovery persists without opening Settings.
- Activation: proximate bosses show; far inactive bosses do not alert; engaged branch activates outside proximity.
- Multi-boss: cast bars cap/sort; alert overlay coalesces same skill across bosses.
- Buff tracker: `On You` section shows only boss-known/source-valid effects.
- Config Mode: windows unlock in World only and remain click-through otherwise.
- State: user edits survive restart; corrupt state logs warning and defaults are explicit.
- Thresholds: defaults tuned from at least several observed elites/bosses.

## Revised implementation plan shape

The old horizontal split “all UI/audio first, conductor later” is replaced by vertical slices.

### New Plan 3 — Core contracts and minimal vertical integration

Goal: make the policy/lifecycle contracts truthful and wire a minimal end-to-end path.

- AlertEngine FireOn/IsActive semantics + tests.
- Audio Core helpers: WavHeader hardening, Tone tests, SoundRateLimiter tests.
- Persistence contracts: Globals updates, StateJson read status, StateFlusher tests.
- UI frame contracts: UiFrame, PlayerBuffView, WindowChrome/UiMode.
- Minimal SoundBank/SoundPlayer/AlertOverlay.
- Minimal BossMod conductor replacing demo stub with load -> tick -> alert -> overlay/audio -> flush skeleton.
- Every task builds.

### New Plan 4 — Complete UI surfaces and settings

Goal: add user-facing windows over the already-wired vertical path.

- CastBarWindow, CooldownWindow, BuffTrackerWindow over UiFrame.
- SettingsWindow and tabs with `UiRenderResult` dirty/immediate-flush tracking and a mutator boundary.
- Sounds tab with inventory/load statuses and preview that does not consume alert rate limits.
- Export/import/reload/reset with explicit dirty/flush behavior.
- Config Mode through the centralized `WindowChrome.ForMode` provider and a World-only banner.
- Fixed F8 Settings toggle; rebind UI deferred for v1.

### New Plan 5 — E2E hardening, tuning, documentation

Goal: validate against the live game and close reliability gaps.

- In-game IL2CPP access verification across multiple elites/bosses.
- Audio lifecycle/reload verification.
- Activation and multi-boss verification.
- Threshold tuning from observed encounters.
- Renderer allocation/performance observation with populated Settings tables.
- Update `mods/BossMod/CLAUDE.md`.

## Maintainer rules

- If logic can be pure, put it in `BossMod.Core` and test it.
- If code touches IL2CPP game objects, put it in `mods/BossMod/Tracking` or conductor-owned adapters, not UI windows.
- If code touches Unity audio/rendering, keep lifecycle ownership explicit and dispose Unity objects on deinit.
- If UI edits persisted state, return `changed` or go through a mutator; do not mutate silently.
- If a design fact changes, update spec, plans, tests, and docs in the same change.
