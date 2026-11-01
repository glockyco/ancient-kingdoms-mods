using System;
using System.Collections.Generic;
using MelonLoader;
using PocketCompendium.Core.Settings;

namespace PocketCompendium.Core.Tracking;

/// <summary>
/// The monsters the player watches. They stay in the boss list in every zone and raise alerts.
/// The list holds canonical names and applies to every world.
/// </summary>
public sealed class Watchlist
{
    private readonly SettingsPage _page;
    private readonly MelonPreferences_Entry<string[]> _entry;
    private readonly HashSet<string> _keys = new(StringComparer.Ordinal);

    public Watchlist()
    {
        _page = new SettingsPage("Watchlist", "Watchlist");
        _entry = _page.Stored("Monsters", Array.Empty<string>());
        foreach (string key in _entry.Value ?? Array.Empty<string>())
            if (!string.IsNullOrEmpty(key))
                _keys.Add(key);
        Current = this;
    }

    public static Watchlist Current { get; private set; }

    /// <summary>Increments with every change, so a surface can skip unchanged frames.</summary>
    public int Version { get; private set; }

    public bool Contains(string key) => key != null && _keys.Contains(key);

    public void Toggle(string key)
    {
        if (string.IsNullOrEmpty(key)) return;
        if (!_keys.Remove(key)) _keys.Add(key);

        var keys = new string[_keys.Count];
        _keys.CopyTo(keys);
        Array.Sort(keys, StringComparer.Ordinal);
        _entry.Value = keys;
        _page.Save();
        Version++;
    }
}
