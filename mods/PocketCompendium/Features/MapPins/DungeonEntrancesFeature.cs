using PocketCompendium.Core.Features;
using PocketCompendium.Core.Tracking;
using UnityEngine;

namespace PocketCompendium.Features.MapPins;

/// <summary>
/// Cards on the local map: hovering a dungeon's entrance shows the dungeon's tracked monsters
/// beside it in the boss list's compact style.
/// </summary>
public sealed class DungeonEntrancesFeature : Feature
{
    private readonly DungeonEntrances _entrances = new();
    private RectTransform _layer;

    public DungeonEntrancesFeature()
        : base("DungeonEntrances", "Dungeon entrances", "Hover over a dungeon's entrance on the map to see its bosses, elites and fabled monsters and when they spawn.")
    {
    }

    public override bool UsesTracker => true;

    protected internal override void Enable()
    {
    }

    protected internal override void Disable()
    {
        _entrances.Clear();
        if (_layer != null) Object.Destroy(_layer.gameObject);
        _layer = null;
    }

    // The layer lives inside the game's map, which goes with the World scene.
    protected internal override void OnSceneUnloaded(string sceneName)
    {
        if (sceneName != "World") return;
        _layer = null;
        _entrances.Clear();
    }

    protected internal override void Update()
    {
        bool open = MapOverlay.Open(out var tracker, out var player, out var map, out var camera);
        if (_layer != null && _layer.gameObject.activeSelf != open) _layer.gameObject.SetActive(open);
        if (!open) return;

        if (_layer == null) _layer = MapOverlay.CreateLayer(map.localMap, "PC_DungeonEntrances");
        var watchlist = Watchlist.Current;
        var clicked = _entrances.Update(_layer, camera, map.localMap.rectTransform.rect, tracker, watchlist, player.idZone, map.localMap.gameObject.layer);
        if (clicked != null) MapOverlay.Click(clicked, watchlist);
    }
}
