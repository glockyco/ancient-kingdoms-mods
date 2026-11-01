#nullable disable
using System;
using System.Collections.Generic;
using PocketCompendium.Core.Game;
using PocketCompendium.Core.Tracking;

namespace PocketCompendium.Features.BossList.Model;

public enum ListStyle
{
    List,
    Compact,
}

public enum LevelFilter
{
    All,
    NotTrivial,
    NearMine,
    Custom,
}

public enum ZoneFilter
{
    ThisZone,
    AllZones,
}

public enum UndiscoveredFilter
{
    Silhouette,
    Show,
    Hide,
}

public enum SortOrder
{
    State,
    Distance,
    Level,
}

/// <summary>What the list knows of one tracked monster.</summary>
public struct ListEntry
{
    public string Key;
    public int Zone;
    public Tier Tier;
    public int Level;
    public TrackedState State;
    public bool Watched;
    public bool Discovered;

    /// <summary>The distance to the spawn point in yd, or NaN outside the player's zone.</summary>
    public float Distance;
}

public sealed class ListFilter
{
    public bool Bosses = true;
    public bool Elites = true;
    public bool Fabled = true;
    public LevelFilter Levels;
    public int From = 1;
    public int To = 100;
    public ZoneFilter Zones;
    public UndiscoveredFilter Undiscovered;
    public SortOrder Sort;
}

/// <summary>A zone's rows in the list, with the monsters its filters hide.</summary>
public sealed class ListGroup
{
    public int Zone;

    /// <summary>The player's zone, which the list always shows first.</summary>
    public bool Current;

    /// <summary>Indices into the entries, in display order.</summary>
    public readonly List<int> Rows = new();

    /// <summary>Monsters of the zone the list could show, hidden ones included.</summary>
    public int Total;

    public int Watched;
    public int Hidden;
    public string HiddenText = "";
}

/// <summary>
/// Turns tracked monsters into the list's zone groups: the player's zone first, then other zones,
/// each sorted, with the monsters the filters hide collapsed into one line. Filters never hide a
/// watched monster. No game references, so the test project compiles this file directly.
/// </summary>
public static class ListModel
{
    private const int NearLevels = 10;

    [Flags]
    private enum Reason
    {
        None = 0,
        Tier = 1,
        Above = 2,
        Below = 4,
        Range = 8,
        Undiscovered = 16,
    }

    public static void Build(IReadOnlyList<ListEntry> entries, ListFilter filter, int playerLevel, int currentZone, List<ListGroup> groups)
    {
        groups.Clear();
        var byZone = new Dictionary<int, ListGroup>();
        var reasons = new Dictionary<int, Reason>();

        for (int index = 0; index < entries.Count; index++)
        {
            var entry = entries[index];
            bool current = entry.Zone == currentZone;
            if (!current && filter.Zones == ZoneFilter.ThisZone && !entry.Watched) continue;

            if (!byZone.TryGetValue(entry.Zone, out var group))
            {
                group = new ListGroup { Zone = entry.Zone, Current = current };
                byZone[entry.Zone] = group;
                groups.Add(group);
                reasons[entry.Zone] = Reason.None;
            }

            group.Total++;
            if (entry.Watched) group.Watched++;

            var hiddenBy = entry.Watched ? Reason.None : HiddenBy(entry, filter, playerLevel);
            if (hiddenBy == Reason.None)
            {
                group.Rows.Add(index);
            }
            else
            {
                group.Hidden++;
                reasons[entry.Zone] |= hiddenBy;
            }
        }

        foreach (var group in groups)
        {
            group.Rows.Sort((a, b) => Compare(entries[a], entries[b], filter.Sort));
            group.HiddenText = group.Hidden > 0 ? HiddenText(group.Hidden, reasons[group.Zone], filter) : "";
        }

        groups.RemoveAll(group => group.Rows.Count == 0 && group.Hidden == 0);
        groups.Sort((a, b) => a.Current != b.Current ? (a.Current ? -1 : 1) : a.Zone.CompareTo(b.Zone));
    }

    /// <summary>The count beside a group's name: "4", "1 of 4", or for a zone shown for its watched monsters, "2 watched".</summary>
    public static string CountText(ListGroup group, ZoneFilter zones)
    {
        if (!group.Current && zones == ZoneFilter.ThisZone) return $"{group.Watched} watched";
        int shown = group.Rows.Count;
        return shown == group.Total ? shown.ToString() : $"{shown} of {group.Total}";
    }

    private static Reason HiddenBy(in ListEntry entry, ListFilter filter, int playerLevel)
    {
        var reason = Reason.None;
        bool tierShown = entry.Tier switch
        {
            Tier.Boss => filter.Bosses,
            Tier.Elite => filter.Elites,
            _ => filter.Fabled,
        };
        if (!tierShown) reason |= Reason.Tier;

        int difference = entry.Level - playerLevel;
        switch (filter.Levels)
        {
            case LevelFilter.NotTrivial when LevelBands.Of(entry.Level, playerLevel) == LevelBand.Gray:
                reason |= Reason.Below;
                break;
            case LevelFilter.NearMine when difference > NearLevels:
                reason |= Reason.Above;
                break;
            case LevelFilter.NearMine when difference < -NearLevels:
                reason |= Reason.Below;
                break;
            case LevelFilter.Custom when entry.Level < filter.From || entry.Level > filter.To:
                reason |= Reason.Range;
                break;
        }

        if (!entry.Discovered && filter.Undiscovered == UndiscoveredFilter.Hide) reason |= Reason.Undiscovered;
        return reason;
    }

    private static string HiddenText(int count, Reason reasons, ListFilter filter)
    {
        string more = count + " more";
        switch (reasons)
        {
            case Reason.Above:
                return count + " more than 10 levels above you";
            case Reason.Below when filter.Levels == LevelFilter.NotTrivial:
                return more + " far below your level";
            case Reason.Below:
                return count + " more than 10 levels below you";
            case Reason.Above | Reason.Below:
                return count + " more than 10 levels from yours";
            case Reason.Range:
                return more + $" outside levels {filter.From} to {filter.To}";
            case Reason.Tier:
                return more + " of tiers you hide";
            case Reason.Undiscovered:
                return more + " not in your Bestiary yet";
            default:
                return more + " hidden by your filters";
        }
    }

    private static int Compare(in ListEntry a, in ListEntry b, SortOrder sort)
    {
        int order = sort switch
        {
            SortOrder.Distance => CompareDistance(a, b),
            SortOrder.Level => a.Level.CompareTo(b.Level),
            _ => CompareState(a, b),
        };
        return order != 0 ? order : string.CompareOrdinal(a.Key, b.Key);
    }

    // Up first, nearest first, then the soonest spawns, then the states without a time.
    private static int CompareState(in ListEntry a, in ListEntry b)
    {
        int rank = Rank(a.State.State).CompareTo(Rank(b.State.State));
        if (rank != 0) return rank;
        if (a.State.IsUp) return CompareDistance(a, b);
        return (a.State.At ?? double.MaxValue).CompareTo(b.State.At ?? double.MaxValue);
    }

    private static int CompareDistance(in ListEntry a, in ListEntry b)
    {
        bool aKnown = !float.IsNaN(a.Distance);
        bool bKnown = !float.IsNaN(b.Distance);
        if (aKnown != bKnown) return aKnown ? -1 : 1;
        return aKnown ? a.Distance.CompareTo(b.Distance) : 0;
    }

    private static int Rank(SpawnState state) => state switch
    {
        SpawnState.Up or SpawnState.InCombat => 0,
        SpawnState.Respawns or SpawnState.Estimated or SpawnState.Chance or SpawnState.Window => 1,
        SpawnState.Due => 2,
        SpawnState.Guards => 3,
        SpawnState.Seen => 4,
        SpawnState.Altar => 5,
        _ => 6,
    };
}
