using System.Collections.Generic;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Game;
using PocketCompendium.Core.Text;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;
using UnityEngine;

namespace PocketCompendium.Features.WorldMarkers;

/// <summary>
/// Arrows at the screen's edge to the monsters of the player's zone that are up out of sight,
/// under the game's interface.
/// </summary>
public sealed class EdgeArrowsFeature : Feature
{
    private readonly Dictionary<string, Slot> _arrows = new();
    private RectTransform _root;

    /// <param name="earlier">Whether arrows showed while they were part of world markers.</param>
    public EdgeArrowsFeature(bool earlier)
        : base("EdgeArrows", "Edge arrows", "Shows an arrow at the edge of the screen for each living monster in your zone that is off screen.", earlier)
    {
    }

    public override bool UsesTracker => true;

    protected internal override void Enable()
    {
        _root = HudFactory.Rect("PC_EdgeArrows", Overlay.Markers).GetComponent<RectTransform>();
        HudFactory.Stretch(_root, Vector2.zero, Vector2.zero);
    }

    protected internal override void Disable()
    {
        if (_root != null) Object.Destroy(_root.gameObject);
        _root = null;
        _arrows.Clear();
    }

    protected internal override void Update()
    {
        bool show = WorldView.Ready(out var tracker, out var player, out var camera);
        if (_root.gameObject.activeSelf != show) _root.gameObject.SetActive(show);
        if (!show) return;

        foreach (var slot in _arrows.Values) slot.Used = false;

        Vector2 position = player.transform.position;
        var screen = new Vector2(Screen.width, Screen.height);
        foreach (var monster in tracker.Monsters)
            if (monster.Zone == player.idZone && monster.State.IsUp)
                Show(monster, camera, position, screen, tracker.Version);

        foreach (var slot in _arrows.Values)
            if (!slot.Used)
                slot.Arrow.SetActive(false);
    }

    private void Show(TrackedMonster monster, Camera camera, Vector2 player, Vector2 screen, int version)
    {
        Vector2 where = monster.Position;

        Vector3 point = camera.WorldToScreenPoint(new Vector3(where.x, where.y, 0f));
        bool behind = point.z < 0f;
        if (!behind && point.x >= 0f && point.y >= 0f && point.x <= screen.x && point.y <= screen.y) return;

        Vector2 centre = screen / 2f;
        Vector2 direction = (Vector2)point - centre;
        if (behind) direction = -direction;
        if (direction.sqrMagnitude < 1f) return;

        // Where the line from the screen's middle leaves the inset screen.
        Vector2 half = centre - new Vector2(WorldView.EdgeMargin, WorldView.EdgeMargin);
        float reach = Mathf.Min(half.x / Mathf.Max(0.001f, Mathf.Abs(direction.x)), half.y / Mathf.Max(0.001f, Mathf.Abs(direction.y)));
        Vector2 edge = centre + direction * reach;

        if (!_arrows.TryGetValue(monster.Key, out var slot))
        {
            slot = new Slot(new EdgeArrowView(_root));
            _arrows[monster.Key] = slot;
        }

        slot.Used = true;
        slot.Arrow.SetActive(true);
        slot.Arrow.Rect.anchoredPosition = WorldView.Local(edge);
        slot.Arrow.Aim(Mathf.Atan2(direction.y, direction.x) * Mathf.Rad2Deg, edge.x < centre.x);

        // Positions follow the camera every frame. Text changes once per tracker refresh.
        if (slot.Version == version) return;
        slot.Version = version;

        bool named = Discovery.Shown(monster.Key);
        var tier = GameAccess.TierColor(monster.Tier);
        float distance = Vector2.Distance(player, where);
        slot.Arrow.Show(GameAccess.Portrait(monster.Definition), tier, Theme.Readable(tier),
            named ? GameText.EntityName(monster.Key) : "???", "Up · " + Mathf.RoundToInt(distance) + " yd", !named);
    }

    private sealed class Slot
    {
        public Slot(EdgeArrowView arrow) => Arrow = arrow;

        public EdgeArrowView Arrow { get; }
        public bool Used;

        // The tracker version the arrow's text shows.
        public int Version = -1;
    }
}
