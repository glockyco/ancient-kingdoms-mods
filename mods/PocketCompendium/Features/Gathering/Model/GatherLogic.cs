using System;
using System.Collections.Generic;
using PocketCompendium.Core.Tracking;

namespace PocketCompendium.Features.Gathering.Model;

/// <summary>How many nodes of a type a zone has, how many are ready, and when the next one is.</summary>
internal readonly struct TypeSummary
{
    public TypeSummary(int total, int ready, double? nextAt, bool estimate)
    {
        Total = total;
        Ready = ready;
        NextAt = nextAt;
        Estimate = estimate;
    }

    /// <summary>The zone's nodes of the type, or for a fish the spots that list it.</summary>
    public int Total { get; }

    public int Ready { get; }

    /// <summary>When the first growing node is ready, or null when none grows.</summary>
    public double? NextAt { get; }

    /// <summary>Whether a counted node's time may be out of date.</summary>
    public bool Estimate { get; }
}

/// <summary>The gathering helper's rules, apart from the game.</summary>
internal static class GatherLogic
{
    /// <summary>
    /// The types the nodes offer, by category, each ordered by level and name: herbs, ores and sparks
    /// by node name, fish by the names fishing spots list.
    /// </summary>
    public static Dictionary<GatherCategory, List<GatherType>> Types(IEnumerable<GatherNode> nodes)
    {
        var byKey = new Dictionary<string, GatherType>(StringComparer.Ordinal);
        foreach (var node in nodes)
        {
            if (node.Category == GatherCategory.Fishing)
            {
                foreach (string fish in node.Fish) Add(byKey, GatherCategory.Fishing, fish, node);
            }
            else
            {
                Add(byKey, node.Category, node.Name, node);
            }
        }

        var types = new Dictionary<GatherCategory, List<GatherType>>();
        foreach (GatherCategory category in Enum.GetValues(typeof(GatherCategory))) types[category] = new List<GatherType>();
        foreach (var type in byKey.Values) types[type.Category].Add(type);
        foreach (var list in types.Values) list.Sort(ByLevelThenName);
        return types;
    }

    private static void Add(Dictionary<string, GatherType> byKey, GatherCategory category, string name, GatherNode node)
    {
        string key = category + ":" + name;
        if (!byKey.TryGetValue(key, out var type))
        {
            type = new GatherType(category, name, node.Level);
            byKey[key] = type;
        }
        else if (node.Level < type.Level)
        {
            type.Level = node.Level;
        }

        type.Zones.Add(node.Zone);
    }

    public static int ByLevelThenName(GatherType left, GatherType right)
    {
        int level = left.Level.CompareTo(right.Level);
        return level != 0 ? level : string.CompareOrdinal(left.Name, right.Name);
    }

    /// <summary>Counts <paramref name="type"/> among a zone's <paramref name="nodes"/> at server time <paramref name="now"/>.</summary>
    public static TypeSummary Summarize(IReadOnlyList<GatherNode> nodes, GatherType type, double now)
    {
        int total = 0, ready = 0;
        double? next = null;
        bool estimate = false;
        foreach (var node in nodes)
        {
            if (!node.Offers(type)) continue;
            total++;
            estimate |= node.Stale;
            if (node.IsReady(now)) ready++;
            else if (next == null || node.ReadyAt < next.Value) next = node.ReadyAt;
        }

        return new TypeSummary(total, ready, next, estimate);
    }

    /// <summary>
    /// The node the arrow points to: the nearest ready node of a watched type that
    /// <paramref name="offScreen"/> accepts, or when no watched node is ready, the one that is ready
    /// first, if it is off screen. Null when there is none to point to.
    /// </summary>
    public static GatherNode Next(IReadOnlyList<GatherNode> nodes, IReadOnlyList<GatherType> watched, float x, float y,
        double now, Func<GatherNode, bool> offScreen)
    {
        GatherNode nearest = null, soonest = null;
        float nearestDistance = float.MaxValue;
        bool anyReady = false;
        foreach (var node in nodes)
        {
            if (!Watched(node, watched)) continue;
            if (node.IsReady(now))
            {
                anyReady = true;
                if (!offScreen(node)) continue;
                float dx = node.X - x, dy = node.Y - y;
                float distance = dx * dx + dy * dy;
                if (distance < nearestDistance)
                {
                    nearestDistance = distance;
                    nearest = node;
                }
            }
            else if (soonest == null || node.ReadyAt < soonest.ReadyAt)
            {
                soonest = node;
            }
        }

        if (anyReady) return nearest;
        return soonest != null && offScreen(soonest) ? soonest : null;
    }

    /// <summary>
    /// A zone tile's caption: how many are ready, or when none is, when the next one is, with ~ when
    /// a count may be out of date.
    /// </summary>
    public static string Caption(TypeSummary summary, double now)
    {
        string mark = summary.Estimate ? "~" : "";
        if (summary.Ready > 0 || summary.NextAt == null) return mark + summary.Ready;
        return mark + StateText.Short(summary.NextAt.Value - now);
    }

    /// <summary>Whether the node offers a watched type.</summary>
    public static bool Watched(GatherNode node, IReadOnlyList<GatherType> watched)
    {
        foreach (var type in watched)
            if (node.Offers(type))
                return true;
        return false;
    }
}
