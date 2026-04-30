using System;
using System.Collections.Generic;
using BossMod.Core.Audio;
using BossMod.Core.Persistence;
using MelonLoader;
using UnityEngine;

namespace BossMod.Audio;

public sealed class SoundPlayer : IDisposable
{
    private readonly SoundBank _soundBank;
    private readonly MelonLogger.Instance _log;
    private const string AudioObjectName = "BossMod_Audio";
    private readonly SoundRateLimiter _rateLimiter = new(TimeSpan.FromMilliseconds(500));
    private readonly HashSet<string> _missingLogged = new(StringComparer.OrdinalIgnoreCase);
    private GameObject _gameObject;
    private AudioSource _source;
    private bool _initialized;
    private bool _disposed;

    public SoundPlayer(SoundBank soundBank, MelonLogger.Instance log)
    {
        _soundBank = soundBank;
        _log = log;
    }

    public void Initialize()
    {
        if (_disposed)
        {
            _log.Warning("BossMod audio player was already disposed; ignoring initialize.");
            return;
        }

        if (_initialized)
        {
            _log.Msg("BossMod audio already initialized; ignoring duplicate initialize.");
            return;
        }

        DestroyExistingAudioObject();
        _gameObject = new GameObject(AudioObjectName);
        _gameObject.hideFlags = HideFlags.HideAndDontSave;
        UnityEngine.Object.DontDestroyOnLoad(_gameObject);
        _source = _gameObject.AddComponent<AudioSource>();
        _source.spatialBlend = 0f;
        _source.playOnAwake = false;
        _initialized = true;
    }

    public void Play(string soundName, Globals globals)
    {
        if (!_initialized || _disposed) return;
        if (globals.Muted) return;
        if (string.IsNullOrWhiteSpace(soundName)) return;
        soundName = soundName.Trim();

        if (!_soundBank.TryGetClip(soundName, out var clip))
        {
            if (_missingLogged.Add(soundName)) _log.Warning($"BossMod sound '{soundName}' was not found.");
            return;
        }

        var now = DateTimeOffset.UtcNow;
        if (!_rateLimiter.TryAcquire(soundName, now)) return;

        _source.PlayOneShot(clip, Math.Clamp(globals.MasterVolume, 0f, 1f));
    }

    public void PlayPreview(string soundName, Globals globals)
    {
        if (!_initialized || _disposed) return;
        if (globals.Muted) return;
        if (string.IsNullOrWhiteSpace(soundName)) return;
        soundName = soundName.Trim();

        if (!_soundBank.TryGetClip(soundName, out var clip))
        {
            if (_missingLogged.Add(soundName)) _log.Warning($"BossMod sound preview '{soundName}' was not found.");
            return;
        }

        _source.PlayOneShot(clip, Math.Clamp(globals.MasterVolume, 0f, 1f));
    }

    public void Dispose()
    {
        if (_disposed) return;
        if (_gameObject != null) UnityEngine.Object.Destroy(_gameObject);
        _gameObject = null;
        _source = null;
        _initialized = false;
        _disposed = true;
    }

    private void DestroyExistingAudioObject()
    {
        var existing = GameObject.Find(AudioObjectName);
        if (existing == null) return;
        _log.Warning("Removing stale BossMod audio object before initialization.");
        UnityEngine.Object.Destroy(existing);
    }
}
