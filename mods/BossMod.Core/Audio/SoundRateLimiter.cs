using System;
using System.Collections.Generic;

namespace BossMod.Core.Audio;

public sealed class SoundRateLimiter
{
    private readonly TimeSpan _cooldown;
    private readonly Dictionary<string, DateTimeOffset> _lastPlayByName = new(StringComparer.OrdinalIgnoreCase);

    public SoundRateLimiter(TimeSpan cooldown)
    {
        if (cooldown < TimeSpan.Zero) throw new ArgumentOutOfRangeException(nameof(cooldown), "Cooldown cannot be negative.");
        _cooldown = cooldown;
    }

    public bool CanPlay(string soundName, DateTimeOffset now)
    {
        string key = Normalize(soundName);
        return !_lastPlayByName.TryGetValue(key, out var lastPlay) || now - lastPlay >= _cooldown;
    }

    public void RecordPlay(string soundName, DateTimeOffset now)
    {
        _lastPlayByName[Normalize(soundName)] = now;
    }

    public bool TryAcquire(string soundName, DateTimeOffset now)
    {
        string key = Normalize(soundName);
        if (_lastPlayByName.TryGetValue(key, out var lastPlay) && now - lastPlay < _cooldown) return false;

        _lastPlayByName[key] = now;
        return true;
    }

    public void Clear() => _lastPlayByName.Clear();

    private static string Normalize(string soundName)
    {
        if (string.IsNullOrWhiteSpace(soundName)) throw new ArgumentException("Sound name is required.", nameof(soundName));
        return soundName.Trim();
    }
}
