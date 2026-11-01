using PocketCompendium.Core.Game;
using PocketCompendium.Core.Settings;
using PocketCompendium.Core.Ui;
using PocketCompendium.Features.BossList.Model;
using UnityEngine;

namespace PocketCompendium.Features.BossList;

/// <summary>The boss list's style, filters and placement, on the Boss list settings page.</summary>
public sealed class BossListSettings
{
    public BossListSettings(SettingsPage page)
    {
        Style = page.Choice("Style", ListStyle.List, "Style",
            "Compact shows portraits with times, and its header while you point at it.",
            (ListStyle.List, "List"), (ListStyle.Compact, "Compact"));

        page.Section("Show");
        Tiers = page.Chips("Tiers", null,
            ("Bosses", true, "Bosses", () => GameAccess.TierColor(Tier.Boss)),
            ("Elites", true, "Elites", () => GameAccess.TierColor(Tier.Elite)),
            ("Fabled", true, "Fabled", () => GameAccess.TierColor(Tier.Fabled)));
        Levels = page.Choice("Levels", LevelFilter.All, "Levels",
            "Not trivial hides monsters the game greys out. Near my level hides those more than 10 levels from yours.",
            (LevelFilter.All, "All"), (LevelFilter.NotTrivial, "Not trivial"), (LevelFilter.NearMine, "Near my level"), (LevelFilter.Custom, "Custom"));
        CustomLevels = page.Range("Custom", 1, 60, 1, 100, "Custom levels", "The levels Custom shows.",
            () => Levels.Value == LevelFilter.Custom);
        Zones = page.Choice("Zones", ZoneFilter.ThisZone, "Zones",
            "This zone lists the zone you are in, and watched monsters from anywhere.",
            (ZoneFilter.ThisZone, "This zone"), (ZoneFilter.AllZones, "All zones"));
        Undiscovered = page.Choice("Undiscovered", UndiscoveredFilter.Silhouette, "Undiscovered",
            "Monsters not yet in your Bestiary.",
            (UndiscoveredFilter.Silhouette, "Silhouette"), (UndiscoveredFilter.Show, "Show"), (UndiscoveredFilter.Hide, "Hide"));
        page.Note("None of these hide watched monsters. Click a row to watch it.");

        page.Section("Rows");
        Sort = page.Choice("Sort", SortOrder.State, "Sort by", null,
            (SortOrder.State, "State"), (SortOrder.Distance, "Distance"), (SortOrder.Level, "Level"));
        Direction = page.Toggle("Direction", true, "Direction",
            "Distance and an arrow to the spawn point or altar, for monsters in your zone.");

        Panel = new PanelHost(page, "Panel", PanelResize.Size,
            new Vector2(-810f, 235f), new Vector2(304f, 520f), new Vector2(240f, 120f), new Vector2(520f, 1000f));
    }

    public ChoiceSetting<ListStyle> Style { get; }
    public ChipsSetting Tiers { get; }
    public ChoiceSetting<LevelFilter> Levels { get; }
    public RangeSetting CustomLevels { get; }
    public ChoiceSetting<ZoneFilter> Zones { get; }
    public ChoiceSetting<UndiscoveredFilter> Undiscovered { get; }
    public ChoiceSetting<SortOrder> Sort { get; }
    public ToggleSetting Direction { get; }
    public PanelHost Panel { get; }

    /// <summary>Copies the filters into <paramref name="filter"/>.</summary>
    public void Fill(ListFilter filter)
    {
        filter.Bosses = Tiers.Chips[0].Setting.Value;
        filter.Elites = Tiers.Chips[1].Setting.Value;
        filter.Fabled = Tiers.Chips[2].Setting.Value;
        filter.Levels = Levels.Value;
        filter.From = CustomLevels.From;
        filter.To = CustomLevels.To;
        filter.Zones = Zones.Value;
        filter.Undiscovered = Undiscovered.Value;
        filter.Sort = Sort.Value;
    }
}
