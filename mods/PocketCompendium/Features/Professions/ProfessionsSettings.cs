using System;
using System.Collections.Generic;
using MelonLoader;
using PocketCompendium.Core.Settings;
using PocketCompendium.Core.Ui;
using UnityEngine;

namespace PocketCompendium.Features.Professions;

internal enum ProfessionStyle
{
    List,
    Compact,
}

/// <summary>The professions panel's style, watched professions and placement, on the Professions page.</summary>
internal sealed class ProfessionsSettings
{
    private readonly SettingsPage _page;
    private readonly MelonPreferences_Entry<string[]> _watched;
    private readonly HashSet<string> _keys = new(StringComparer.Ordinal);

    public ProfessionsSettings(SettingsPage page)
    {
        _page = page;
        page.Section("Look");
        Style = page.Choice("Style", ProfessionStyle.Compact, "Style",
            "Compact shows icons and levels. Its header shows on hover.",
            (ProfessionStyle.List, "List"), (ProfessionStyle.Compact, "Compact"));

        page.Section("Show");
        WatchedOnly = page.Toggle("WatchedOnly", false, "Watched only",
            "Shows only the professions you watch.");
        page.Note("Click a profession in the panel to watch it.");

        _watched = page.Stored("Watched", Array.Empty<string>());
        foreach (string key in _watched.Value ?? Array.Empty<string>())
            if (!string.IsNullOrEmpty(key))
                _keys.Add(key);
        Shown = page.Stored("Shown", false);

        Panel = new PanelHost(page, "Panel", PanelResize.Size,
            new Vector2(110f, 480f), new Vector2(384f, 300f), new Vector2(56f, 80f), new Vector2(520f, 1000f));
            new Vector2(693f, -120f), new Vector2(256f, 300f), new Vector2(56f, 80f), new Vector2(520f, 1000f));
    }

    public ChoiceSetting<ProfessionStyle> Style { get; }
    public ToggleSetting WatchedOnly { get; }

    /// <summary>Whether the panel shows, switched in the panel menu. It starts hidden.</summary>
    public MelonPreferences_Entry<bool> Shown { get; }

    public PanelHost Panel { get; }

    /// <summary>Increments with every watch change, so the panel can skip unchanged frames.</summary>
    public int WatchVersion { get; private set; }

    public bool Watched(string key) => key != null && _keys.Contains(key);

    public void ToggleWatch(string key)
    {
        if (string.IsNullOrEmpty(key)) return;
        if (!_keys.Remove(key)) _keys.Add(key);
        var keys = new string[_keys.Count];
        _keys.CopyTo(keys);
        Array.Sort(keys, StringComparer.Ordinal);
        _watched.Value = keys;
        _page.Save();
        WatchVersion++;
    }

    public void Save() => _page.Save();
}
