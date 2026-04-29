# BossMod Plan 3 — Audio + UI windows

> **For agentic workers:** REQUIRED SUB-SKILL: Use skill://superpowers:subagent-driven-development (recommended) or skill://superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the user-facing surface — synthesized + user-WAV audio playback, and the five ImGui windows (CastBar, Cooldown, BuffTracker, AlertOverlay, Settings). Audio is event-driven from `AlertEvent`s; windows are pure render functions over `BossState[]` + `SkillCatalog`.

**Architecture:** All UI files live in `mods/BossMod/Ui/`, take `BossState[]` and `SkillCatalog` references in their constructors, and expose a `Render()` method called from `BossMod.OnLayout`. WAV header parsing is a pure function in `BossMod.Core` (host-testable). Tone synthesis and `AudioClip.Create` calls live in `mods/BossMod/Audio/` because they touch IL2CPP `Il2Cpp.UnityEngine.AudioClip`.

**Tech Stack:** ImGui.NET, IL2CPP `Il2Cpp.UnityEngine.AudioClip`/`AudioSource`, xunit (host-side for WAV).

**Spec:** `docs/superpowers/specs/2026-04-29-bossmod-design.md`

**Out of scope:** Config Mode (plan 4), hotkeys (plan 4), wiring BossMod.cs end-to-end (plan 4), `state.json` flush triggering (plan 4). UI windows are written but are paint-only; their toggles + rebind UI come in plan 4.

**Depends on:** Plans 1 + 2 committed.

---

## File Structure

| Path | Responsibility | Status |
|---|---|---|
| `mods/BossMod.Core/Audio/WavHeader.cs` | Pure RIFF/PCM header parser | Create |
| `tests/BossMod.Core.Tests/WavHeaderTests.cs` | Pure tests | Create |
| `mods/BossMod/Audio/SoundBank.cs` | Built-in tone generation + user WAV registration | Create |
| `mods/BossMod/Audio/SoundPlayer.cs` | Hidden `GameObject` + `AudioSource` + anti-spam | Create |
| `mods/BossMod/Audio/AlertSubscriber.cs` | Listens to `AlertEngine` output, dispatches sound + overlay push | Create |
| `mods/BossMod/Ui/GroupableTable.cs` | Generic groupable/sortable/filterable ImGui table | Create |
| `mods/BossMod/Ui/CastBarWindow.cs` | Vertical stack of cast bars | Create |
| `mods/BossMod/Ui/CooldownWindow.cs` | Sectioned per-boss skill cooldown list | Create |
| `mods/BossMod/Ui/BuffTrackerWindow.cs` | Sectioned per-boss buff/debuff list + "On You" | Create |
| `mods/BossMod/Ui/AlertOverlay.cs` | Ephemeral text alert stack | Create |
| `mods/BossMod/Ui/SettingsWindow.cs` | Tabbed settings panel | Create |
| `mods/BossMod/Ui/Tabs/SkillsTab.cs` | Skills tab content | Create |
| `mods/BossMod/Ui/Tabs/BossesTab.cs` | Bosses tab content | Create |
| `mods/BossMod/Ui/Tabs/SoundsTab.cs` | Sounds tab content | Create |
| `mods/BossMod/Ui/Tabs/GeneralTab.cs` | General tab content | Create |
| `mods/BossMod/Ui/Tabs/ExportImportTab.cs` | Export/Import tab content | Create |
| `mods/BossMod/Ui/Theme.cs` | Threat-tier color constants + tier-formatting helpers | Create |

---

## Task 1: WAV header parser (TDD)

**Files:**
- Create: `tests/BossMod.Core.Tests/WavHeaderTests.cs`
- Create: `mods/BossMod.Core/Audio/WavHeader.cs`

Pure parser. Validates RIFF/WAVE signatures, extracts sample rate / channel count / bit depth, returns the byte offset + length of the sample payload. Supports 16-bit PCM mono/stereo at any sample rate. Stereo down-mixed to mono later by `SoundBank` (Unity `AudioSource` plays mono fine; saves clip memory).

- [ ] **Step 1: Write failing tests**

`tests/BossMod.Core.Tests/WavHeaderTests.cs`:

```csharp
using System;
using BossMod.Core.Audio;
using Xunit;

namespace BossMod.Core.Tests;

public class WavHeaderTests
{
    /// <summary>
    /// Build a minimal valid 16-bit PCM WAV blob for tests.
    /// </summary>
    private static byte[] BuildPcmWav(short channels, int sampleRate, short bitsPerSample, byte[] samples)
    {
        int dataSize = samples.Length;
        int byteRate = sampleRate * channels * bitsPerSample / 8;
        short blockAlign = (short)(channels * bitsPerSample / 8);

        using var ms = new System.IO.MemoryStream();
        using var w = new System.IO.BinaryWriter(ms);
        w.Write(System.Text.Encoding.ASCII.GetBytes("RIFF"));
        w.Write(36 + dataSize);
        w.Write(System.Text.Encoding.ASCII.GetBytes("WAVE"));
        w.Write(System.Text.Encoding.ASCII.GetBytes("fmt "));
        w.Write(16);            // fmt chunk size
        w.Write((short)1);      // PCM
        w.Write(channels);
        w.Write(sampleRate);
        w.Write(byteRate);
        w.Write(blockAlign);
        w.Write(bitsPerSample);
        w.Write(System.Text.Encoding.ASCII.GetBytes("data"));
        w.Write(dataSize);
        w.Write(samples);
        return ms.ToArray();
    }

    [Fact]
    public void Parse_Mono16PcmAt22050_ParsesAllFields()
    {
        var bytes = BuildPcmWav(channels: 1, sampleRate: 22050, bitsPerSample: 16, samples: new byte[200]);
        var h = WavHeader.Parse(bytes);
        Assert.Equal(1, h.Channels);
        Assert.Equal(22050, h.SampleRate);
        Assert.Equal(16, h.BitsPerSample);
        Assert.Equal(200, h.DataLength);
        Assert.Equal(44, h.DataOffset);
    }

    [Fact]
    public void Parse_Stereo16PcmAt44100_ParsesAllFields()
    {
        var bytes = BuildPcmWav(channels: 2, sampleRate: 44100, bitsPerSample: 16, samples: new byte[400]);
        var h = WavHeader.Parse(bytes);
        Assert.Equal(2, h.Channels);
        Assert.Equal(44100, h.SampleRate);
    }

    [Fact]
    public void Parse_NonRiff_Throws()
    {
        var bytes = new byte[64];
        Array.Copy(System.Text.Encoding.ASCII.GetBytes("NOT_RIFF"), bytes, 8);
        Assert.Throws<WavFormatException>(() => WavHeader.Parse(bytes));
    }

    [Fact]
    public void Parse_NonPcm_Throws()
    {
        var bytes = BuildPcmWav(1, 22050, 16, new byte[40]);
        // Patch format code from 1 (PCM) to 3 (IEEE float)
        bytes[20] = 3;
        Assert.Throws<WavFormatException>(() => WavHeader.Parse(bytes));
    }

    [Fact]
    public void Parse_TruncatedFile_Throws()
    {
        Assert.Throws<WavFormatException>(() => WavHeader.Parse(new byte[10]));
    }

    [Fact]
    public void ToFloatSamples_Mono16_ConvertsToMinusOnePlusOneRange()
    {
        // Two samples: short.MinValue, short.MaxValue → -1, +1 (approx)
        var samples = new byte[] { 0x00, 0x80,  0xff, 0x7f };  // little-endian
        var bytes = BuildPcmWav(1, 22050, 16, samples);
        var h = WavHeader.Parse(bytes);
        var floats = WavHeader.ToFloatSamples(bytes, h);
        Assert.Equal(2, floats.Length);
        Assert.InRange(floats[0], -1.001f, -0.999f);
        Assert.InRange(floats[1],  0.999f,  1.001f);
    }

    [Fact]
    public void ToFloatSamples_Stereo16_DownmixesToMono_AveragesChannels()
    {
        // Frame 1: L=+max, R=-max → 0
        // Frame 2: L=+max, R=+max → +1
        var samples = new byte[]
        {
            0xff, 0x7f,  0x00, 0x80,  // frame 1
            0xff, 0x7f,  0xff, 0x7f,  // frame 2
        };
        var bytes = BuildPcmWav(2, 22050, 16, samples);
        var h = WavHeader.Parse(bytes);
        var floats = WavHeader.ToFloatSamples(bytes, h);
        Assert.Equal(2, floats.Length);
        Assert.InRange(floats[0], -0.001f, 0.001f);
        Assert.InRange(floats[1],  0.999f, 1.001f);
    }
}
```

- [ ] **Step 2: Run, expect fail**

```bash
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj --filter "FullyQualifiedName~WavHeaderTests"
```

- [ ] **Step 3: Implement `WavHeader`**

`mods/BossMod.Core/Audio/WavHeader.cs`:

```csharp
using System;
using System.Text;

namespace BossMod.Core.Audio;

public sealed class WavFormatException : Exception
{
    public WavFormatException(string msg) : base(msg) { }
}

public readonly record struct WavHeader(
    int Channels,
    int SampleRate,
    int BitsPerSample,
    int DataOffset,
    int DataLength)
{
    public static WavHeader Parse(byte[] bytes)
    {
        if (bytes.Length < 44) throw new WavFormatException("file too small to be WAV");
        if (Encoding.ASCII.GetString(bytes, 0, 4) != "RIFF") throw new WavFormatException("not a RIFF file");
        if (Encoding.ASCII.GetString(bytes, 8, 4) != "WAVE") throw new WavFormatException("not a WAVE file");

        // Find "fmt " and "data" chunks (skipping any in between, e.g. LIST/INFO)
        int idx = 12;
        WavHeader? fmt = null;
        int dataOffset = -1, dataLen = -1;

        while (idx + 8 <= bytes.Length)
        {
            var id = Encoding.ASCII.GetString(bytes, idx, 4);
            int chunkSize = BitConverter.ToInt32(bytes, idx + 4);
            int chunkStart = idx + 8;
            if (id == "fmt ")
            {
                if (chunkSize < 16) throw new WavFormatException("fmt chunk too small");
                short format = BitConverter.ToInt16(bytes, chunkStart);
                if (format != 1) throw new WavFormatException($"unsupported PCM format code {format}, only 1 (PCM) supported");
                fmt = new WavHeader(
                    Channels: BitConverter.ToInt16(bytes, chunkStart + 2),
                    SampleRate: BitConverter.ToInt32(bytes, chunkStart + 4),
                    BitsPerSample: BitConverter.ToInt16(bytes, chunkStart + 14),
                    DataOffset: 0, DataLength: 0);
            }
            else if (id == "data")
            {
                dataOffset = chunkStart;
                dataLen = chunkSize;
                break;
            }
            idx = chunkStart + chunkSize;
            if ((chunkSize & 1) != 0) idx++; // RIFF chunks are word-aligned
        }

        if (fmt == null) throw new WavFormatException("missing fmt chunk");
        if (dataOffset < 0 || dataLen < 0) throw new WavFormatException("missing data chunk");
        if (fmt.Value.BitsPerSample != 16) throw new WavFormatException("only 16-bit PCM supported");

        return fmt.Value with { DataOffset = dataOffset, DataLength = dataLen };
    }

    /// <summary>
    /// Converts the data payload into mono float samples in [-1, +1].
    /// Stereo is averaged into mono (L+R)/2 to keep clip memory small and
    /// AudioSource handling simple.
    /// </summary>
    public static float[] ToFloatSamples(byte[] bytes, WavHeader header)
    {
        int sampleSize = header.BitsPerSample / 8;
        int frameSize = sampleSize * header.Channels;
        int frameCount = header.DataLength / frameSize;
        var floats = new float[frameCount];

        for (int f = 0; f < frameCount; f++)
        {
            float sum = 0f;
            for (int c = 0; c < header.Channels; c++)
            {
                int off = header.DataOffset + f * frameSize + c * sampleSize;
                short s = BitConverter.ToInt16(bytes, off);
                sum += s / 32768f;
            }
            floats[f] = sum / header.Channels;
        }
        return floats;
    }
}
```

- [ ] **Step 4: Run, expect green; commit**

```bash
dotnet test tests/BossMod.Core.Tests/BossMod.Core.Tests.csproj --filter "FullyQualifiedName~WavHeaderTests"
git add mods/BossMod.Core/Audio/ tests/BossMod.Core.Tests/WavHeaderTests.cs
git commit -m "feat(bossmod): add pure WAV header parser with mono downmix"
```

---

## Task 2: SoundBank — synthesized tones + user WAV loading

**Files:**
- Create: `mods/BossMod/Audio/SoundBank.cs`

Tones generated at init via `AudioClip.Create(name, lengthSamples, channels, freq, false)` + `clip.SetData`. Six built-ins (`low`, `medium`, `high`, `critical`, `chime`, `klaxon`). User WAVs scanned from `UserData/BossMod/Sounds/*.wav`.

- [ ] **Step 1: Write `SoundBank`**

```csharp
using System;
using System.Collections.Generic;
using System.IO;
using BossMod.Core.Audio;
using Il2CppInterop.Runtime.InteropTypes.Arrays;
using MelonLoader;
using Il2CppUnityEngine = Il2Cpp.UnityEngine;

namespace BossMod.Audio;

public sealed class SoundBank
{
    private readonly MelonLogger.Instance _log;
    private readonly string _userSoundsDir;
    private readonly Dictionary<string, Il2CppUnityEngine.AudioClip> _clips = new();

    public IReadOnlyDictionary<string, Il2CppUnityEngine.AudioClip> Clips => _clips;

    public SoundBank(MelonLogger.Instance log, string userSoundsDir)
    {
        _log = log;
        _userSoundsDir = userSoundsDir;
    }

    public void Initialize()
    {
        Directory.CreateDirectory(_userSoundsDir);

        // Built-in tones
        Add("low",      Tone.Sine(220, 0.25f));
        Add("medium",   Tone.Sine(440, 0.25f));
        Add("high",     Tone.Sine(880, 0.30f));
        Add("critical", Tone.TriplePulse(1320, 0.10f, 0.05f));
        Add("chime",    Tone.Sweep(440, 880, 0.40f));
        Add("klaxon",   Tone.SquareAlternating(440, 660, 0.50f, 0.10f));

        RescanUserWavs();
    }

    private void Add(string name, float[] samples)
    {
        const int sampleRate = 22050;
        var clip = Il2CppUnityEngine.AudioClip.Create(name, samples.Length, 1, sampleRate, false);
        clip.SetData(new Il2CppStructArray<float>(samples), 0);
        _clips[name] = clip;
    }

    public void RescanUserWavs()
    {
        if (!Directory.Exists(_userSoundsDir)) return;
        foreach (var path in Directory.EnumerateFiles(_userSoundsDir, "*.wav"))
        {
            var name = Path.GetFileNameWithoutExtension(path);
            if (_clips.ContainsKey(name)) continue; // built-in or already loaded
            try
            {
                var bytes = File.ReadAllBytes(path);
                var header = WavHeader.Parse(bytes);
                var samples = WavHeader.ToFloatSamples(bytes, header);

                var clip = Il2CppUnityEngine.AudioClip.Create(name, samples.Length, 1, header.SampleRate, false);
                clip.SetData(new Il2CppStructArray<float>(samples), 0);
                _clips[name] = clip;
                _log.Msg($"Loaded user sound '{name}' ({samples.Length} samples @ {header.SampleRate}Hz)");
            }
            catch (Exception ex)
            {
                _log.Warning($"Failed to load WAV '{path}': {ex.Message}");
            }
        }
    }

    public Il2CppUnityEngine.AudioClip? Get(string name) =>
        _clips.TryGetValue(name, out var clip) ? clip : null;

    public IEnumerable<string> Names => _clips.Keys;
}
```

- [ ] **Step 2: Add `mods/BossMod/Audio/Tone.cs`** — pure sample generation

```csharp
using System;

namespace BossMod.Audio;

/// <summary>Synthesis helpers — produce mono float samples in [-1, +1].</summary>
internal static class Tone
{
    private const int SampleRate = 22050;

    public static float[] Sine(float frequency, float seconds)
    {
        int n = (int)(SampleRate * seconds);
        var s = new float[n];
        for (int i = 0; i < n; i++)
        {
            float t = (float)i / SampleRate;
            float env = Envelope(i, n);
            s[i] = env * MathF.Sin(2f * MathF.PI * frequency * t);
        }
        return s;
    }

    public static float[] TriplePulse(float frequency, float pulseSeconds, float gapSeconds)
    {
        int pulseN = (int)(SampleRate * pulseSeconds);
        int gapN = (int)(SampleRate * gapSeconds);
        int n = pulseN * 3 + gapN * 2;
        var s = new float[n];
        int idx = 0;
        for (int p = 0; p < 3; p++)
        {
            for (int i = 0; i < pulseN; i++, idx++)
            {
                float t = (float)i / SampleRate;
                s[idx] = Envelope(i, pulseN) * MathF.Sin(2f * MathF.PI * frequency * t);
            }
            if (p < 2) idx += gapN; // silence gap
        }
        return s;
    }

    public static float[] Sweep(float startHz, float endHz, float seconds)
    {
        int n = (int)(SampleRate * seconds);
        var s = new float[n];
        double phase = 0;
        for (int i = 0; i < n; i++)
        {
            float t = (float)i / SampleRate;
            float freq = startHz + (endHz - startHz) * t / seconds;
            phase += 2.0 * MathF.PI * freq / SampleRate;
            s[i] = Envelope(i, n) * MathF.Sin((float)phase);
        }
        return s;
    }

    public static float[] SquareAlternating(float aHz, float bHz, float totalSeconds, float toggleSeconds)
    {
        int n = (int)(SampleRate * totalSeconds);
        int toggleN = (int)(SampleRate * toggleSeconds);
        var s = new float[n];
        for (int i = 0; i < n; i++)
        {
            float freq = ((i / toggleN) % 2 == 0) ? aHz : bHz;
            float t = (float)i / SampleRate;
            float square = MathF.Sin(2f * MathF.PI * freq * t) > 0 ? 1f : -1f;
            s[i] = Envelope(i, n) * square * 0.7f;
        }
        return s;
    }

    /// <summary>Linear attack (5ms) + linear decay over the rest.</summary>
    private static float Envelope(int i, int total)
    {
        const int attackN = 110; // ~5ms at 22050
        if (i < attackN) return (float)i / attackN;
        return 1f - (float)(i - attackN) / (total - attackN);
    }
}
```

- [ ] **Step 3: Build, commit**

```bash
dotnet run --project build-tool build
git add mods/BossMod/Audio/SoundBank.cs mods/BossMod/Audio/Tone.cs
git commit -m "feat(bossmod): add SoundBank with synthesized tones + user WAVs"
```

---

## Task 3: SoundPlayer + AlertSubscriber

**Files:**
- Create: `mods/BossMod/Audio/SoundPlayer.cs`
- Create: `mods/BossMod/Audio/AlertSubscriber.cs`

`SoundPlayer` owns a hidden `GameObject` with an `AudioSource` and exposes `Play(name)` with anti-spam. `AlertSubscriber` is the glue between `AlertEngine` output and audio + alert-overlay text push.

- [ ] **Step 1: `SoundPlayer.cs`**

```csharp
using System.Collections.Generic;
using Il2CppUnityEngine = Il2Cpp.UnityEngine;
using MelonLoader;

namespace BossMod.Audio;

public sealed class SoundPlayer
{
    private readonly MelonLogger.Instance _log;
    private readonly SoundBank _bank;
    private Il2CppUnityEngine.AudioSource? _source;
    private readonly Dictionary<string, double> _lastPlayedAt = new();
    private const double AntiSpamSeconds = 0.2;

    public float MasterVolume { get; set; } = 1f;
    public bool MasterMute { get; set; }

    public SoundPlayer(MelonLogger.Instance log, SoundBank bank)
    {
        _log = log;
        _bank = bank;
    }

    public void Initialize()
    {
        var go = new Il2CppUnityEngine.GameObject("BossMod_Audio");
        Il2CppUnityEngine.Object.DontDestroyOnLoad(go);
        go.hideFlags = Il2CppUnityEngine.HideFlags.HideAndDontSave;
        _source = go.AddComponent<Il2CppUnityEngine.AudioSource>();
        _source.playOnAwake = false;
        _source.spatialBlend = 0f; // 2D
    }

    public void Play(string name)
    {
        if (MasterMute || _source == null) return;

        var now = Il2CppUnityEngine.Time.unscaledTimeAsDouble;
        if (_lastPlayedAt.TryGetValue(name, out var last) && now - last < AntiSpamSeconds) return;
        _lastPlayedAt[name] = now;

        var clip = _bank.Get(name);
        if (clip == null) { _log.Warning($"Sound not found: {name}"); return; }

        _source.PlayOneShot(clip, MasterVolume);
    }
}
```

- [ ] **Step 2: `AlertSubscriber.cs`**

```csharp
using BossMod.Core.Alerts;
using BossMod.Core.Catalog;
using BossMod.Ui;

namespace BossMod.Audio;

/// <summary>
/// Routes AlertEvents to audio + alert overlay. Honors per-skill `FireOn`
/// filtering: e.g. a skill configured for `CooldownReady` ignores CastStart events.
/// </summary>
public sealed class AlertSubscriber
{
    private readonly SoundPlayer _audio;
    private readonly AlertOverlay _overlay;
    private readonly SkillCatalog _catalog;

    public AlertSubscriber(SoundPlayer audio, AlertOverlay overlay, SkillCatalog catalog)
    {
        _audio = audio;
        _overlay = overlay;
        _catalog = catalog;
    }

    public void Handle(AlertEvent ev)
    {
        if (!FireOnMatches(ev)) return;
        if (!ev.Muted) _audio.Play(ev.EffectiveSound);
        if (!string.IsNullOrEmpty(ev.EffectiveAlertText))
            _overlay.Push(ev);
    }

    private bool FireOnMatches(AlertEvent ev)
    {
        if (!_catalog.Skills.TryGetValue(ev.SkillId, out var s)) return ev.Trigger == AlertTrigger.CastStart;
        if (!_catalog.Bosses.TryGetValue(ev.BossId, out var b)) return ev.Trigger == AlertTrigger.CastStart;
        if (!b.Skills.TryGetValue(ev.SkillId, out var bs)) return ev.Trigger == AlertTrigger.CastStart;
        var fire = bs.FireOn ?? s.FireOn ?? AlertTrigger.CastStart;
        return ev.Trigger == fire;
    }
}
```

- [ ] **Step 3: Build, commit (will fail referencing AlertOverlay until Task 7 — OK)**

```bash
dotnet run --project build-tool build
```

Expected: build fails referencing `BossMod.Ui.AlertOverlay`. Hold the commit.

---

## Task 4: Theme + tier colors

**Files:**
- Create: `mods/BossMod/Ui/Theme.cs`

- [ ] **Step 1: Write file**

```csharp
using System.Numerics;
using BossMod.Core.Catalog;

namespace BossMod.Ui;

/// <summary>Threat-tier colors and small formatting helpers.</summary>
public static class Theme
{
    // ABGR-packed for ImGui
    public static uint ColorOf(ThreatTier tier) => tier switch
    {
        ThreatTier.Critical => 0xFF2020E0,  // bright red
        ThreatTier.High     => 0xFF20A0E0,  // orange
        ThreatTier.Medium   => 0xFF20E0E0,  // yellow
        ThreatTier.Low      => 0xFF60FF60,  // green
        _ => 0xFFFFFFFF,
    };

    public static Vector4 Vec(ThreatTier tier)
    {
        uint c = ColorOf(tier);
        return new Vector4(
            (c & 0xFF) / 255f,
            ((c >> 8) & 0xFF) / 255f,
            ((c >> 16) & 0xFF) / 255f,
            ((c >> 24) & 0xFF) / 255f);
    }

    public static string Label(ThreatTier tier) => tier.ToString().ToUpperInvariant();
}
```

- [ ] **Step 2: Build, commit**

```bash
dotnet run --project build-tool build
git add mods/BossMod/Ui/Theme.cs
git commit -m "feat(bossmod): add UI Theme with tier colors"
```

---

## Task 5: GroupableTable widget

**Files:**
- Create: `mods/BossMod/Ui/GroupableTable.cs`

Generic, used by Skills/Bosses/Sounds tabs. Takes rows, group-key selector, sort-key selector, filter predicate; renders an ImGui table with `CollapsingHeader` per group.

- [ ] **Step 1: Write file**

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using ImGuiNET;

namespace BossMod.Ui;

public sealed class GroupableTable<T>
{
    public Func<T, string> GroupBy { get; set; } = _ => "";
    public Func<T, IComparable> SortBy { get; set; } = _ => "";
    public Func<T, string, bool> Matches { get; set; } = (_, _) => true;
    public Action<T> RowRenderer { get; set; } = _ => { };
    public string Filter { get; set; } = "";

    public void Render(string id, IEnumerable<T> rows)
    {
        ImGui.PushID(id);
        ImGui.InputText("Filter", ref Filter, 128);

        var filtered = rows.Where(r => string.IsNullOrEmpty(Filter) || Matches(r, Filter));
        var grouped = filtered
            .GroupBy(GroupBy)
            .OrderBy(g => g.Key, StringComparer.OrdinalIgnoreCase);

        foreach (var group in grouped)
        {
            if (ImGui.CollapsingHeader($"{group.Key} ({group.Count()})##{id}_{group.Key}"))
            {
                ImGui.Indent();
                foreach (var row in group.OrderBy(SortBy))
                    RowRenderer(row);
                ImGui.Unindent();
            }
        }
        ImGui.PopID();
    }
}
```

- [ ] **Step 2: Build, commit**

```bash
dotnet run --project build-tool build
git add mods/BossMod/Ui/GroupableTable.cs
git commit -m "feat(bossmod): add generic GroupableTable widget"
```

---

## Task 6: CastBarWindow, CooldownWindow, BuffTrackerWindow

**Files:**
- Create: `mods/BossMod/Ui/CastBarWindow.cs`
- Create: `mods/BossMod/Ui/CooldownWindow.cs`
- Create: `mods/BossMod/Ui/BuffTrackerWindow.cs`

Each takes `IReadOnlyList<BossState>` + `SkillCatalog` + `Globals` and renders. All click-through (`NoInputs | NoTitleBar | NoBackground | NoMove | NoResize | NoScrollbar`) in normal mode; Plan 4 swaps these flags via Config Mode.

- [ ] **Step 1: `CastBarWindow.cs`**

```csharp
using System.Collections.Generic;
using System.Linq;
using BossMod.Core.Catalog;
using BossMod.Core.Effects;
using BossMod.Core.Persistence;
using BossMod.Core.Tracking;
using ImGuiNET;

namespace BossMod.Ui;

public sealed class CastBarWindow
{
    private readonly SkillCatalog _catalog;
    private readonly Globals _globals;
    public bool Locked { get; set; } = true;

    public CastBarWindow(SkillCatalog catalog, Globals globals)
    {
        _catalog = catalog;
        _globals = globals;
    }

    public void Render(IReadOnlyList<BossState> states)
    {
        if (!_globals.ShowCastBarWindow) return;

        var casting = states.Where(s => s.IsActive && s.ActiveCast.HasValue).ToList();
        var ranked = casting
            .Select(s => new { State = s, Cast = s.ActiveCast!.Value, Threat = ThreatOf(s, s.ActiveCast!.Value.SkillId) })
            .OrderByDescending(x => x.Threat)
            .ThenBy(x => x.Cast.CastTimeEnd - x.State.ServerTime)
            .Take(_globals.MaxCastBars)
            .ToList();
        var overflow = casting.Count - ranked.Count;

        var flags = Locked
            ? ImGuiWindowFlags.NoInputs | ImGuiWindowFlags.NoTitleBar | ImGuiWindowFlags.NoBackground
              | ImGuiWindowFlags.NoMove | ImGuiWindowFlags.NoResize | ImGuiWindowFlags.NoScrollbar
            : ImGuiWindowFlags.None;

        ImGui.SetNextWindowSize(new System.Numerics.Vector2(380, 0), ImGuiCond.FirstUseEver);
        ImGui.SetNextWindowPos(new System.Numerics.Vector2(System.Numerics.Vector2.Zero.X + 480, 20), ImGuiCond.FirstUseEver);
        if (!ImGui.Begin("BossMod Cast Bars", flags)) { ImGui.End(); return; }

        if (ranked.Count == 0)
        {
            // Render an empty 1px space so the window doesn't collapse to nothing
            // when no one is casting; prevents flicker.
            ImGui.Dummy(new System.Numerics.Vector2(0, 1));
        }

        foreach (var x in ranked)
        {
            float now = (float)x.State.ServerTime;
            float remaining = (float)(x.Cast.CastTimeEnd - x.State.ServerTime);
            if (remaining < 0) remaining = 0;
            float progress = x.Cast.TotalCastTime > 0
                ? 1f - remaining / x.Cast.TotalCastTime
                : 1f;

            ImGui.PushStyleColor(ImGuiCol.PlotHistogram, Theme.Vec(x.Threat));
            ImGui.ProgressBar(progress,
                new System.Numerics.Vector2(-1, 28),
                $"{x.State.DisplayName}: {x.Cast.DisplayName}  ({remaining:0.0}s)");
            ImGui.PopStyleColor();
        }

        if (overflow > 0)
        {
            ImGui.TextDisabled($"+{overflow} more casting");
        }

        ImGui.End();
    }

    private ThreatTier ThreatOf(BossState s, string skillId)
    {
        if (!_catalog.Skills.TryGetValue(skillId, out var sr)) return ThreatTier.Low;
        if (!_catalog.Bosses.TryGetValue(s.BossId, out var br)) return ThreatTier.Low;
        if (!br.Skills.TryGetValue(skillId, out var bsr)) return ThreatTier.Low;
        return SettingsResolver.ResolveThreat(sr, bsr);
    }
}
```

- [ ] **Step 2: `CooldownWindow.cs`**

```csharp
using System.Collections.Generic;
using System.Linq;
using BossMod.Core.Catalog;
using BossMod.Core.Persistence;
using BossMod.Core.Tracking;
using ImGuiNET;
using Il2Cpp;
using UnityEngine;

namespace BossMod.Ui;

public sealed class CooldownWindow
{
    private readonly SkillCatalog _catalog;
    private readonly Globals _globals;
    public bool Locked { get; set; } = true;

    public CooldownWindow(SkillCatalog catalog, Globals globals)
    {
        _catalog = catalog;
        _globals = globals;
    }

    public void Render(IReadOnlyList<BossState> states)
    {
        if (!_globals.ShowCooldownWindow) return;
        var active = states.Where(s => s.IsActive).ToList();
        if (active.Count == 0) return;

        var flags = Locked
            ? ImGuiWindowFlags.NoInputs | ImGuiWindowFlags.NoTitleBar | ImGuiWindowFlags.NoBackground
              | ImGuiWindowFlags.NoMove | ImGuiWindowFlags.NoResize | ImGuiWindowFlags.NoScrollbar
            : ImGuiWindowFlags.None;

        ImGui.SetNextWindowSize(new System.Numerics.Vector2(360, 400), ImGuiCond.FirstUseEver);
        if (!ImGui.Begin("BossMod Cooldowns", flags)) { ImGui.End(); return; }

        var targetedBoss = TargetedBossId();
        var ordered = active
            .OrderByDescending(s => s.BossId == targetedBoss)
            .ThenBy(s => DistanceToPlayer(s));

        foreach (var s in ordered)
        {
            int hpPct = s.HealthMax > 0 ? (s.HealthCurrent * 100 / s.HealthMax) : 0;
            string header = $"{s.DisplayName} · Lvl {s.Level} · {hpPct}%##{s.NetId}";

            bool defaultOpen = s.BossId == targetedBoss;
            if (_globals.ExpansionDefault == "expand_all") defaultOpen = true;
            else if (_globals.ExpansionDefault == "collapse_all") defaultOpen = false;

            ImGui.SetNextItemOpen(defaultOpen, ImGuiCond.FirstUseEver);
            if (ImGui.CollapsingHeader(header))
            {
                var sorted = s.Cooldowns
                    .Select(c => new { Cd = c, Remaining = c.CooldownEnd - s.ServerTime })
                    .OrderBy(x => x.Remaining < 0 ? double.NegativeInfinity : x.Remaining);

                foreach (var x in sorted)
                {
                    ImGui.PushID(x.Cd.SkillIdx);
                    if (x.Remaining <= 0)
                    {
                        ImGui.TextColored(new System.Numerics.Vector4(0.4f, 1f, 0.4f, 1f),
                            $"  {x.Cd.DisplayName}    READY");
                    }
                    else
                    {
                        float prog = x.Cd.TotalCooldown > 0
                            ? 1f - (float)(x.Remaining / x.Cd.TotalCooldown)
                            : 0f;
                        ImGui.Text($"  {x.Cd.DisplayName}");
                        ImGui.SameLine();
                        ImGui.ProgressBar(prog, new System.Numerics.Vector2(180, 16), $"{x.Remaining:0.0}s");
                    }
                    ImGui.PopID();
                }
            }
        }

        ImGui.End();
    }

    private static string TargetedBossId()
    {
        var p = Il2Cpp.Player.localPlayer;
        if (p?.Networktarget is Il2Cpp.Monster m && m.health != null && m.health.current > 0)
            return m.name?.Replace("(Clone)", "").Trim() ?? "";
        return "";
    }

    private static float DistanceToPlayer(BossState s)
    {
        var p = Il2Cpp.Player.localPlayer;
        if (p == null) return float.MaxValue;
        var pp = p.transform.position;
        var dx = s.PositionX - pp.x;
        var dy = s.PositionY - pp.y;
        return (float)System.Math.Sqrt(dx * dx + dy * dy);
    }
}
```

- [ ] **Step 3: `BuffTrackerWindow.cs`**

```csharp
using System.Collections.Generic;
using System.Linq;
using BossMod.Core.Catalog;
using BossMod.Core.Persistence;
using BossMod.Core.Tracking;
using ImGuiNET;
using Il2Cpp;

namespace BossMod.Ui;

public sealed class BuffTrackerWindow
{
    private readonly SkillCatalog _catalog;
    private readonly Globals _globals;
    public bool Locked { get; set; } = true;

    public BuffTrackerWindow(SkillCatalog catalog, Globals globals)
    {
        _catalog = catalog;
        _globals = globals;
    }

    public void Render(IReadOnlyList<BossState> states)
    {
        if (!_globals.ShowBuffTrackerWindow) return;
        var active = states.Where(s => s.IsActive).ToList();
        // "On You" can render even with no active boss (lingering DoT)

        var flags = Locked
            ? ImGuiWindowFlags.NoInputs | ImGuiWindowFlags.NoTitleBar | ImGuiWindowFlags.NoBackground
              | ImGuiWindowFlags.NoMove | ImGuiWindowFlags.NoResize | ImGuiWindowFlags.NoScrollbar
            : ImGuiWindowFlags.None;

        ImGui.SetNextWindowSize(new System.Numerics.Vector2(320, 360), ImGuiCond.FirstUseEver);
        if (!ImGui.Begin("BossMod Buffs", flags)) { ImGui.End(); return; }

        RenderOnYouSection();

        foreach (var s in active.OrderByDescending(s => s.BossId == TargetedBossId()))
        {
            ImGui.SetNextItemOpen(s.BossId == TargetedBossId(), ImGuiCond.FirstUseEver);
            if (ImGui.CollapsingHeader($"{s.DisplayName}##b_{s.NetId}"))
            {
                foreach (var b in s.Buffs)
                {
                    var col = b.IsAura
                        ? new System.Numerics.Vector4(0.7f, 0.4f, 1f, 1f)   // purple
                        : b.IsDebuff
                            ? new System.Numerics.Vector4(1f, 0.4f, 0.4f, 1f)
                            : new System.Numerics.Vector4(0.4f, 0.7f, 1f, 1f);
                    var remaining = b.BuffTimeEnd - s.ServerTime;
                    if (remaining < 0) remaining = 0;
                    ImGui.TextColored(col, $"  {b.DisplayName} ({remaining:0.0}s)");
                }
            }
        }

        ImGui.End();
    }

    private void RenderOnYouSection()
    {
        var p = Il2Cpp.Player.localPlayer;
        if (p?.skills?.buffs == null) return;
        var youBuffs = new List<(string Name, double End, bool IsDebuff)>();
        for (int i = 0; i < p.skills.buffs.Count; i++)
        {
            var b = p.skills.buffs[i];
            var d = b.data;
            if (d == null) continue;
            // Only surface buffs whose source skill exists in our catalog
            // (i.e. the user has seen a boss cast it) AND that boss is in registry.
            if (!_catalog.Skills.ContainsKey(d.name)) continue;
            youBuffs.Add((string.IsNullOrEmpty(d.nameSkill) ? d.name : d.nameSkill,
                          b.buffTimeEnd,
                          d is Il2Cpp.AreaDebuffSkill or Il2Cpp.TargetDebuffSkill));
        }
        if (youBuffs.Count == 0) return;

        ImGui.SetNextItemOpen(true, ImGuiCond.Always);
        if (ImGui.CollapsingHeader("On You"))
        {
            double now = ServerTime();
            foreach (var (name, end, isDebuff) in youBuffs)
            {
                var col = isDebuff
                    ? new System.Numerics.Vector4(1f, 0.4f, 0.4f, 1f)
                    : new System.Numerics.Vector4(0.4f, 0.7f, 1f, 1f);
                var remaining = end - now;
                if (remaining < 0) remaining = 0;
                ImGui.TextColored(col, $"  {name} ({remaining:0.0}s)");
            }
        }
    }

    private static string TargetedBossId()
    {
        var p = Il2Cpp.Player.localPlayer;
        if (p?.Networktarget is Il2Cpp.Monster m && m.health != null && m.health.current > 0)
            return m.name?.Replace("(Clone)", "").Trim() ?? "";
        return "";
    }

    private static double ServerTime()
    {
        var nm = UnityEngine.Object.FindObjectOfType(Il2CppInterop.Runtime.Il2CppType.Of<Il2Cpp.NetworkManagerMMO>())
            ?.Cast<Il2Cpp.NetworkManagerMMO>();
        if (nm == null) return 0;
        return Il2CppMirror.NetworkTime.time + nm.offsetNetworkTime;
    }
}
```

- [ ] **Step 4: Build, commit**

```bash
dotnet run --project build-tool build
git add mods/BossMod/Ui/CastBarWindow.cs mods/BossMod/Ui/CooldownWindow.cs mods/BossMod/Ui/BuffTrackerWindow.cs
git commit -m "feat(bossmod): add CastBar, Cooldown, BuffTracker overlay windows"
```

---

## Task 7: AlertOverlay

**Files:**
- Create: `mods/BossMod/Ui/AlertOverlay.cs`

Stack of up to 4 ephemeral text alerts. Each entry has a TTL (3 s normal, 5 s critical). Coalesces same-`(BossId, SkillId)` into one entry with a `(×N)` count.

- [ ] **Step 1: Write file**

```csharp
using System.Collections.Generic;
using System.Linq;
using BossMod.Core.Alerts;
using BossMod.Core.Catalog;
using BossMod.Core.Persistence;
using ImGuiNET;
using Il2CppUnityEngine = Il2Cpp.UnityEngine;

namespace BossMod.Ui;

public sealed class AlertOverlay
{
    private readonly Globals _globals;
    private readonly List<Entry> _entries = new();
    private const int MaxEntries = 4;

    private struct Entry
    {
        public string Key;       // BossId|SkillId
        public string Text;
        public ThreatTier Tier;
        public int Count;
        public double SpawnedAt;
        public double Ttl;
    }

    public AlertOverlay(Globals globals) => _globals = globals;

    public void Push(AlertEvent ev)
    {
        if (string.IsNullOrEmpty(ev.EffectiveAlertText)) return;
        // Don't show alert text if global mute and the cascade flag says so
        if (_globals.Muted && _globals.AlertTextMuteOnMasterMute) return;

        var key = $"{ev.BossId}|{ev.SkillId}";
        var ttl = ev.EffectiveThreat == ThreatTier.Critical ? 5.0 : 3.0;
        var now = Il2CppUnityEngine.Time.unscaledTimeAsDouble;

        // Coalesce by key — increment count on existing entry instead of stacking
        for (int i = 0; i < _entries.Count; i++)
        {
            if (_entries[i].Key != key) continue;
            var e = _entries[i];
            e.Count++;
            e.SpawnedAt = now;
            e.Ttl = ttl;
            _entries[i] = e;
            return;
        }

        _entries.Add(new Entry
        {
            Key = key, Text = ev.EffectiveAlertText, Tier = ev.EffectiveThreat,
            Count = 1, SpawnedAt = now, Ttl = ttl
        });

        while (_entries.Count > MaxEntries) _entries.RemoveAt(0);
    }

    public void Render()
    {
        var now = Il2CppUnityEngine.Time.unscaledTimeAsDouble;
        _entries.RemoveAll(e => now - e.SpawnedAt > e.Ttl);
        if (_entries.Count == 0) return;

        var screenW = Il2CppUnityEngine.Screen.width;
        ImGui.SetNextWindowPos(new System.Numerics.Vector2(screenW / 2f, 60), ImGuiCond.Always, new System.Numerics.Vector2(0.5f, 0));
        ImGui.SetNextWindowBgAlpha(0f);
        var flags = ImGuiWindowFlags.NoInputs | ImGuiWindowFlags.NoTitleBar | ImGuiWindowFlags.NoBackground
                  | ImGuiWindowFlags.NoMove | ImGuiWindowFlags.NoResize | ImGuiWindowFlags.NoScrollbar
                  | ImGuiWindowFlags.AlwaysAutoResize;
        if (!ImGui.Begin("##BossMod_AlertOverlay", flags)) { ImGui.End(); return; }

        foreach (var e in _entries)
        {
            float age = (float)(now - e.SpawnedAt);
            float alpha = e.Ttl > 0 ? System.MathF.Max(0, 1f - age / (float)e.Ttl) : 1f;
            var col = Theme.Vec(e.Tier);
            col.W *= alpha;

            ImGui.PushStyleColor(ImGuiCol.Text, col);
            ImGui.SetWindowFontScale(1.7f);
            var label = e.Count > 1 ? $"{e.Text} (×{e.Count})" : e.Text;
            ImGui.TextUnformatted(label);
            ImGui.SetWindowFontScale(1.0f);
            ImGui.PopStyleColor();
        }

        ImGui.End();
    }
}
```

- [ ] **Step 2: Build, commit**

```bash
dotnet run --project build-tool build
git add mods/BossMod/Ui/AlertOverlay.cs
git commit -m "feat(bossmod): add AlertOverlay with TTL stack and coalescing"
```

---

## Task 8: SettingsWindow + tabs

**Files:**
- Create: `mods/BossMod/Ui/SettingsWindow.cs`
- Create: `mods/BossMod/Ui/Tabs/SkillsTab.cs`
- Create: `mods/BossMod/Ui/Tabs/BossesTab.cs`
- Create: `mods/BossMod/Ui/Tabs/SoundsTab.cs`
- Create: `mods/BossMod/Ui/Tabs/GeneralTab.cs`
- Create: `mods/BossMod/Ui/Tabs/ExportImportTab.cs`

Five tabs. Edits write directly into `SkillCatalog` / `Globals` references (debounced flush handled in plan 4 by `BossMod.cs`).

- [ ] **Step 1: `SettingsWindow.cs`**

```csharp
using BossMod.Audio;
using BossMod.Core.Catalog;
using BossMod.Core.Persistence;
using BossMod.Ui.Tabs;
using ImGuiNET;

namespace BossMod.Ui;

public sealed class SettingsWindow
{
    private readonly SkillsTab _skills;
    private readonly BossesTab _bosses;
    private readonly SoundsTab _sounds;
    private readonly GeneralTab _general;
    private readonly ExportImportTab _exportImport;
    private readonly Globals _globals;

    public bool Open { get; set; } = false;

    public SettingsWindow(SkillCatalog catalog, Globals globals, SoundBank bank, SoundPlayer player, string statePath)
    {
        _globals = globals;
        _skills = new SkillsTab(catalog, bank, player);
        _bosses = new BossesTab(catalog, bank, player);
        _sounds = new SoundsTab(bank, player);
        _general = new GeneralTab(globals);
        _exportImport = new ExportImportTab(catalog, globals, statePath);
    }

    public void Render()
    {
        if (!Open) return;
        ImGui.SetNextWindowSize(new System.Numerics.Vector2(640, 480), ImGuiCond.FirstUseEver);
        bool open = Open;
        if (!ImGui.Begin("BossMod Settings", ref open)) { Open = open; ImGui.End(); return; }
        Open = open;

        if (ImGui.BeginTabBar("##bossmod_tabs"))
        {
            if (ImGui.BeginTabItem("Skills"))   { _skills.Render(); ImGui.EndTabItem(); }
            if (ImGui.BeginTabItem("Bosses"))   { _bosses.Render(); ImGui.EndTabItem(); }
            if (ImGui.BeginTabItem("Sounds"))   { _sounds.Render(); ImGui.EndTabItem(); }
            if (ImGui.BeginTabItem("General"))  { _general.Render(); ImGui.EndTabItem(); }
            if (ImGui.BeginTabItem("Export/Import")) { _exportImport.Render(); ImGui.EndTabItem(); }
            ImGui.EndTabBar();
        }

        ImGui.End();
    }
}
```

- [ ] **Step 2: `SkillsTab.cs`**

```csharp
using System.Linq;
using BossMod.Audio;
using BossMod.Core.Catalog;
using ImGuiNET;

namespace BossMod.Ui.Tabs;

public sealed class SkillsTab
{
    private readonly SkillCatalog _catalog;
    private readonly SoundBank _bank;
    private readonly SoundPlayer _player;
    private readonly GroupableTable<SkillRecord> _table = new();
    private string? _selectedId;

    public SkillsTab(SkillCatalog catalog, SoundBank bank, SoundPlayer player)
    {
        _catalog = catalog;
        _bank = bank;
        _player = player;
        _table.GroupBy = s => s.RawSnapshot.SkillClass;
        _table.SortBy = s => s.DisplayName;
        _table.Matches = (s, q) => s.Id.Contains(q, System.StringComparison.OrdinalIgnoreCase)
                                || s.DisplayName.Contains(q, System.StringComparison.OrdinalIgnoreCase);
        _table.RowRenderer = RenderRow;
    }

    public void Render()
    {
        ImGui.Columns(2);
        ImGui.SetColumnWidth(0, 360);
        _table.Render("skills_tab", _catalog.Skills.Values);
        ImGui.NextColumn();
        RenderEditor();
        ImGui.Columns(1);
    }

    private void RenderRow(SkillRecord s)
    {
        if (ImGui.Selectable($"{s.DisplayName}##{s.Id}", _selectedId == s.Id))
            _selectedId = s.Id;
    }

    private void RenderEditor()
    {
        if (_selectedId == null || !_catalog.Skills.TryGetValue(_selectedId, out var s))
        {
            ImGui.TextDisabled("Select a skill on the left.");
            return;
        }

        ImGui.Text(s.DisplayName);
        ImGui.TextDisabled(s.Id);
        ImGui.Separator();

        ImGui.Text($"Class: {s.RawSnapshot.SkillClass}");
        ImGui.Text($"Cast: {s.RawSnapshot.CastTime:0.00}s   Cooldown: {s.RawSnapshot.Cooldown:0.0}s");
        ImGui.Text($"Damage: {s.RawSnapshot.RawDamage}    Spell: {s.RawSnapshot.IsSpell}");
        ImGui.Separator();

        // UserThreat dropdown
        var values = new[] { "(auto)", "Low", "Medium", "High", "Critical" };
        int idx = s.UserThreat switch
        {
            null => 0,
            ThreatTier.Low => 1,
            ThreatTier.Medium => 2,
            ThreatTier.High => 3,
            ThreatTier.Critical => 4,
            _ => 0
        };
        if (ImGui.Combo("Threat", ref idx, values, values.Length))
        {
            s.UserThreat = idx switch
            {
                0 => null,
                1 => ThreatTier.Low,
                2 => ThreatTier.Medium,
                3 => ThreatTier.High,
                4 => ThreatTier.Critical,
                _ => null
            };
        }

        // Sound dropdown — empty string = inherit
        var soundNames = new[] { "(inherit)" }.Concat(_bank.Names).ToArray();
        int sIdx = s.Sound == null ? 0 : System.Array.IndexOf(soundNames, s.Sound);
        if (sIdx < 0) sIdx = 0;
        if (ImGui.Combo("Sound", ref sIdx, soundNames, soundNames.Length))
            s.Sound = sIdx == 0 ? null : soundNames[sIdx];

        ImGui.SameLine();
        if (ImGui.Button("Preview"))
        {
            var name = s.Sound ?? Plan3Defaults.SoundFor(s.UserThreat ?? ThreatTier.Medium);
            _player.Play(name);
        }

        // Alert text — empty → inherit
        var text = s.AlertText ?? "";
        if (ImGui.InputText("Alert text (empty = '<name>!')", ref text, 64))
            s.AlertText = string.IsNullOrEmpty(text) ? null : text;

        // FireOn dropdown
        var triggers = new[] { "(inherit)", "CastStart", "CastFinish", "CooldownReady" };
        int tIdx = s.FireOn switch
        {
            null => 0,
            AlertTrigger.CastStart => 1,
            AlertTrigger.CastFinish => 2,
            AlertTrigger.CooldownReady => 3,
            _ => 0
        };
        if (ImGui.Combo("Fire on", ref tIdx, triggers, triggers.Length))
        {
            s.FireOn = tIdx switch
            {
                0 => null,
                1 => AlertTrigger.CastStart,
                2 => AlertTrigger.CastFinish,
                3 => AlertTrigger.CooldownReady,
                _ => null
            };
        }

        bool muted = s.Muted ?? false;
        if (ImGui.Checkbox("Muted", ref muted)) s.Muted = muted ? true : (bool?)null;
    }
}

internal static class Plan3Defaults
{
    public static string SoundFor(ThreatTier t) => t switch
    {
        ThreatTier.Critical => "critical",
        ThreatTier.High => "high",
        ThreatTier.Medium => "medium",
        _ => "low"
    };
}
```

- [ ] **Step 3: `BossesTab.cs`**

```csharp
using BossMod.Audio;
using BossMod.Core.Catalog;
using ImGuiNET;

namespace BossMod.Ui.Tabs;

public sealed class BossesTab
{
    private readonly SkillCatalog _catalog;
    private readonly SoundBank _bank;
    private readonly SoundPlayer _player;
    private readonly GroupableTable<BossRecord> _table = new();
    private string? _selectedBossId;

    public BossesTab(SkillCatalog catalog, SoundBank bank, SoundPlayer player)
    {
        _catalog = catalog;
        _bank = bank;
        _player = player;
        _table.GroupBy = b => string.IsNullOrEmpty(b.ZoneBestiary) ? "(unknown zone)" : b.ZoneBestiary;
        _table.SortBy = b => b.DisplayName;
        _table.Matches = (b, q) => b.Id.Contains(q, System.StringComparison.OrdinalIgnoreCase)
                                || b.DisplayName.Contains(q, System.StringComparison.OrdinalIgnoreCase);
        _table.RowRenderer = b =>
        {
            if (ImGui.Selectable($"{b.DisplayName} (Lvl {b.LastSeenLevel})##{b.Id}", _selectedBossId == b.Id))
                _selectedBossId = b.Id;
        };
    }

    public void Render()
    {
        ImGui.Columns(2);
        ImGui.SetColumnWidth(0, 320);
        _table.Render("bosses_tab", _catalog.Bosses.Values);
        ImGui.NextColumn();

        if (_selectedBossId != null && _catalog.Bosses.TryGetValue(_selectedBossId, out var b))
            RenderEditor(b);
        else
            ImGui.TextDisabled("Select a boss on the left.");

        ImGui.Columns(1);
    }

    private void RenderEditor(BossRecord b)
    {
        ImGui.Text($"{b.DisplayName} ({b.Kind})");
        ImGui.TextDisabled($"{b.ZoneBestiary} · {b.Type} · {b.Class}");
        ImGui.Separator();

        foreach (var (skillId, bs) in b.Skills)
        {
            ImGui.PushID(skillId);
            var name = _catalog.Skills.TryGetValue(skillId, out var sr) ? sr.DisplayName : skillId;
            if (ImGui.CollapsingHeader($"{name} (auto: {bs.AutoThreat})"))
            {
                // Per-(boss, skill) overrides — same widgets as SkillsTab editor.
                // Keeping inline rather than extracting because controls bind to
                // BossSkillRecord properties, not SkillRecord.
                int tIdx = bs.UserThreat switch
                {
                    null => 0, ThreatTier.Low => 1, ThreatTier.Medium => 2,
                    ThreatTier.High => 3, ThreatTier.Critical => 4, _ => 0
                };
                var threats = new[] { "(inherit)", "Low", "Medium", "High", "Critical" };
                if (ImGui.Combo("Threat (boss override)", ref tIdx, threats, threats.Length))
                {
                    bs.UserThreat = tIdx switch
                    {
                        0 => null, 1 => ThreatTier.Low, 2 => ThreatTier.Medium,
                        3 => ThreatTier.High, 4 => ThreatTier.Critical, _ => null
                    };
                }

                var soundNames = new[] { "(inherit)" }.Concat(_bank.Names).ToArray();
                int sIdx = bs.Sound == null ? 0 : System.Array.IndexOf(soundNames, bs.Sound);
                if (sIdx < 0) sIdx = 0;
                if (ImGui.Combo("Sound (boss override)", ref sIdx, soundNames, soundNames.Length))
                    bs.Sound = sIdx == 0 ? null : soundNames[sIdx];

                var text = bs.AlertText ?? "";
                if (ImGui.InputText("Alert text", ref text, 64))
                    bs.AlertText = string.IsNullOrEmpty(text) ? null : text;
            }
            ImGui.PopID();
        }
    }
}
```

- [ ] **Step 4: `SoundsTab.cs`**

```csharp
using System;
using System.IO;
using BossMod.Audio;
using ImGuiNET;
using MelonLoader;

namespace BossMod.Ui.Tabs;

public sealed class SoundsTab
{
    private readonly SoundBank _bank;
    private readonly SoundPlayer _player;

    public SoundsTab(SoundBank bank, SoundPlayer player)
    {
        _bank = bank;
        _player = player;
    }

    public void Render()
    {
        if (ImGui.Button("Rescan")) _bank.RescanUserWavs();
        ImGui.SameLine();
        if (ImGui.Button("Open Folder"))
        {
            var dir = Path.Combine(MelonUtils.UserDataDirectory, "BossMod", "Sounds");
            try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(dir) { UseShellExecute = true }); }
            catch (Exception) { /* ignore — non-Windows or sandboxed */ }
        }
        ImGui.Separator();

        foreach (var name in _bank.Names)
        {
            ImGui.Text(name);
            ImGui.SameLine();
            if (ImGui.Button($"Play##{name}")) _player.Play(name);
        }
    }
}
```

- [ ] **Step 5: `GeneralTab.cs`**

```csharp
using BossMod.Core.Persistence;
using ImGuiNET;

namespace BossMod.Ui.Tabs;

public sealed class GeneralTab
{
    private readonly Globals _g;

    public GeneralTab(Globals globals) => _g = globals;

    public void Render()
    {
        // Window visibility
        bool castBar = _g.ShowCastBarWindow;
        if (ImGui.Checkbox("Show cast bars", ref castBar)) _g.ShowCastBarWindow = castBar;

        bool cd = _g.ShowCooldownWindow;
        if (ImGui.Checkbox("Show cooldowns", ref cd)) _g.ShowCooldownWindow = cd;

        bool buffs = _g.ShowBuffTrackerWindow;
        if (ImGui.Checkbox("Show buffs", ref buffs)) _g.ShowBuffTrackerWindow = buffs;

        ImGui.Separator();

        // Audio
        bool muted = _g.Muted;
        if (ImGui.Checkbox("Master mute", ref muted)) _g.Muted = muted;
        bool textOnMaster = _g.AlertTextMuteOnMasterMute;
        if (ImGui.Checkbox("Master mute also hides alert text", ref textOnMaster))
            _g.AlertTextMuteOnMasterMute = textOnMaster;

        ImGui.Separator();

        // Activation
        float radius = _g.ProximityRadius;
        if (ImGui.SliderFloat("Proximity radius (m)", ref radius, 10f, 80f, "%.0f")) _g.ProximityRadius = radius;

        int maxBars = _g.MaxCastBars;
        if (ImGui.SliderInt("Max cast bars", ref maxBars, 1, 8)) _g.MaxCastBars = maxBars;

        ImGui.Separator();

        // Threat thresholds
        ImGui.Text("Threat thresholds (auto-classification)");
        int crit = _g.Thresholds.CriticalDamage;
        if (ImGui.SliderInt("Critical damage", ref crit, 50, 1000)) _g.Thresholds.CriticalDamage = crit;
        int high = _g.Thresholds.HighDamage;
        if (ImGui.SliderInt("High damage", ref high, 20, 500)) _g.Thresholds.HighDamage = high;
        int aura = _g.Thresholds.AuraDpsHigh;
        if (ImGui.SliderInt("High aura DPS", ref aura, 5, 200)) _g.Thresholds.AuraDpsHigh = aura;
        float critT = _g.Thresholds.CriticalCastTime;
        if (ImGui.SliderFloat("Critical cast time (s)", ref critT, 1.5f, 8f, "%.1f"))
            _g.Thresholds.CriticalCastTime = critT;

        ImGui.Separator();
        ImGui.Text("Hotkeys + Config Mode are configured in Plan 4.");
    }
}
```

- [ ] **Step 6: `ExportImportTab.cs`**

```csharp
using System;
using System.IO;
using BossMod.Core.Catalog;
using BossMod.Core.Persistence;
using ImGuiNET;

namespace BossMod.Ui.Tabs;

public sealed class ExportImportTab
{
    private readonly SkillCatalog _catalog;
    private readonly Globals _globals;
    private readonly string _stateJsonPath;
    private string _exportPath = "";
    private string _importPath = "";
    private string _status = "";

    public ExportImportTab(SkillCatalog catalog, Globals globals, string stateJsonPath)
    {
        _catalog = catalog;
        _globals = globals;
        _stateJsonPath = stateJsonPath;
        _exportPath = stateJsonPath + ".export";
        _importPath = stateJsonPath;
    }

    public void Render()
    {
        ImGui.Text($"Active state file: {_stateJsonPath}");
        ImGui.Separator();

        ImGui.InputText("Export to", ref _exportPath, 256);
        if (ImGui.Button("Export"))
        {
            try { StateJson.Write(_exportPath, _catalog, _globals); _status = $"Exported to {_exportPath}"; }
            catch (Exception ex) { _status = $"Export failed: {ex.Message}"; }
        }

        ImGui.Separator();
        ImGui.InputText("Import from", ref _importPath, 256);
        if (ImGui.Button("Import (replaces current)"))
        {
            try
            {
                var (cat2, glob2) = StateJson.Read(_importPath);
                _catalog.Skills.Clear();
                foreach (var (k, v) in cat2.Skills) _catalog.Skills[k] = v;
                _catalog.Bosses.Clear();
                foreach (var (k, v) in cat2.Bosses) _catalog.Bosses[k] = v;
                CopyGlobals(glob2, _globals);
                _status = $"Imported from {_importPath}";
            }
            catch (Exception ex) { _status = $"Import failed: {ex.Message}"; }
        }

        ImGui.Separator();
        if (ImGui.Button("Reload from disk")) ImportInPlace(_stateJsonPath);

        if (!string.IsNullOrEmpty(_status))
        {
            ImGui.Separator();
            ImGui.TextWrapped(_status);
        }
    }

    private void ImportInPlace(string path)
    {
        try
        {
            var (cat2, glob2) = StateJson.Read(path);
            _catalog.Skills.Clear();
            foreach (var (k, v) in cat2.Skills) _catalog.Skills[k] = v;
            _catalog.Bosses.Clear();
            foreach (var (k, v) in cat2.Bosses) _catalog.Bosses[k] = v;
            CopyGlobals(glob2, _globals);
            _status = "Reloaded.";
        }
        catch (Exception ex) { _status = $"Reload failed: {ex.Message}"; }
    }

    private static void CopyGlobals(Globals from, Globals to)
    {
        to.Thresholds = from.Thresholds.Clone();
        to.ProximityRadius = from.ProximityRadius;
        to.UiScale = from.UiScale;
        to.Muted = from.Muted;
        to.AlertTextMuteOnMasterMute = from.AlertTextMuteOnMasterMute;
        to.ExpansionDefault = from.ExpansionDefault;
        to.MaxCastBars = from.MaxCastBars;
        to.Hotkeys = from.Hotkeys;
        to.ShowCastBarWindow = from.ShowCastBarWindow;
        to.ShowCooldownWindow = from.ShowCooldownWindow;
        to.ShowBuffTrackerWindow = from.ShowBuffTrackerWindow;
        to.ConfigMode = from.ConfigMode;
    }
}
```

- [ ] **Step 7: Build, commit AlertSubscriber + SettingsWindow + tabs together**

```bash
dotnet run --project build-tool build
git add mods/BossMod/Ui/SettingsWindow.cs mods/BossMod/Ui/Tabs/ mods/BossMod/Audio/AlertSubscriber.cs
git commit -m "feat(bossmod): add SettingsWindow with all 5 tabs + AlertSubscriber"
```

---

## Definition of done

- All UI windows compile and link against BossMod.Core types.
- `SoundBank` produces 6 named built-in tones; user WAVs hot-load via `RescanUserWavs`.
- `SoundPlayer` honors master mute + 200 ms anti-spam.
- `AlertOverlay` coalesces same-`(BossId, SkillId)` events and TTL-decays them.
- `SettingsWindow` opens, all 5 tabs render, edits persist into `_catalog` / `_globals` (debounced flush comes in plan 4).
- WAV loader unit tests pass on host.

## Open items deferred to plan 4

- Wiring all of this into `BossMod.cs` so the demo window of plan 1 is replaced with the real overlays.
- Config Mode toggle that flips `Locked` on each window.
- Hotkey registration that toggles `SettingsWindow.Open`.
- Debounced `state.json` flush triggered by edits.
- E2E observation pass to tune threshold defaults and confirm IL2CPP type access patterns.
