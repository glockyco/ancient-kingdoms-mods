using System;
using System.Collections.Generic;

namespace PocketCompendium.Features.Gathering.Model;

/// <summary>The list's tabs, in their order.</summary>
internal enum GatherCategory
{
    Herbs,
    Ores,
    Fishing,
    Sparks,
}

/// <summary>
/// What a player watches and the list shows as a tile: a herb, ore or spark by its node's name, or
/// a fish by its item's name, because players fish for a fish and spots of one kind list different ones.
/// </summary>
internal sealed class GatherType
{
    public GatherType(GatherCategory category, string name, int level)
    {
        Category = category;
        Name = name;
        Level = level;
        Key = category + ":" + name;
    }

    public GatherCategory Category { get; }

    /// <summary>The node's name, or the fish's item name: the key the game's gathered records use.</summary>
    public string Name { get; }

    /// <summary>The game's level, which it shows as one higher. A fish's is its easiest spot's.</summary>
    public int Level { get; internal set; }

    /// <summary>The watch key, which keeps a herb and a fish of one name apart.</summary>
    public string Key { get; }

    /// <summary>The zones it grows in, or for a fish the zones of the spots that list it.</summary>
    public SortedSet<int> Zones { get; } = new();
}

/// <summary>One placed node: a herb, an ore rock, a fishing spot or a spark.</summary>
internal sealed class GatherNode
{
    private static readonly IReadOnlyList<string> NoFish = Array.Empty<string>();

    public GatherNode(GatherCategory category, string name, int zone, float x, float y, int level, IReadOnlyList<string> fish = null)
    {
        Category = category;
        Name = name;
        Zone = zone;
        X = x;
        Y = y;
        Level = level;
        Fish = fish ?? NoFish;
    }

    public GatherCategory Category { get; }
    public string Name { get; }
    public int Zone { get; }
    public float X { get; }
    public float Y { get; }
    public int Level { get; }

    /// <summary>A fishing spot's catch list, by item name. Empty for other nodes.</summary>
    public IReadOnlyList<string> Fish { get; }

    /// <summary>The server time from which it can be gathered.</summary>
    public double ReadyAt { get; set; }

    /// <summary>Whether <see cref="ReadyAt"/> was last seen out of the client's range, so it may be out of date.</summary>
    public bool Stale { get; set; }

    /// <summary>Fishing spots never run out, so they are always ready.</summary>
    public bool IsReady(double now) => Category == GatherCategory.Fishing || ReadyAt <= now;

    /// <summary>Whether gathering here can give <paramref name="type"/>.</summary>
    public bool Offers(GatherType type)
    {
        if (type.Category != Category) return false;
        if (Category != GatherCategory.Fishing) return Name == type.Name;
        foreach (string fish in Fish)
            if (fish == type.Name)
                return true;
        return false;
    }
}
