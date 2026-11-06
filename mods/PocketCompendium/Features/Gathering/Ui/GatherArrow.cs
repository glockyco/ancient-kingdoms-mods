using System.Collections.Generic;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;
using PocketCompendium.Features.Gathering.Model;
using PocketCompendium.Features.WorldMarkers;
using UnityEngine;

namespace PocketCompendium.Features.Gathering.Ui;

/// <summary>
/// One edge arrow to the next watched node: the nearest ready one off screen, or the one ready
/// first when none is. It picks its node once a second and follows the camera every frame.
/// </summary>
internal sealed class GatherArrow
{
    private RectTransform _root;
    private EdgeArrowView _arrow;
    private GatherNode _target;
    private GatherType _type;
    private GatherNode _shownTarget;
    private int _shownValue;

    /// <summary>Picks the node to point to, from the current zone's nodes.</summary>
    public void Choose(IReadOnlyList<GatherNode> nodes, IReadOnlyList<GatherType> watched, Vector2 player, double now)
    {
        var camera = Camera.main;
        _target = null;
        _type = null;
        if (camera == null || watched.Count == 0) return;
        var screen = new Vector2(Screen.width, Screen.height);
        _target = GatherLogic.Next(nodes, watched, player.x, player.y, now, node => OffScreen(camera, node, screen));
        if (_target == null) return;
        foreach (var type in watched)
        {
            if (!_target.Offers(type)) continue;
            _type = type;
            break;
        }
    }

    /// <summary>Places the arrow at the screen's edge towards its node, every frame.</summary>
    public void Update(GatherCatalogue catalogue, Vector2 player, double now)
    {
        var camera = Camera.main;
        if (_target == null || _type == null || camera == null)
        {
            SetShown(false);
            return;
        }

        var screen = new Vector2(Screen.width, Screen.height);
        Vector3 point = camera.WorldToScreenPoint(new Vector3(_target.X, _target.Y, 0f));
        bool behind = point.z < 0f;
        if (!behind && point.x >= 0f && point.y >= 0f && point.x <= screen.x && point.y <= screen.y)
        {
            SetShown(false);
            return;
        }

        Vector2 centre = screen / 2f;
        Vector2 direction = (Vector2)point - centre;
        if (behind) direction = -direction;
        if (direction.sqrMagnitude < 1f)
        {
            SetShown(false);
            return;
        }

        Ensure();
        SetShown(true);
        // Where the line from the screen's middle leaves the inset screen, as for the boss arrows.
        Vector2 half = centre - new Vector2(WorldView.EdgeMargin, WorldView.EdgeMargin);
        float reach = Mathf.Min(half.x / Mathf.Max(0.001f, Mathf.Abs(direction.x)), half.y / Mathf.Max(0.001f, Mathf.Abs(direction.y)));
        Vector2 edge = centre + direction * reach;
        _arrow.Rect.anchoredPosition = WorldView.Local(edge);
        _arrow.Aim(Mathf.Atan2(direction.y, direction.x) * Mathf.Rad2Deg, edge.x < centre.x);

        // Positions follow the camera every frame. The text changes only with its node, distance or time.
        bool ready = _target.IsReady(now);
        int value = ready
            ? Mathf.RoundToInt(Vector2.Distance(player, new Vector2(_target.X, _target.Y)))
            : -(int)System.Math.Ceiling(_target.ReadyAt - now);
        if (_target == _shownTarget && value == _shownValue) return;
        _shownTarget = _target;
        _shownValue = value;
        string state = ready ? value + " yd" : (_target.Stale ? "~" : "") + StateText.Short(_target.ReadyAt - now);
        _arrow.Show(catalogue.Icon(_type), Theme.Steel, Theme.Text, GatherTooltip.NameOf(_type, catalogue), state, false);
    }

    public void Destroy()
    {
        if (_root != null) Object.Destroy(_root.gameObject);
        _root = null;
        _arrow = null;
        _target = null;
        _shownTarget = null;
    }

    private void Ensure()
    {
        if (_root != null) return;
        _root = HudFactory.Rect("PC_GatheringArrow", Overlay.Markers).GetComponent<RectTransform>();
        HudFactory.Stretch(_root, Vector2.zero, Vector2.zero);
        _arrow = new EdgeArrowView(_root);
        _shownTarget = null;
    }

    private void SetShown(bool shown)
    {
        if (_root != null && _root.gameObject.activeSelf != shown) _root.gameObject.SetActive(shown);
    }

    private static bool OffScreen(Camera camera, GatherNode node, Vector2 screen)
    {
        Vector3 point = camera.WorldToScreenPoint(new Vector3(node.X, node.Y, 0f));
        return point.z < 0f || point.x < 0f || point.y < 0f || point.x > screen.x || point.y > screen.y;
    }
}
