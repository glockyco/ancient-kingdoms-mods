using Il2Cpp;
using PocketCompendium.Core.Game;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;
using UnityEngine;

namespace PocketCompendium.Features.WorldMarkers;

/// <summary>What world markers and edge arrows share: when they can show, and where on screen.</summary>
internal static class WorldView
{
    // Screen pixels from the screen's edge to an edge arrow's centre. A marker this far beyond the
    // edge still shows, so it slides out of sight instead of vanishing at the edge.
    public const float EdgeMargin = 46f;

    /// <summary>Whether a ready tracker, a player in the world and a camera let them show.</summary>
    public static bool Ready(out Tracker tracker, out Player player, out Camera camera)
    {
        tracker = Tracker.Current;
        player = GameAccess.LocalPlayer;
        camera = Camera.main;
        if (camera == null && UIMap.singleton != null) camera = UIMap.singleton.MainCamera;
        return tracker != null && tracker.Ready && !tracker.Failed && GameAccess.InWorld && player != null && camera != null;
    }

    /// <summary>A screen point in the overlay that holds the markers and arrows.</summary>
    public static Vector2 Local(Vector2 screenPoint)
    {
        RectTransformUtility.ScreenPointToLocalPointInRectangle(Overlay.Markers, screenPoint, null, out var local);
        return local;
    }
}
