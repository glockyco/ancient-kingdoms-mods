# BossMod Plan 3 — Core Contracts + Minimal Vertical Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use skill://superpowers:subagent-driven-development (recommended) or skill://superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Use TDD for pure `BossMod.Core` changes.

**Goal:** Tighten the Core contracts that downstream UI/audio rely on, then wire the smallest truthful end-to-end runtime path: load persisted state, tick tracking, emit post-policy alerts, dispatch overlay/audio, and flush only actual persisted changes.

**Architecture:** `mods/BossMod.Core` remains pure C# and owns policy, persistence contracts, WAV/tone/rate-limit helpers, and host-tested behavior. `mods/BossMod` owns Unity/IL2CPP adapters, audio objects, ImGui overlay rendering, and the conductor. UI receives pure `UiFrame`/`PlayerBuffView`/`UiMode`/`WindowChrome` inputs; UI windows must not probe `Il2Cpp.*`, `UnityEngine.Object.FindObjectOfType`, `Player.localPlayer`, `NetworkManagerMMO`, or `NetworkTime`.

**Tech Stack:** C# net6.0, System.Text.Json, xunit, ImGui.NET, MelonLoader, UnityEngine audio/rendering APIs. Unity types use bare `UnityEngine.*`; Assembly-CSharp game types use `Il2Cpp.*`; user data path comes from `MelonLoader.Utils.MelonEnvironment.UserDataDirectory`.

**Spec:** `docs/superpowers/specs/2026-04-29-bossmod-design.md`

**Out of scope:** Full CastBar/Cooldown/BuffTracker windows, full Settings tabs, import/export UI, Config Mode banner, hotkey rebind UI, and threshold tuning. Those remain for later plans. This plan may create contract records and minimal facades only where needed for the vertical slice.

**Depends on:** Plans 1 and 2 committed.

---

## File Structure

| Path | Responsibility | Status |
|---|---|---|
| `mods/BossMod.Core/Catalog/Enums.cs` | Add `ExpansionDefault`; keep `AlertTrigger` canonical | Modify |
| `mods/BossMod.Core/Catalog/SkillRecord.cs` | Rename `Muted` override to `AudioMuted` | Modify |
| `mods/BossMod.Core/Catalog/BossSkillRecord.cs` | Rename `Muted` override to `AudioMuted` | Modify |
| `mods/BossMod.Core/Effects/SettingsResolver.cs` | Resolve FireOn and AudioMuted inheritance | Modify |
| `mods/BossMod.Core/Alerts/AlertEvent.cs` | Emit `AudioMuted` field | Modify |
| `mods/BossMod.Core/Alerts/AlertEngine.cs` | IsActive gate, FireOn filtering, reset/prune lifecycle | Modify |
| `tests/BossMod.Core.Tests/SettingsResolverTests.cs` | AudioMuted + FireOn inheritance tests | Modify |
| `tests/BossMod.Core.Tests/AlertEngineTests.cs` | FireOn/IsActive/AudioMuted/dedupe lifecycle tests | Modify |
| `mods/BossMod.Core/Audio/WavHeader.cs` | Hardened RIFF/PCM16 parser and float conversion | Create |
| `mods/BossMod.Core/Audio/Tone.cs` | Built-in tone sample generation | Create |
| `mods/BossMod.Core/Audio/SoundRateLimiter.cs` | Per-sound anti-spam logic | Create |
| `tests/BossMod.Core.Tests/WavHeaderTests.cs` | WAV parser malformed-input coverage | Create |
| `tests/BossMod.Core.Tests/ToneTests.cs` | Built-in tone shape/range tests | Create |
| `tests/BossMod.Core.Tests/SoundRateLimiterTests.cs` | Per-name limiter tests | Create |
| `mods/BossMod.Core/Persistence/Globals.cs` | Add `MasterVolume`, enum `ExpansionDefault`, persisted UI globals | Modify |
| `mods/BossMod.Core/Persistence/StateJson.cs` | Read status, validation/defaulting, atomic write contract | Modify |
| `mods/BossMod.Core/Persistence/StateFlusher.cs` | Debounced truthful dirty flush | Create |
| `tests/BossMod.Core.Tests/StateJsonTests.cs` | Read status and validation tests | Modify |
| `tests/BossMod.Core.Tests/StateFlusherTests.cs` | Debounce/failure/dispose tests | Create |
| `mods/BossMod/Ui/UiFrame.cs` | Pure UI frame, player buff view, mode/chrome contracts | Create |
| `mods/BossMod/Ui/WindowChrome.cs` | Central chrome presets/provider helpers | Create |
| `mods/BossMod/Ui/AlertOverlay.cs` | Minimal alert text stack over `AlertEvent` | Create |
| `mods/BossMod/Ui/BossModUi.cs` | Minimal UI facade returning `changed` from render | Create |
| `mods/BossMod/Audio/SoundBank.cs` | Built-ins + user WAV registry and load statuses | Create |
| `mods/BossMod/Audio/SoundPlayer.cs` | Hidden `BossMod_Audio` object and `AudioSource` playback | Create |
| `mods/BossMod/Audio/AlertSubscriber.cs` | Thin `AlertEvent` dispatcher to audio/overlay | Create |
| `mods/BossMod/Tracking/PlayerContextBuilder.cs` | IL2CPP local-player context for target, buffs, time, position | Create |
| `mods/BossMod/Tracking/UiFrameBuilder.cs` | Combine watcher snapshots + player context + globals into `UiFrame` | Create |
| `mods/BossMod/BossMod.cs` | Replace demo window with minimal conductor skeleton | Modify |

---

## Task 1: AlertEngine policy contracts + AudioMuted rename (TDD)

**Files:**
- Modify: `mods/BossMod.Core/Catalog/SkillRecord.cs`
- Modify: `mods/BossMod.Core/Catalog/BossSkillRecord.cs`
- Modify: `mods/BossMod.Core/Effects/SettingsResolver.cs`
- Modify: `mods/BossMod.Core/Alerts/AlertEvent.cs`
- Modify: `mods/BossMod.Core/Alerts/AlertEngine.cs`
- Modify: `tests/BossMod.Core.Tests/SettingsResolverTests.cs`
- Modify: `tests/BossMod.Core.Tests/AlertEngineTests.cs`

**Contract:** `AlertEvent` is post-policy. `AlertEngine` owns FireOn filtering and `BossState.IsActive` gating. `AudioMuted` suppresses sound only; it does not suppress overlay text.

- [ ] **Step 1: Add failing SettingsResolver tests for inheritance names**

  In `tests/BossMod.Core.Tests/SettingsResolverTests.cs`, add tests proving:
  - boss-skill `AudioMuted` wins over skill `AudioMuted`;
  - skill `AudioMuted` wins over default `false`;
  - no override resolves to `false`;
  - boss-skill `FireOn` wins over skill `FireOn`;
  - skill `FireOn` wins over default `AlertTrigger.CastStart`.

  Use exact assertion names such as:
  - `ResolveAudioMuted_BossOverrideWinsOverSkillOverride()`
  - `ResolveAudioMuted_DefaultsFalse()`
  - `ResolveFireOn_DefaultsCastStart()`

- [ ] **Step 2: Add failing AlertEngine tests for post-policy behavior**

  In `tests/BossMod.Core.Tests/AlertEngineTests.cs`, add tests proving:
  - `Process` emits no events when `curr.IsActive == false`, even for a new cast;
  - default `FireOn` emits `CastStart`;
  - `FireOn = CooldownReady` suppresses `CastStart` and emits on cooldown-ready transition;
  - boss-skill `FireOn` overrides skill `FireOn`;
  - `AudioMuted = true` is present on the emitted `AlertEvent` while `EffectiveAlertText` remains populated;
  - `Reset()` clears dedupe so a reused netId/skill/deadline can alert after lifecycle reset;
  - conservative `CastFinish` behavior still suppresses ambiguous cancellations.

  The inactive test must set up a transition that would otherwise alert; a test that lacks a transition is not sufficient.

- [ ] **Step 3: Rename catalog/resolver semantics cleanly**

  Replace `Muted` with `AudioMuted` in:
  - `mods/BossMod.Core/Catalog/SkillRecord.cs`
  - `mods/BossMod.Core/Catalog/BossSkillRecord.cs`
  - `mods/BossMod.Core/Effects/SettingsResolver.cs`
  - `mods/BossMod.Core/Alerts/AlertEvent.cs`
  - tests under `tests/BossMod.Core.Tests/`

  Do not leave compatibility aliases, `[Obsolete]` properties, or duplicate resolver methods. The clean-cutover name is `AudioMuted` everywhere.

- [ ] **Step 4: Implement FireOn resolution and AlertEngine filtering**

  In `SettingsResolver`, expose:

  ```csharp
  public static AlertTrigger ResolveFireOn(SkillRecord skill, BossSkillRecord bossSkill)
  public static bool ResolveAudioMuted(SkillRecord skill, BossSkillRecord bossSkill)
  ```

  In `AlertEngine.TryBuild`, resolve `fireOn` and return no event unless `trigger == fireOn`. Resolve threat/sound/text/audioMuted only for matching triggers.

- [ ] **Step 5: Implement IsActive gate and lifecycle reset**

  At the start of `AlertEngine.Process(prev, curr)`, return no events when `curr.IsActive == false`. Add one explicit lifecycle method:

  ```csharp
  public void Reset()
  ```

  `Reset()` clears all cast/cooldown dedupe dictionaries. If the implementer chooses `PruneToActiveNetIds(IEnumerable<uint> netIds)` instead, tests must prove removed netIds no longer dedupe future alerts and retained netIds still dedupe; do not implement both unless both are used by the conductor.

- [ ] **Step 6: Verify Core tests**

  ```bash
  dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj
  ```

  Expected outcome: all `BossMod.Core.Tests` pass, including new `SettingsResolverTests` and `AlertEngineTests`.

- [ ] **Step 7: Verify mod build still succeeds**

  ```bash
  dotnet run --project build-tool build
  ```

  Expected outcome: build succeeds; `BossMod.Core.dll` remains merged into `BossMod.dll` by `mods/BossMod/ILRepack.targets`.

- [ ] **Step 8: Commit**

  ```bash
  git add mods/BossMod.Core/Catalog/SkillRecord.cs mods/BossMod.Core/Catalog/BossSkillRecord.cs mods/BossMod.Core/Effects/SettingsResolver.cs mods/BossMod.Core/Alerts/AlertEvent.cs mods/BossMod.Core/Alerts/AlertEngine.cs tests/BossMod.Core.Tests/SettingsResolverTests.cs tests/BossMod.Core.Tests/AlertEngineTests.cs
  git commit -m "feat(bossmod): enforce alert policy contracts"
  ```

---

## Task 2: Core audio helpers (TDD)

**Files:**
- Create: `mods/BossMod.Core/Audio/WavHeader.cs`
- Create: `mods/BossMod.Core/Audio/Tone.cs`
- Create: `mods/BossMod.Core/Audio/SoundRateLimiter.cs`
- Create: `tests/BossMod.Core.Tests/WavHeaderTests.cs`
- Create: `tests/BossMod.Core.Tests/ToneTests.cs`
- Create: `tests/BossMod.Core.Tests/SoundRateLimiterTests.cs`

**Contract:** `BossMod.Core.Audio` is pure host-testable logic. It does not reference Unity, MelonLoader, IL2CPP, ImGui, or file-system user paths.

- [ ] **Step 1: Write failing `WavHeader` tests**

  Create `tests/BossMod.Core.Tests/WavHeaderTests.cs` covering:
  - valid mono 16-bit PCM parses sample rate, channel count, data offset, and data length;
  - valid stereo 16-bit PCM parses and downmixes to mono float samples;
  - missing `RIFF`/`WAVE` signatures throw `WavFormatException`;
  - missing `fmt ` chunk throws;
  - missing `data` chunk throws;
  - `fmt ` chunk shorter than 16 bytes throws;
  - non-PCM format code throws;
  - channel count other than 1 or 2 throws;
  - sample rate `<= 0` throws;
  - invalid `blockAlign` or `byteRate` throws;
  - declared `data` chunk beyond file length throws;
  - data length not divisible by frame size throws.

- [ ] **Step 2: Implement `WavHeader`**

  Create `mods/BossMod.Core/Audio/WavHeader.cs` with:

  ```csharp
  public sealed class WavFormatException : Exception
  public readonly record struct WavHeader(int Channels, int SampleRate, int BitsPerSample, int DataOffset, int DataLength)
  ```

  Add static methods:

  ```csharp
  public static WavHeader Parse(ReadOnlySpan<byte> bytes)
  public static float[] ToMonoFloatSamples(ReadOnlySpan<byte> bytes, WavHeader header)
  ```

  Reject negative/oversized chunk sizes before offset arithmetic can overflow. Stereo conversion must average left/right samples. PCM16 conversion must clamp into `[-1f, 1f]` and preserve `short.MinValue` as `-1f`.

- [ ] **Step 3: Write failing `Tone` tests with a fixed table**

  Create `tests/BossMod.Core.Tests/ToneTests.cs`. Use this exact built-in table in tests and implementation:

  | Name | Sample rate | Duration ms | Pattern |
  |---|---:|---:|---|
  | `low` | 44100 | 180 | 440 Hz sine |
  | `medium` | 44100 | 220 | 660 Hz sine |
  | `high` | 44100 | 260 | 880 Hz sine |
  | `critical` | 44100 | 650 | three 1100 Hz pulses, 90 ms on / 80 ms off |
  | `chime` | 44100 | 420 | sine sweep 660 Hz to 1320 Hz |
  | `klaxon` | 44100 | 700 | alternating square-like 440 Hz / 660 Hz at 120 ms intervals |

  Tests must assert every built-in:
  - returns the exact expected sample count from sample rate and duration;
  - contains only finite samples;
  - sample values are in `[-1f, 1f]`;
  - first and last samples are near zero (`abs(sample) <= 0.02f`) to avoid clicks;
  - unknown names throw or return a documented failure result, not silence pretending to be success.

- [ ] **Step 4: Implement `Tone`**

  Create `mods/BossMod.Core/Audio/Tone.cs` with deterministic generation and no random inputs:

  ```csharp
  public static class Tone
  {
      public static IReadOnlyList<string> BuiltInNames { get; }
      public static float[] Generate(string name);
  }
  ```

  Use a short attack/decay envelope for all generated tones. Keep generation allocation bounded to the returned sample array.

- [ ] **Step 5: Write failing `SoundRateLimiter` tests**

  Create `tests/BossMod.Core.Tests/SoundRateLimiterTests.cs` proving:
  - first play for a name is allowed;
  - repeated play before the per-name window is denied;
  - the same name is allowed after the window elapses;
  - different names are rate-limited independently;
  - failed/missing clip checks can be performed before `RecordPlay` so missing clips do not poison the limiter.

- [ ] **Step 6: Implement `SoundRateLimiter`**

  Create `mods/BossMod.Core/Audio/SoundRateLimiter.cs` with an injectable clock or explicit timestamp API:

  ```csharp
  public sealed class SoundRateLimiter
  {
      public SoundRateLimiter(TimeSpan cooldown);
      public bool CanPlay(string soundName, DateTimeOffset now);
      public void RecordPlay(string soundName, DateTimeOffset now);
      public bool TryAcquire(string soundName, DateTimeOffset now);
      public void Clear();
  }
  ```

  Name matching must be case-insensitive so `High` and `high` share a cooldown bucket. Empty or whitespace names must be rejected with `ArgumentException`.

- [ ] **Step 7: Verify Core tests**

  ```bash
  dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj
  ```

  Expected outcome: all Core tests pass, including malformed WAV coverage and deterministic tone/rate-limiter tests.

- [ ] **Step 8: Verify mod build still succeeds**

  ```bash
  dotnet run --project build-tool build
  ```

  Expected outcome: build succeeds; no Unity references have been introduced into `mods/BossMod.Core`.

- [ ] **Step 9: Commit**

  ```bash
  git add mods/BossMod.Core/Audio tests/BossMod.Core.Tests/WavHeaderTests.cs tests/BossMod.Core.Tests/ToneTests.cs tests/BossMod.Core.Tests/SoundRateLimiterTests.cs
  git commit -m "feat(bossmod): add tested core audio helpers"
  ```

---

## Task 3: Persistence contracts and truthful dirty flushing (TDD)

**Files:**
- Modify: `mods/BossMod.Core/Catalog/Enums.cs`
- Modify: `mods/BossMod.Core/Persistence/Globals.cs`
- Modify: `mods/BossMod.Core/Persistence/StateJson.cs`
- Create: `mods/BossMod.Core/Persistence/StateFlusher.cs`
- Modify: `tests/BossMod.Core.Tests/StateJsonTests.cs`
- Create: `tests/BossMod.Core.Tests/StateFlusherTests.cs`

**Contract:** Persistence tells the truth. Corrupt/unsupported state may default so the mod can continue, but callers must receive a status they can log or display. Dirty means persisted state changed, not that a window rendered.

- [ ] **Step 1: Add failing enum/global serialization tests**

  In `tests/BossMod.Core.Tests/StateJsonTests.cs`, add tests proving:
  - `Globals.MasterVolume` defaults to `1.0f` and round-trips through JSON;
  - `Globals.ExpansionDefault` is an `ExpansionDefault` enum, defaults to `ExpansionDefault.ExpandTargetedOnly`, and serializes as a string through the existing `JsonStringEnumConverter`;
  - invalid enum strings do not silently become a different policy.

- [ ] **Step 2: Implement `ExpansionDefault` and update `Globals`**

  In `mods/BossMod.Core/Catalog/Enums.cs`, add:

  ```csharp
  public enum ExpansionDefault { ExpandTargetedOnly, ExpandAll, CollapseAll }
  ```

  In `mods/BossMod.Core/Persistence/Globals.cs`, ensure these persisted properties exist with spec defaults:

  ```csharp
  public bool Muted { get; set; }
  public float MasterVolume { get; set; } = 1.0f;
  public bool AlertTextMuteOnMasterMute { get; set; } = true;
  public ExpansionDefault ExpansionDefault { get; set; } = ExpansionDefault.ExpandTargetedOnly;
  public int MaxCastBars { get; set; } = 3;
  public bool ShowCastBarWindow { get; set; } = true;
  public bool ShowCooldownWindow { get; set; } = true;
  public bool ShowBuffTrackerWindow { get; set; } = true;
  public bool ConfigMode { get; set; }
  ```

  Keep `Thresholds`, `ProximityRadius`, `UiScale`, and default `Hotkeys["toggle_settings"] = "F8"` intact.

- [ ] **Step 3: Add failing `StateJson.Read` status tests**

  In `tests/BossMod.Core.Tests/StateJsonTests.cs`, add tests for:
  - missing file returns defaults with `StateReadStatus.MissingUsedDefaults`;
  - valid version 1 returns loaded state with `StateReadStatus.Loaded`;
  - malformed JSON returns defaults with `StateReadStatus.CorruptUsedDefaults`;
  - unsupported version returns defaults with `StateReadStatus.UnsupportedVersionUsedDefaults`;
  - structurally invalid values, such as negative `MasterVolume` or non-positive `MaxCastBars`, return defaults with a non-loaded status rather than partial poisoned state.

- [ ] **Step 4: Implement `StateJson` read status and validation**

  In `mods/BossMod.Core/Persistence/StateJson.cs`, add:

  ```csharp
  public enum StateReadStatus
  {
      Loaded,
      MissingUsedDefaults,
      CorruptUsedDefaults,
      UnsupportedVersionUsedDefaults,
  }

  public sealed record StateReadResult(SkillCatalog Catalog, Globals Globals, StateReadStatus Status, string? ErrorMessage);
  ```

  Update the read API to return `StateReadResult`. Update all existing callers/tests that used the old `(SkillCatalog Catalog, Globals Globals)` tuple. `ErrorMessage` must be concise and safe for logs/UI; it must not include a full JSON payload.

  Validate after deserialization:
  - `Version == 1`;
  - `Globals.MasterVolume` is finite and in `[0f, 1f]`;
  - `Globals.UiScale` is finite and positive;
  - `Globals.ProximityRadius` is finite and positive;
  - `Globals.MaxCastBars > 0`.

- [ ] **Step 5: Preserve atomic write behavior**

  Keep `StateJson.Write` writing to a `.tmp` in the same directory, flushing to disk, and replacing/moving into place. Prefer `File.Replace` when the destination exists. If using delete+move fallback, document the small no-destination window in a code comment next to the fallback.

- [ ] **Step 6: Add failing `StateFlusher` tests**

  Create `tests/BossMod.Core.Tests/StateFlusherTests.cs` with an injected clock and writer delegate. Cover:
  - `MarkDirty` records the first dirty timestamp;
  - repeated `MarkDirty` does not reset the debounce window;
  - `Tick` writes after the debounce elapses;
  - `Flush` writes immediately when dirty and is a no-op when clean;
  - `Dispose` hard-flushes pending dirty state;
  - if the writer throws, dirty remains pending and `OnFlushError` receives the exception;
  - after a successful flush, `Tick` does not write again until the next `MarkDirty`.

- [ ] **Step 7: Implement `StateFlusher`**

  Create `mods/BossMod.Core/Persistence/StateFlusher.cs`:

  ```csharp
  public sealed class StateFlusher : IDisposable
  {
      public StateFlusher(Action write, Func<DateTimeOffset> now, TimeSpan debounce);
      public Action<Exception>? OnFlushError { get; set; }
      public bool IsDirty { get; }
      public void MarkDirty();
      public void Tick();
      public void Flush();
      public void Dispose();
  }
  ```

  `MarkDirty` must not accept a reason string in v1; dirty sources are owned by the conductor and settings mutators. `Flush` must clear dirty only after the writer succeeds.

- [ ] **Step 8: Verify Core tests**

  ```bash
  dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj
  ```

  Expected outcome: all Core tests pass, including `StateJsonTests` and `StateFlusherTests`.

- [ ] **Step 9: Verify mod build still succeeds**

  ```bash
  dotnet run --project build-tool build
  ```

  Expected outcome: build succeeds; any StateJson read API callsites are updated.

- [ ] **Step 10: Commit**

  ```bash
  git add mods/BossMod.Core/Catalog/Enums.cs mods/BossMod.Core/Persistence/Globals.cs mods/BossMod.Core/Persistence/StateJson.cs mods/BossMod.Core/Persistence/StateFlusher.cs tests/BossMod.Core.Tests/StateJsonTests.cs tests/BossMod.Core.Tests/StateFlusherTests.cs
  git commit -m "feat(bossmod): add truthful persistence status and flusher"
  ```

---

## Task 4: UI frame/chrome contracts and minimal overlay

**Files:**
- Create: `mods/BossMod/Ui/UiFrame.cs`
- Create: `mods/BossMod/Ui/WindowChrome.cs`
- Create: `mods/BossMod/Ui/AlertOverlay.cs`
- Create: `mods/BossMod/Ui/BossModUi.cs`

**Contract:** UI renders over pure view data. No UI file may read IL2CPP game singletons, `Player.localPlayer`, `NetworkManagerMMO`, `NetworkTime`, or Unity object search APIs. The only Unity/ImGui dependency in this task is ImGui rendering itself.

- [ ] **Step 1: Create `UiFrame` and `PlayerBuffView`**

  Create `mods/BossMod/Ui/UiFrame.cs` with:

  ```csharp
  public sealed record UiFrame(
      IReadOnlyList<BossState> Bosses,
      string? TargetedBossId,
      double ServerTime,
      double UnscaledNow,
      IReadOnlyList<PlayerBuffView> PlayerBuffs,
      UiMode Mode);

  public sealed record PlayerBuffView(
      string SkillId,
      string DisplayName,
      double EndTime,
      double TotalTime,
      bool IsDebuff,
      bool IsAura,
      bool IsFromActiveBoss);
  ```

  `UiFrame` may reference `BossMod.Core.Tracking.BossState`; it must not reference `Il2Cpp.*` or `UnityEngine.*`.

- [ ] **Step 2: Create chrome contracts**

  Create `mods/BossMod/Ui/WindowChrome.cs` with:

  ```csharp
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

  Include a small static provider, for example `WindowChrome.ForMode(bool inWorldScene, bool configMode)`, that returns normal-mode click-through chrome and config-mode interactive chrome for CastBar/Cooldown/BuffTracker. `AlertChrome` must always be click-through.

- [ ] **Step 3: Create minimal `AlertOverlay`**

  Create `mods/BossMod/Ui/AlertOverlay.cs` with:
  - `public void Push(AlertEvent ev)`;
  - `public void Render(double unscaledNow)`;
  - maximum 4 displayed alert entries;
  - TTL 3 seconds normally and 5 seconds for `ThreatTier.Critical`;
  - coalescing key `SkillId`, rendering text like `Inferno Blast (x3)` for repeated same-skill alerts;
  - no catalog lookup and no inheritance resolution.

  Rendering may be intentionally simple text-only, but must use `AlertEvent.EffectiveAlertText`; if it is empty, `Push` must do nothing.

- [ ] **Step 4: Create minimal `BossModUi` facade**

  Create `mods/BossMod/Ui/BossModUi.cs`:

  ```csharp
  public sealed class BossModUi
  {
      public BossModUi(AlertOverlay alertOverlay);
      public bool Render(UiFrame frame);
  }
  ```

  `Render` must call only minimal surfaces present in this plan and return `false` until settings surfaces exist. Returning `false` is intentional here: no UI mutator exists yet, so rendering is not a dirty source.

- [ ] **Step 5: Verify no forbidden game probing in UI**

  ```bash
  dotnet run --project build-tool build
  ```

  Expected outcome: build succeeds. During code review for this task, inspect `mods/BossMod/Ui/*.cs`; expected result is no `Il2Cpp.`, `Player.localPlayer`, `NetworkManagerMMO`, `NetworkTime`, or `UnityEngine.Object.FindObjectOfType` references.

- [ ] **Step 6: Commit**

  ```bash
  git add mods/BossMod/Ui/UiFrame.cs mods/BossMod/Ui/WindowChrome.cs mods/BossMod/Ui/AlertOverlay.cs mods/BossMod/Ui/BossModUi.cs
  git commit -m "feat(bossmod): add pure UI frame contracts"
  ```

---

## Task 5: Minimal Unity audio and thin alert subscriber

**Files:**
- Create: `mods/BossMod/Audio/SoundBank.cs`
- Create: `mods/BossMod/Audio/SoundPlayer.cs`
- Create: `mods/BossMod/Audio/AlertSubscriber.cs`
- Modify: `mods/BossMod/BossMod.csproj` only if additional Unity audio references are missing

**Contract:** Audio consumers do not re-resolve settings inheritance. They consume `AlertEvent` and current `Globals` only. User sounds live under `UserData/BossMod/Sounds/*.wav`; built-in names are reserved.

- [ ] **Step 1: Create `SoundBank`**

  Create `mods/BossMod/Audio/SoundBank.cs` with:
  - built-in clips generated from `BossMod.Core.Audio.Tone` names;
  - user WAV scan rooted at a constructor-provided `soundsDirectory` path;
  - `RescanUserSounds()` that clears old user clips, preserves built-ins, then loads valid WAV files deterministically by full path ordinal order;
  - case-insensitive name matching and collision detection against built-ins and other user files;
  - concise load status records for invalid/skipped files.

  Bounds for v1:
  - reject WAV files larger than 5 MiB;
  - reject converted clips longer than 10 seconds;
  - accept only `.wav` extension files in the top-level sounds directory, not recursive subdirectories.

  Do not use `Il2Cpp.*` types here. Unity audio types are bare `UnityEngine.AudioClip`.

- [ ] **Step 2: Create `SoundPlayer`**

  Create `mods/BossMod/Audio/SoundPlayer.cs` with:
  - hidden `UnityEngine.GameObject` named `BossMod_Audio`;
  - one `UnityEngine.AudioSource`;
  - `spatialBlend = 0f`;
  - `playOnAwake = false`;
  - idempotent `Initialize()` or an explicit guard that logs and no-ops on repeated initialize;
  - `Dispose()` destroys owned Unity objects;
  - `Play(string soundName, Globals globals)` that checks `globals.Muted`, clip existence, `SoundRateLimiter`, then calls `PlayOneShot(clip, globals.MasterVolume)`.

  Missing clip names must be logged once per name and must not call `SoundRateLimiter.RecordPlay` or `TryAcquire`.

- [ ] **Step 3: Create `AlertSubscriber`**

  Create `mods/BossMod/Audio/AlertSubscriber.cs`:

  ```csharp
  public sealed class AlertSubscriber
  {
      public void Handle(AlertEvent ev, Globals globals);
  }
  ```

  Behavior:
  - if `!ev.AudioMuted`, call `SoundPlayer.Play(ev.EffectiveSound, globals)`;
  - if `ev.EffectiveAlertText` is not empty, push to `AlertOverlay`;
  - if `globals.Muted && globals.AlertTextMuteOnMasterMute`, suppress overlay text as a global policy only;
  - do not inspect `SkillCatalog`, `SkillRecord`, or `BossSkillRecord`.

- [ ] **Step 4: Verify build**

  ```bash
  dotnet run --project build-tool build
  ```

  Expected outcome: build succeeds under the MelonLoader/Unity references already configured for `mods/BossMod/BossMod.csproj`.

- [ ] **Step 5: Commit**

  ```bash
  git add mods/BossMod/Audio/SoundBank.cs mods/BossMod/Audio/SoundPlayer.cs mods/BossMod/Audio/AlertSubscriber.cs mods/BossMod/BossMod.csproj
  git commit -m "feat(bossmod): add minimal alert audio subscriber"
  ```

---

## Task 6: Minimal conductor vertical slice

**Files:**
- Create: `mods/BossMod/Tracking/PlayerContextBuilder.cs`
- Create: `mods/BossMod/Tracking/UiFrameBuilder.cs`
- Modify: `mods/BossMod/Tracking/MonsterWatcher.cs`
- Modify: `mods/BossMod/BossMod.cs`

**Contract:** `BossMod.cs` owns lifecycle and ordering only. It replaces the demo window with a minimal real path: load state, initialize services, watcher tick, alert dispatch, overlay/audio render, and truthful dirty flush skeleton.

- [ ] **Step 1: Make MonsterWatcher dirty tracking truthful**

  In `mods/BossMod/Tracking/MonsterWatcher.cs`, ensure the per-frame public tick returns whether catalog discovery changed persisted state:

  ```csharp
  public bool Tick();
  ```

  `Tick()` must return `true` only when a skill/boss catalog record was added or a persisted field such as `LastSeenUtc`, `LastObservedUtc`, or effective snapshot actually changed. It must not return `true` merely because a monster was visible or snapshots were rebuilt.

  Ensure current snapshots remain available without mutation through a property such as:

  ```csharp
  public IReadOnlyList<BossState> CurrentSnapshots { get; }
  ```

- [ ] **Step 2: Add `PlayerContextBuilder`**

  Create `mods/BossMod/Tracking/PlayerContextBuilder.cs`. It may touch IL2CPP game objects because it is in Tracking, not UI. It must produce a pure tracking result, for example:
  - `string? TargetedBossId`;
  - player position for activation/frame building as needed;
  - player buffs as tracking-owned records that `UiFrameBuilder` maps into `PlayerBuffView`;
  - `double ServerTime`;
  - `bool InWorldScene`;
  - `bool SceneChangedOrLeftWorld`.
  Use bare `UnityEngine.*` for Unity APIs and `Il2Cpp.*` for Assembly-CSharp game types. Treat empty party as `party.members == null` where party data is read. `PlayerContextBuilder` should not depend on `mods/BossMod/Ui/*`; the dependency direction is `UiFrameBuilder -> UiFrame`, not `Tracking -> UI`. 

- [ ] **Step 3: Add `UiFrameBuilder`**

  Create `mods/BossMod/Tracking/UiFrameBuilder.cs`:

  ```csharp
  public sealed class UiFrameBuilder
  {
      public UiFrame Build(IReadOnlyList<BossState> bosses, Globals globals);
  }
  ```

  It combines watcher snapshots, player context, current `Globals`, `UnityEngine.Time.unscaledTimeAsDouble`, and `WindowChrome.ForMode(...)`. It must not render ImGui and must not mutate persistence.

- [ ] **Step 4: Replace demo-window lifecycle in `BossMod.cs`**

  In `mods/BossMod/BossMod.cs`, wire initialization in this order:
  1. compute `UserData/BossMod` with `MelonEnvironment.UserDataDirectory`;
  2. read `state.json` through `StateJson.Read` and log the returned `StateReadStatus` truthfully;
  3. initialize the existing ImGui renderer;
  4. initialize `SoundBank` and `SoundPlayer`;
  5. initialize `SkillCatalog`, `Globals`, `AlertEngine`, and `StateFlusher` from the loaded state;
  6. initialize `MonsterWatcher`, `PlayerContextBuilder`, `UiFrameBuilder`, `AlertOverlay`, `AlertSubscriber`, and `BossModUi`;
  7. set the renderer layout callback to `OnLayout`.

  Do not keep `ImGui.ShowDemoWindow` as reachable runtime behavior.

- [ ] **Step 5: Implement update/layout ordering**

  In `BossMod.cs`, implement the minimal ordering:

  ```csharp
  public override void OnUpdate()
  {
      if (_renderer == null) return;

      bool catalogChanged = _watcher.Tick();
      _currentFrame = _uiFrameBuilder.Build(_watcher.CurrentSnapshots, _globals);
      ProcessAlerts(_watcher.CurrentSnapshots);

      if (catalogChanged) _flusher.MarkDirty();
      _flusher.Tick();
  }

  private void OnLayout()
  {
      bool settingsChanged = _ui.Render(_currentFrame);
      if (settingsChanged) _flusher.MarkDirty();
  }
  ```

  `settingsChanged` will be `false` until Plan 4 introduces settings mutators. Keep the line anyway because it is the truthful dirty boundary for future UI changes.

- [ ] **Step 6: Implement alert previous-state handling**

  In `BossMod.cs`, keep a previous-state dictionary keyed by `BossState.NetId`. For each current visible boss:
  - if a previous state exists, call `AlertEngine.Process(prev, curr)` and pass each event to `AlertSubscriber.Handle(ev, _globals)`;
  - update the previous-state dictionary for all visible bosses, including inactive bosses, so inactive bosses have continuity if they become active later;
  - on World exit or scene generation change, clear previous states and call `AlertEngine.Reset()`.

  Do not duplicate FireOn, AudioMuted, or settings inheritance logic in the conductor.

- [ ] **Step 7: Implement teardown ordering**

  In `BossMod.cs`:

  ```csharp
  public override void OnDeinitializeMelon()
  {
      _flusher?.Dispose();
      _soundPlayer?.Dispose();
      _renderer?.Dispose();
  }
  ```

  Dispose order must flush pending state before destroying audio/renderer.

- [ ] **Step 8: Verify Core tests**

  ```bash
  dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj
  ```

  Expected outcome: all Core tests still pass after conductor-facing contract changes.

- [ ] **Step 9: Verify mod build**

  ```bash
  dotnet run --project build-tool build
  ```

  Expected outcome: build succeeds; `BossMod.dll` contains `BossMod.Core`; no demo window remains reachable from `BossMod.cs`.

- [ ] **Step 10: Optional smoke deploy for the implementer running the game**

  This is not required to commit the plan slice, but is the recommended manual check when the game environment is available:

  ```bash
  dotnet run --project build-tool all
  ```

  Launch the game manually, then inspect the latest MelonLoader log. Expected outcome: BossMod logs state read status and initializes without duplicate `BossMod_Audio` objects or demo window rendering.

- [ ] **Step 11: Commit**

  ```bash
  git add mods/BossMod/Tracking/PlayerContextBuilder.cs mods/BossMod/Tracking/UiFrameBuilder.cs mods/BossMod/Tracking/MonsterWatcher.cs mods/BossMod/BossMod.cs
  git commit -m "feat(bossmod): wire minimal alert vertical slice"
  ```

---

## Definition of Done

- [ ] `mods/BossMod.Core` remains pure C# with no Unity, MelonLoader, IL2CPP, or ImGui references.
- [ ] `AlertEngine` emits only post-policy `AlertEvent`s, gates on `curr.IsActive`, filters by resolved `FireOn`, and exposes one used lifecycle reset/prune path.
- [ ] `Muted` has been replaced by `AudioMuted` through catalog records, resolver, event payload, and tests with no compatibility alias left behind.
- [ ] `BossMod.Core.Audio` has host tests for malformed WAV files, deterministic built-in tone generation, and per-name rate limiting.
- [ ] `StateJson.Read` returns data plus status; corrupt/unsupported/missing state is visible to callers instead of silently pretending to load.
- [ ] `StateFlusher` marks dirty only when told a persisted change occurred and keeps dirty pending after write failures.
- [ ] UI contracts are pure view inputs; UI files do not probe IL2CPP game state.
- [ ] `SoundPlayer` consumes `Globals.Muted` and `Globals.MasterVolume`; it does not own separate persisted settings.
- [ ] `AlertSubscriber` remains thin and does not inspect catalog records or resolve inheritance.
- [ ] `BossMod.cs` no longer renders the demo window and owns only lifecycle/conductor ordering.
- [ ] Each committed task has run its listed verification commands and ended in a buildable/testable state.

## Checkpoint

Pause after completing this plan. Do not start Plan 4 until the Plan 3 implementation is reviewed. The checkpoint review should verify the clean-cutover contracts before any full UI/settings surfaces are added.
