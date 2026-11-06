using System.Collections.Generic;
using Il2Cpp;
using PocketCompendium.Core.Ui;
using PocketCompendium.Features.Gathering.Model;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.Gathering.Ui;

/// <summary>
/// The watched types' nodes as small icons on the minimap, dimmed while they grow back. They sit on
/// a canvas of their own, so moving them each frame rebuilds neither the game's HUD nor the panels.
/// </summary>
internal sealed class MinimapIcons
{
    private const float Size = 14f;

    // The minimap shows a circle inside its square image.
    private const float Radius = 0.47f;

    private static readonly Color Back = new(0f, 0f, 0f, 0.75f);
    private static readonly Color Growing = new(0.42f, 0.42f, 0.45f, 1f);

    private readonly List<(Image Back, Image Icon)> _icons = new();
    private readonly List<(GatherNode Node, Sprite Icon)> _near = new();
    private RectTransform _layer;
    private RectTransform _image;

    /// <summary>
    /// Chooses the watched nodes near enough to show, once a second, so a frame only moves the few
    /// the minimap can cover.
    /// </summary>
    public void Choose(IReadOnlyList<GatherNode> nodes, IReadOnlyList<GatherType> watched, GatherCatalogue catalogue,
        Vector2 player, double now, bool hideGrowing)
    {
        _near.Clear();
        var camera = Camera();
        if (camera == null) return;
        // A node that walking for a second can bring onto the minimap.
        float reach = camera.orthographicSize * camera.aspect * 1.5f + 10f;
        float reachSquared = reach * reach;
        foreach (var node in nodes)
        {
            if (hideGrowing && !node.IsReady(now)) continue;
            float dx = node.X - player.x, dy = node.Y - player.y;
            if (dx * dx + dy * dy > reachSquared) continue;
            foreach (var type in watched)
            {
                if (!node.Offers(type)) continue;
                _near.Add((node, catalogue.Icon(type)));
                break;
            }
        }
    }

    /// <summary>Places the chosen nodes on the minimap, every frame.</summary>
    public void Update(double now)
    {
        var camera = Camera();
        if (camera == null || !EnsureLayer())
        {
            Hide(0);
            return;
        }

        var rect = _image.rect;
        int used = 0;
        foreach (var (node, sprite) in _near)
        {
            Vector3 viewport = camera.WorldToViewportPoint(new Vector3(node.X, node.Y, 0f));
            float dx = viewport.x - 0.5f, dy = viewport.y - 0.5f;
            if (dx * dx + dy * dy > Radius * Radius) continue;

            if (used == _icons.Count) _icons.Add(Create());
            var (back, icon) = _icons[used++];
            if (!back.gameObject.activeSelf) back.gameObject.SetActive(true);
            back.rectTransform.anchoredPosition = new Vector2(rect.xMin + viewport.x * rect.width, rect.yMin + viewport.y * rect.height);
            if (icon.sprite != sprite)
            {
                icon.sprite = sprite;
                icon.enabled = sprite != null;
            }
            icon.color = node.IsReady(now) ? Color.white : Growing;
        }

        Hide(used);
    }

    /// <summary>Hides the icons while the local map covers the minimap.</summary>
    public void HideAll() => Hide(0);

    public void Destroy()
    {
        if (_layer != null) Object.Destroy(_layer.gameObject);
        Forget();
    }

    /// <summary>Forgets the icons after the game destroyed its interface.</summary>
    public void Forget()
    {
        _layer = null;
        _image = null;
        _icons.Clear();
        _near.Clear();
    }

    private static Camera Camera()
    {
        var tracking = UIQuestTracking.singleton;
        return tracking != null ? tracking.mapCamera : null;
    }

    private bool EnsureLayer()
    {
        if (_layer != null) return true;
        var map = UIMap.singleton;
        var image = map != null && map.panelMinimap != null ? map.panelMinimap.transform.Find("Minimap Circle/Minimap Image") : null;
        if (image == null) return false;

        _image = image.GetComponent<RectTransform>();
        _layer = HudFactory.Rect("PC_GatheringMinimap", _image).GetComponent<RectTransform>();
        HudFactory.Stretch(_layer, Vector2.zero, Vector2.zero);
        _layer.gameObject.AddComponent<Canvas>();
        return true;
    }

    private (Image, Image) Create()
    {
        var back = HudFactory.Tinted("node", _layer, Shapes.Disc, Back);
        back.raycastTarget = false;
        back.rectTransform.sizeDelta = new Vector2(Size + 4f, Size + 4f);
        var icon = HudFactory.Icon("icon", back.rectTransform, null);
        icon.raycastTarget = false;
        icon.rectTransform.sizeDelta = new Vector2(Size, Size);
        return (back, icon);
    }

    private void Hide(int used)
    {
        for (int index = used; index < _icons.Count; index++)
            if (_icons[index].Back.gameObject.activeSelf)
                _icons[index].Back.gameObject.SetActive(false);
    }
}
