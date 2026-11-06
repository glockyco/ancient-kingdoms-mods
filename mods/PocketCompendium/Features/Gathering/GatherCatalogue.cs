using System;
using System.Collections.Generic;
using Il2Cpp;
using Il2CppInterop.Runtime;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Features.Gathering.Model;
using UnityEngine;

namespace PocketCompendium.Features.Gathering;

/// <summary>
/// Every herb, ore rock, fishing spot and spark of the world, found with one search when the world
/// loads and later through <see cref="GatherItemStartPatch"/>, because searching the scene stalls
/// the game for a frame. It only reads the nodes.
/// </summary>
internal sealed class GatherCatalogue
{
    private readonly List<GatherNode> _all = new();
    private readonly Dictionary<GatherNode, GatherItem> _itemOf = new();
    private readonly Dictionary<int, List<GatherNode>> _byZone = new();
    private readonly HashSet<int> _known = new();
    private readonly Dictionary<string, Sprite> _icons = new(StringComparer.Ordinal);
    private readonly Dictionary<string, ScriptableItem> _fish = new(StringComparer.Ordinal);
    private readonly Dictionary<string, GatherItem> _samples = new(StringComparer.Ordinal);
    private Dictionary<int, int> _roots;

    public static GatherCatalogue Current { get; private set; }

    public bool Built { get; private set; }

    /// <summary>Every type, by category, ordered by level and name.</summary>
    public Dictionary<GatherCategory, List<GatherType>> Types { get; private set; } = GatherLogic.Types(Array.Empty<GatherNode>());

    /// <summary>Increments when nodes or types change, so a surface can skip unchanged frames.</summary>
    public int Version { get; private set; }

    public void Build()
    {
        Clear();
        Current = this;
        _roots = Catalogue.ZoneRoots();
        foreach (var found in UnityEngine.Object.FindObjectsByType(Il2CppType.Of<GatherItem>(), FindObjectsInactive.Include, FindObjectsSortMode.None))
        {
            var item = found.TryCast<GatherItem>();
            if (item != null) Note(item);
        }

        Types = GatherLogic.Types(_all);
        Built = true;
        Version++;
    }

    /// <summary>Notes a node the game started after the world loaded.</summary>
    public void OnStarted(GatherItem item)
    {
        if (!Built || !Note(item)) return;
        Types = GatherLogic.Types(_all);
        Version++;
    }

    public void Clear()
    {
        _all.Clear();
        _itemOf.Clear();
        _byZone.Clear();
        _known.Clear();
        _icons.Clear();
        _fish.Clear();
        _samples.Clear();
        _roots = null;
        Built = false;
        Version++;
        if (Current == this) Current = null;
    }

    /// <summary>The zone's nodes. Empty for a zone without any.</summary>
    public IReadOnlyList<GatherNode> Zone(int zone) =>
        _byZone.TryGetValue(zone, out var nodes) ? nodes : (IReadOnlyList<GatherNode>)Array.Empty<GatherNode>();

    public GatherItem ItemOf(GatherNode node) => _itemOf.TryGetValue(node, out var item) ? item : null;

    public Sprite Icon(GatherType type) => _icons.TryGetValue(type.Key, out var icon) ? icon : null;

    /// <summary>The fish's item, for its name in the game's language and its tooltip facts.</summary>
    public ScriptableItem Fish(string name) => _fish.TryGetValue(name, out var item) ? item : null;

    /// <summary>A node of a herb, ore or spark type, for its regrow time.</summary>
    public GatherItem Sample(GatherType type) => _samples.TryGetValue(type.Key, out var item) ? item : null;

    /// <summary>
    /// Reads the ready times of the zone's nodes. A client receives a node only near the player, so
    /// one out of range keeps the time it last had, which is right until someone else gathers it.
    /// </summary>
    public void Refresh(int zone, bool host)
    {
        foreach (var node in Zone(zone))
        {
            var item = ItemOf(node);
            if (item == null) continue;
            node.ReadyAt = item.timeToReady;
            node.Stale = !host && !item.gameObject.activeInHierarchy;
        }
    }

    private bool Note(GatherItem item)
    {
        var category = CategoryOf(item);
        if (category == null || !item.gameObject.scene.IsValid() || !_known.Add(item.GetInstanceID())) return false;

        int zone = Catalogue.ZoneOf(_roots, item.transform);
        if (zone < 0) return false;

        List<string> fish = null;
        if (category == GatherCategory.Fishing && item.randomDrops != null)
        {
            fish = new List<string>();
            foreach (var drop in item.randomDrops)
            {
                if (drop?.item == null) continue;
                fish.Add(drop.item.nameItem);
                _fish[drop.item.nameItem] = drop.item;
                _icons[GatherCategory.Fishing + ":" + drop.item.nameItem] = drop.item.image;
            }
        }

        Vector2 position = item.transform.position;
        var node = new GatherNode(category.Value, item.nameGatherItem ?? item.name, zone, position.x, position.y, item.levelItem, fish)
        {
            ReadyAt = item.timeToReady,
        };
        _all.Add(node);
        _itemOf[node] = item;
        if (!_byZone.TryGetValue(zone, out var list)) _byZone[zone] = list = new List<GatherNode>();
        list.Add(node);

        string key = category.Value + ":" + node.Name;
        if (category != GatherCategory.Fishing && !_icons.ContainsKey(key))
        {
            _icons[key] = IconOf(item);
            _samples[key] = item;
        }
        return true;
    }

    private static GatherCategory? CategoryOf(GatherItem item)
    {
        if (item.isPlant) return GatherCategory.Herbs;
        if (item.isMineral) return GatherCategory.Ores;
        if (item.isFish) return GatherCategory.Fishing;
        if (item.isRadiantSpark) return GatherCategory.Sparks;
        return null;
    }

    // Herbs take the journal's picture. Ore rocks look alike, so ores take their ore, and sparks
    // their Radiant Aether.
    private static Sprite IconOf(GatherItem item)
    {
        if (item.isPlant && item.journalIcon != null) return item.journalIcon;
        var reward = item.giftToPlayer.item;
        if (reward != null && reward.image != null) return reward.image;
        return item.readySprite;
    }
}
