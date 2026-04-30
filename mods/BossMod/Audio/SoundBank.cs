using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using BossMod.Core.Audio;
using MelonLoader;
using UnityEngine;
using UnityEngine.Networking;

namespace BossMod.Audio;

public sealed class SoundBank : IDisposable
{
    private const int BuiltInSampleRate = 44100;
    public const long MaxUserWavBytes = 5L * 1024L * 1024L;
    public const double MaxUserWavSeconds = 10.0;

    private readonly string _soundsDirectory;
    private readonly string _builtInCacheDirectory;
    private readonly Dictionary<string, AudioClip> _clips = new(StringComparer.OrdinalIgnoreCase);
    private readonly HashSet<string> _builtInNames = new(StringComparer.OrdinalIgnoreCase);
    private readonly HashSet<string> _userNames = new(StringComparer.OrdinalIgnoreCase);
    private readonly List<SoundLoadStatus> _loadStatuses = new();
    private readonly List<SoundEntry> _entries = new();
    private int _userGeneration;
    private bool _disposed;

    public SoundBank(string soundsDirectory, string builtInCacheDirectory = null)
    {
        _soundsDirectory = soundsDirectory;
        _builtInCacheDirectory = string.IsNullOrWhiteSpace(builtInCacheDirectory)
            ? Path.Combine(_soundsDirectory, ".builtins")
            : builtInCacheDirectory;
        LoadBuiltIns();
    }

    public IReadOnlyList<SoundEntry> Entries => _entries;
    public IReadOnlyList<SoundLoadStatus> LoadStatuses => _loadStatuses;

    public bool TryGetClip(string name, out AudioClip clip)
    {
        if (_disposed)
        {
            clip = null;
            return false;
        }

        return _clips.TryGetValue(name, out clip);
    }

    public void RescanUserSounds()
    {
        if (_disposed) return;
        _userGeneration++;
        foreach (var name in _userNames)
        {
            if (_clips.TryGetValue(name, out var oldClip)) UnityEngine.Object.Destroy(oldClip);
            _clips.Remove(name);
            _entries.RemoveAll(entry => !entry.IsBuiltIn && string.Equals(entry.Name, name, StringComparison.OrdinalIgnoreCase));
        }
        _userNames.Clear();
        _loadStatuses.RemoveAll(status => !status.IsBuiltIn);

        string[] paths;
        try
        {
            Directory.CreateDirectory(_soundsDirectory);
            paths = Directory.GetFiles(_soundsDirectory, "*.wav", SearchOption.TopDirectoryOnly)
                .Where(path => string.Equals(Path.GetExtension(path), ".wav", StringComparison.OrdinalIgnoreCase))
                .OrderBy(Path.GetFullPath, StringComparer.Ordinal)
                .ToArray();
        }
        catch (Exception ex) when (ex is IOException || ex is UnauthorizedAccessException)
        {
            _loadStatuses.Add(SoundLoadStatus.Skipped(_soundsDirectory, "Sounds folder", ex.Message));
            return;
        }

        foreach (var path in paths)
        {
            LoadUserWav(path, _userGeneration);
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _userGeneration++;
        foreach (var clip in _clips.Values) UnityEngine.Object.Destroy(clip);
        _clips.Clear();
        _builtInNames.Clear();
        _userNames.Clear();
        _loadStatuses.Clear();
        _entries.Clear();
    }

    private void LoadBuiltIns()
    {
        try
        {
            Directory.CreateDirectory(_builtInCacheDirectory);
        }
        catch (Exception ex) when (ex is IOException || ex is UnauthorizedAccessException)
        {
            foreach (var name in Tone.BuiltInNames)
            {
                _builtInNames.Add(name);
                string path = Path.Combine(_builtInCacheDirectory, name + ".wav");
                UpsertStatus(SoundLoadStatus.Skipped(path, name, $"Built-in sound unavailable: {ex.Message}", isBuiltIn: true));
            }
            return;
        }

        foreach (var name in Tone.BuiltInNames)
        {
            _builtInNames.Add(name);

            var path = Path.Combine(_builtInCacheDirectory, name + ".wav");
            try
            {
                var bytes = WavPcm16.EncodeMono(Tone.Generate(name), BuiltInSampleRate);
                File.WriteAllBytes(path, bytes);
                QueueLoad(path, name, isBuiltIn: true, generation: 0);
            }
            catch (Exception ex) when (ex is IOException || ex is UnauthorizedAccessException || ex is ArgumentException || ex is OverflowException)
            {
                UpsertStatus(SoundLoadStatus.Skipped(path, name, $"Built-in sound unavailable: {ex.Message}", isBuiltIn: true));
            }
        }
    }

    private void LoadUserWav(string path, int generation)
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

        if (_userNames.Contains(name))
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
            int frameSize = header.Channels * (header.BitsPerSample / 8);
            int samples = header.DataLength / frameSize;
            if (samples == 0)
            {
                _loadStatuses.Add(SoundLoadStatus.Skipped(path, name, "WAV clip contains no samples."));
                return;
            }

            double seconds = samples / (double)header.SampleRate;
            if (seconds > MaxUserWavSeconds)
            {
                _loadStatuses.Add(SoundLoadStatus.Skipped(path, name, "WAV clip exceeds 10 seconds."));
                return;
            }

            _userNames.Add(name);
            QueueLoad(path, name, isBuiltIn: false, generation);
        }
        catch (Exception ex) when (ex is IOException || ex is UnauthorizedAccessException || ex is WavFormatException)
        {
            _loadStatuses.Add(SoundLoadStatus.Skipped(path, name, ex.Message));
        }
    }

    private void QueueLoad(string path, string name, bool isBuiltIn, int generation)
    {
        UpsertStatus(SoundLoadStatus.Loading(path, name, isBuiltIn));
        MelonCoroutines.Start(LoadClipCoroutine(path, name, isBuiltIn, generation));
    }

    private IEnumerator LoadClipCoroutine(string path, string name, bool isBuiltIn, int generation)
    {
        UnityWebRequest request;
        try
        {
            request = UnityWebRequestMultimedia.GetAudioClip(ToFileUri(path), AudioType.WAV);
        }
        catch (Exception ex)
        {
            MarkLoadFailure(path, name, isBuiltIn, generation, ex.Message);
            yield break;
        }

        UnityWebRequestAsyncOperation operation;
        try
        {
            operation = request.SendWebRequest();
        }
        catch (Exception ex)
        {
            request.Dispose();
            MarkLoadFailure(path, name, isBuiltIn, generation, ex.Message);
            yield break;
        }

        yield return operation;

        try
        {
            if (request.result != UnityWebRequest.Result.Success)
            {
                MarkLoadFailure(path, name, isBuiltIn, generation, request.error);
                yield break;
            }

            var clip = DownloadHandlerAudioClip.GetContent(request);
            if (clip == null)
            {
                MarkLoadFailure(path, name, isBuiltIn, generation, "Unity returned no AudioClip.");
                yield break;
            }

            clip.name = "BossMod_" + (isBuiltIn ? "builtin_" : "user_") + name;
            if (!ShouldKeepLoadedClip(name, isBuiltIn, generation))
            {
                UnityEngine.Object.Destroy(clip);
                yield break;
            }

            if (_clips.TryGetValue(name, out var oldClip)) UnityEngine.Object.Destroy(oldClip);
            _clips[name] = clip;
            EnsureEntry(name, isBuiltIn);
            UpsertStatus(SoundLoadStatus.Success(path, name, isBuiltIn));
        }
        catch (Exception ex)
        {
            MarkLoadFailure(path, name, isBuiltIn, generation, ex.Message);
        }
        finally
        {
            request.Dispose();
        }
    }

    private bool ShouldKeepLoadedClip(string name, bool isBuiltIn, int generation)
    {
        if (_disposed) return false;
        return isBuiltIn
            ? _builtInNames.Contains(name)
            : generation == _userGeneration && _userNames.Contains(name);
    }

    private void MarkLoadFailure(string path, string name, bool isBuiltIn, int generation, string message)
    {
        if (!ShouldKeepLoadedClip(name, isBuiltIn, generation)) return;
        string prefix = isBuiltIn ? "Built-in sound unavailable: " : "";
        UpsertStatus(SoundLoadStatus.Skipped(path, name, prefix + (string.IsNullOrWhiteSpace(message) ? "Unity audio load failed." : message), isBuiltIn));
    }

    private void EnsureEntry(string name, bool isBuiltIn)
    {
        if (_entries.Any(entry => entry.IsBuiltIn == isBuiltIn && string.Equals(entry.Name, name, StringComparison.OrdinalIgnoreCase))) return;
        _entries.Add(new SoundEntry(name, isBuiltIn));
    }
    private void UpsertStatus(SoundLoadStatus status)
    {
        int index = _loadStatuses.FindIndex(existing =>
            existing.IsBuiltIn == status.IsBuiltIn &&
            string.Equals(existing.Path, status.Path, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(existing.Name, status.Name, StringComparison.OrdinalIgnoreCase));
        if (index >= 0) _loadStatuses[index] = status;
        else _loadStatuses.Add(status);
    }

    private static string ToFileUri(string path) => new Uri(Path.GetFullPath(path)).AbsoluteUri;
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

public enum SoundLoadState
{
    Loading,
    Loaded,
    Skipped,
}

public sealed class SoundLoadStatus
{
    private SoundLoadStatus(string path, string name, SoundLoadState state, string message, bool isBuiltIn)
    {
        Path = path;
        Name = name;
        State = state;
        Message = message;
        IsBuiltIn = isBuiltIn;
    }

    public string Path { get; }
    public string Name { get; }
    public SoundLoadState State { get; }
    public bool Loaded => State == SoundLoadState.Loaded;
    public string Message { get; }
    public bool IsBuiltIn { get; }

    public static SoundLoadStatus Loading(string path, string name, bool isBuiltIn = false) =>
        new(path, name, SoundLoadState.Loading, "Loading.", isBuiltIn);

    public static SoundLoadStatus Success(string path, string name, bool isBuiltIn = false) =>
        new(path, name, SoundLoadState.Loaded, "Loaded.", isBuiltIn);

    public static SoundLoadStatus Skipped(string path, string name, string message, bool isBuiltIn = false) =>
        new(path, name, SoundLoadState.Skipped, message: message, isBuiltIn: isBuiltIn);
}