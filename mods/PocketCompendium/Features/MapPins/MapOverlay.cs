using Il2Cpp;
using PocketCompendium.Core.Game;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.MapPins;

/// <summary>What map pins and dungeon entrances share: when the local map shows, a layer over it, and a click on a monster.</summary>
internal static class MapOverlay
{
    // The game closes the live map in Temple of Valaark.
    private const int MaplessZone = 23;

    /// <summary>Whether the local map is open in a zone that has one, with a ready tracker.</summary>
    public static bool Open(out Tracker tracker, out Player player, out UIMap map, out Camera camera)
    {
        tracker = Tracker.Current;
        player = GameAccess.LocalPlayer;
        map = UIMap.singleton;
        var questTracking = UIQuestTracking.singleton;
        camera = questTracking != null ? questTracking.mapCamera : null;
        return tracker != null && tracker.Ready && !tracker.Failed && player != null && map != null
               && map.localMap != null && map.panel.activeSelf && map.localMap.enabled && player.idZone != MaplessZone
               && camera != null;
    }

    /// <summary>
    /// A layer over the local map. The map window's frame lies over the map and takes every pointer
    /// event there, so the layer draws on a nested canvas one step above the map's own, over the
    /// frame, and takes hover and clicks first.
    /// </summary>
    public static RectTransform CreateLayer(RawImage localMap, string name)
    {
        var layer = HudFactory.Rect(name, localMap.rectTransform).GetComponent<RectTransform>();
        layer.gameObject.layer = localMap.gameObject.layer;
        HudFactory.Stretch(layer, Vector2.zero, Vector2.zero);
        layer.SetAsLastSibling();

        var parent = localMap.canvas;
        var canvas = layer.gameObject.AddComponent<Canvas>();
        canvas.overrideSorting = true;
        canvas.sortingOrder = (parent != null ? parent.sortingOrder : 0) + 1;
        layer.gameObject.AddComponent<GraphicRaycaster>();
        return layer;
    }

    /// <summary>A click on a monster on the map: Shift opens its Bestiary page, otherwise it toggles the watch.</summary>
    public static void Click(TrackedMonster monster, Watchlist watchlist)
    {
        if (Pointer.Shift) BestiaryPages.BestiaryPageOpener.Open(monster.Definition);
        else watchlist.Toggle(monster.Key);
    }
}
