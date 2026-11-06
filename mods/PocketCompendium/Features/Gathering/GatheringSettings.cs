using System;
using System.Collections.Generic;
using MelonLoader;
using PocketCompendium.Core.Settings;
using PocketCompendium.Core.Ui;
using UnityEngine;

namespace PocketCompendium.Features.Gathering;

internal enum ZoneScope
{
    ThisZone,
    AllZones,
}

internal enum GrowingNodes
{
    Show,
    Hide,
}

/// <summary>The gathering helper's parts, list, watched types and panel, on the Gathering page.</summary>
internal sealed class GatheringSettings
{
    private readonly SettingsPage _page;
    private readonly MelonPreferences_Entry<string[]> _watched;
    private readonly HashSet<string> _keys = new(StringComparer.Ordinal);

    public GatheringSettings(SettingsPage page)
    {
        _page = page;
        page.Section("Show watched ones");
        MapPins = page.Toggle("MapPins", true, "Map pins", "Marks every node on the local map.");
        Minimap = page.Toggle("Minimap", true, "Minimap", "Shows the nodes the minimap covers.");
        Arrow = page.Toggle("Arrow", true, "Arrow", "Points to the nearest ready node when it's off screen.");
        Growing = page.Choice("Growing", GrowingNodes.Show, "Respawning nodes", "Hide marks only nodes that are ready to gather, on the map and the minimap.",
            (GrowingNodes.Show, "Show"), (GrowingNodes.Hide, "Hide"));

        page.Section("List");
        Zones = page.Choice("Zones", ZoneScope.AllZones, "Zones", "This zone lists only what you can gather where you are.",
            (ZoneScope.ThisZone, "This zone"), (ZoneScope.AllZones, "All zones"));
        page.Note("Click a tile in the list to watch it.");

        _watched = page.Stored("Watched", Array.Empty<string>());
        foreach (string key in _watched.Value ?? Array.Empty<string>())
            if (!string.IsNullOrEmpty(key))
                _keys.Add(key);
        Shown = page.Stored("Shown", false);
        Tab = page.Stored("Tab", 0);

        Panel = new PanelHost(page, "Panel", PanelResize.Size,
            new Vector2(700f, 230f), new Vector2(222f, 300f), new Vector2(170f, 80f), new Vector2(520f, 1000f));
    }

    public ToggleSetting MapPins { get; }
    public ToggleSetting Minimap { get; }
    public ToggleSetting Arrow { get; }
    public ChoiceSetting<GrowingNodes> Growing { get; }
    public ChoiceSetting<ZoneScope> Zones { get; }

    /// <summary>Whether the list shows. It starts hidden, so a player who doesn't gather sees only the button.</summary>
    public MelonPreferences_Entry<bool> Shown { get; }

    /// <summary>The chosen tab, by <see cref="Model.GatherCategory"/>.</summary>
    public MelonPreferences_Entry<int> Tab { get; }

    public PanelHost Panel { get; }

    /// <summary>Increments with every watch change, so a surface can skip unchanged frames.</summary>
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
