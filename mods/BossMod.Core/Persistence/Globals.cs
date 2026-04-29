using System.Collections.Generic;
using BossMod.Core.Catalog;

namespace BossMod.Core.Persistence;

/// <summary>
/// Mod-wide settings persisted alongside the catalog.
/// </summary>
public sealed class Globals
{
    public Thresholds Thresholds { get; set; } = new();
    public float ProximityRadius { get; set; } = 30f;
    public float UiScale { get; set; } = 1.0f;
    public bool Muted { get; set; }
    public bool AlertTextMuteOnMasterMute { get; set; } = true;
    public string ExpansionDefault { get; set; } = "expand_targeted_only";
    public int MaxCastBars { get; set; } = 3;

    public Dictionary<string, string> Hotkeys { get; set; } = new()
    {
        ["toggle_settings"] = "F8",
    };

    public bool ShowCastBarWindow { get; set; } = true;
    public bool ShowCooldownWindow { get; set; } = true;
    public bool ShowBuffTrackerWindow { get; set; } = true;
    public bool ConfigMode { get; set; } = false;
}
