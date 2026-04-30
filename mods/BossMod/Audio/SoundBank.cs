using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using BossMod.Core.Audio;
using UnityEngine;

namespace BossMod.Audio;

public sealed class SoundBank : IDisposable
{
    private const int BuiltInSampleRate = 44100;
    public const long MaxUserWavBytes = 5L * 1024L * 1024L;
    public const double MaxUserWavSeconds = 10.0;

    private readonly string _soundsDirectory;
    private readonly Dictionary<string, AudioClip> _clips = new(StringComparer.OrdinalIgnoreCase);
    private readonly HashSet<string> _builtInNames = new(StringComparer.OrdinalIgnoreCase);
    private readonly HashSet<string> _userNames = new(StringComparer.OrdinalIgnoreCase);
    private readonly List<SoundLoadStatus> _loadStatuses = new();
    private readonly List<SoundEntry> _entries = new();

    public SoundBank(string soundsDirectory)
    {
        _soundsDirectory = soundsDirectory;
        LoadBuiltIns();
    }

    public IReadOnlyList<SoundEntry> Entries => _entries;
    public IReadOnlyList<SoundLoadStatus> LoadStatuses => _loadStatuses;

    public bool TryGetClip(string name, out AudioClip clip) => _clips.TryGetValue(name, out clip);

    public void RescanUserSounds()
    {
        foreach (var name in _userNames)
        {
            if (_clips.TryGetValue(name, out var oldClip)) UnityEngine.Object.Destroy(oldClip);
            _clips.Remove(name);
            _entries.RemoveAll(entry => !entry.IsBuiltIn && string.Equals(entry.Name, name, StringComparison.OrdinalIgnoreCase));
        }
        _userNames.Clear();
        _loadStatuses.Clear();

        Directory.CreateDirectory(_soundsDirectory);
        foreach (var path in Directory.GetFiles(_soundsDirectory, "*.wav", SearchOption.TopDirectoryOnly)
                     .Where(path => string.Equals(Path.GetExtension(path), ".wav", StringComparison.OrdinalIgnoreCase))
                     .OrderBy(Path.GetFullPath, StringComparer.Ordinal))
        {
            LoadUserWav(path);
        }
    }

    public void Dispose()
    {
        foreach (var clip in _clips.Values) UnityEngine.Object.Destroy(clip);
        _clips.Clear();
        _builtInNames.Clear();
        _userNames.Clear();
        _loadStatuses.Clear();
        _entries.Clear();
    }

    private void LoadBuiltIns()
    {
        foreach (var name in Tone.BuiltInNames)
        {
            var samples = Tone.Generate(name);
            var clip = CreateClip("BossMod_builtin_" + name, samples, BuiltInSampleRate);
            _clips[name] = clip;
            _builtInNames.Add(name);
            _entries.Add(new SoundEntry(name, isBuiltIn: true));
        }
    }

    private void LoadUserWav(string path)
    {
        string rawName = Path.GetFileNameWithoutExtension(path);
        string name = rawName.Trim();
        if (string.IsNullOrWhiteSpace(name))
        {
            _loadStatuses.Add(SoundLoadStatus.Skipped(path, rawName, "File name is empty."));
            return;
        }

        if (_builtInNames.Contains(name))
        {
            _loadStatuses.Add(SoundLoadStatus.Skipped(path, name, "Name collides with a built-in sound."));
            return;
        }

        if (_clips.ContainsKey(name))
        {
            _loadStatuses.Add(SoundLoadStatus.Skipped(path, name, "Name collides with another user sound."));
            return;
        }

        var info = new FileInfo(path);
        if (info.Length > MaxUserWavBytes)
        {
            _loadStatuses.Add(SoundLoadStatus.Skipped(path, name, "WAV file exceeds 5 MiB."));
            return;
        }

        try
        {
            var bytes = File.ReadAllBytes(path);
            var header = WavHeader.Parse(bytes);
            var samples = WavHeader.ToMonoFloatSamples(bytes, header);
            if (samples.Length == 0)
            {
                _loadStatuses.Add(SoundLoadStatus.Skipped(path, name, "WAV clip contains no samples."));
                return;
            }

            double seconds = samples.Length / (double)header.SampleRate;
            if (seconds > MaxUserWavSeconds)
            {
                _loadStatuses.Add(SoundLoadStatus.Skipped(path, name, "WAV clip exceeds 10 seconds."));
                return;
            }

            _clips[name] = CreateClip("BossMod_user_" + name, samples, header.SampleRate);
            _userNames.Add(name);
            _entries.Add(new SoundEntry(name, isBuiltIn: false));
            _loadStatuses.Add(SoundLoadStatus.Success(path, name));
        }
        catch (Exception ex) when (ex is IOException || ex is UnauthorizedAccessException || ex is WavFormatException || ex is ArgumentException)
        {
            _loadStatuses.Add(SoundLoadStatus.Skipped(path, name, ex.Message));
        }
    }

    private static AudioClip CreateClip(string name, float[] samples, int sampleRate)
    {
        var clip = AudioClip.Create(name, samples.Length, channels: 1, frequency: sampleRate, stream: false);
        clip.SetData(samples, offsetSamples: 0);
        return clip;
    }
}

public sealed class SoundEntry
{
    public SoundEntry(string name, bool isBuiltIn)
    {
        Name = name;
        IsBuiltIn = isBuiltIn;
    }

    public string Name { get; }
    public bool IsBuiltIn { get; }
}

public sealed class SoundLoadStatus
{
    private SoundLoadStatus(string path, string name, bool loaded, string message)
    {
        Path = path;
        Name = name;
        Loaded = loaded;
        Message = message;
    }

    public string Path { get; }
    public string Name { get; }
    public bool Loaded { get; }
    public string Message { get; }

    public static SoundLoadStatus Success(string path, string name) =>
        new(path, name, loaded: true, message: "Loaded.");

    public static SoundLoadStatus Skipped(string path, string name, string message) =>
        new(path, name, loaded: false, message: message);
}
