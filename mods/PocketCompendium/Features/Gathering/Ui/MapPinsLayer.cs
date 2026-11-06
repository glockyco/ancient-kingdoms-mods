using System.Collections.Generic;
using Il2Cpp;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;
using PocketCompendium.Features.Gathering.Model;
using PocketCompendium.Features.MapPins;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.Gathering.Ui;

/// <summary>
/// Pins on the local map for every node of the watched types, dimmed with a time while it grows
/// back. The game draws the player's arrow inside the map's picture, so the layer draws it again
/// above the pins.
/// </summary>
internal sealed class MapPinsLayer
{
    private const float Size = 22f;

    private static readonly Color TagBackground = new(0.039f, 0.047f, 0.063f, 0.9f);

    private readonly List<Pin> _pins = new();
    private RectTransform _layer;
    private Image _player;
    private Vector3 _cameraPosition;
    private float _cameraSize;
    private int _placedVersion = -1;

    /// <summary>Whether the local map shows a zone that has one.</summary>
    public static bool MapOpen(out UIMap map, out Camera camera)
    {
        map = UIMap.singleton;
        var tracking = UIQuestTracking.singleton;
        camera = tracking != null ? tracking.mapCamera : null;
        var player = Player.localPlayer;
        return map != null && map.localMap != null && map.panel.activeSelf && map.localMap.enabled && camera != null
               && player != null && player.idZone != MapOverlay.MaplessZone;
    }

    /// <summary>Shows the pins while the map is open. They move only when the map's view or the times change.</summary>
    public void Update(IReadOnlyList<GatherNode> nodes, IReadOnlyList<GatherType> watched, GatherCatalogue catalogue,
        double now, bool hideGrowing, int version)
    {
        bool open = MapOpen(out var map, out var camera);
        if (_layer != null && _layer.gameObject.activeSelf != open) _layer.gameObject.SetActive(open);
        if (!open) return;

        if (_layer == null) Create(map);
        UpdatePlayer(map, camera);

        var position = camera.transform.position;
        float size = camera.orthographicSize;
        if (version == _placedVersion && position == _cameraPosition && size == _cameraSize) return;
        _placedVersion = version;
        _cameraPosition = position;
        _cameraSize = size;

        var rect = map.localMap.rectTransform.rect;
        int used = 0;
        foreach (var node in nodes)
        {
            GatherType type = null;
            foreach (var candidate in watched)
            {
                if (!node.Offers(candidate)) continue;
                type = candidate;
                break;
            }

            if (type == null) continue;
            bool ready = node.IsReady(now);
            if (hideGrowing && !ready) continue;

            Vector3 viewport = camera.WorldToViewportPoint(new Vector3(node.X, node.Y, 0f));
            if (viewport.x < 0f || viewport.x > 1f || viewport.y < 0f || viewport.y > 1f) continue;

            if (used == _pins.Count) _pins.Add(new Pin(_layer, map.localMap.gameObject.layer));
            var pin = _pins[used++];
            pin.SetActive(true);
            pin.Rect.anchoredPosition = new Vector2(rect.xMin + viewport.x * rect.width, rect.yMin + viewport.y * rect.height);
            pin.Show(catalogue.Icon(type), ready, node, now);
        }

        for (int index = used; index < _pins.Count; index++) _pins[index].SetActive(false);
        _player.rectTransform.SetAsLastSibling();
    }

    public void Destroy()
    {
        if (_layer != null) Object.Destroy(_layer.gameObject);
        Forget();
    }

    /// <summary>Forgets the pins after the game destroyed its interface.</summary>
    public void Forget()
    {
        _layer = null;
        _player = null;
        _pins.Clear();
        _placedVersion = -1;
    }

    private void Create(UIMap map)
    {
        _layer = MapOverlay.CreateLayer(map.localMap, "PC_GatheringPins");
        _player = HudFactory.Icon("player", _layer, null);
        _player.raycastTarget = false;
        _player.gameObject.layer = map.localMap.gameObject.layer;
        _placedVersion = -1;
    }

    private void UpdatePlayer(UIMap map, Camera camera)
    {
        var player = Player.localPlayer;
        var mark = player != null ? player.transform.Find("MiniMapMark") : null;
        var renderer = mark != null ? mark.GetComponent<SpriteRenderer>() : null;
        if (renderer == null || renderer.sprite == null)
        {
            _player.enabled = false;
            return;
        }

        var rect = map.localMap.rectTransform.rect;
        Vector3 viewport = camera.WorldToViewportPoint(mark.position);
        _player.enabled = renderer.enabled;
        if (_player.sprite != renderer.sprite) _player.sprite = renderer.sprite;
        // The arrow's size in the world, at the map's scale.
        float size = renderer.bounds.size.y / (2f * camera.orthographicSize) * rect.height;
        _player.rectTransform.sizeDelta = new Vector2(size, size);
        _player.rectTransform.anchoredPosition = new Vector2(rect.xMin + viewport.x * rect.width, rect.yMin + viewport.y * rect.height);
        _player.rectTransform.localRotation = Quaternion.Euler(0f, 0f, mark.eulerAngles.z);
    }

    private sealed class Pin
    {
        private readonly RoundPortraitView _portrait;
        private readonly Image _tag;
        private readonly Label _time;

        public Pin(RectTransform parent, int layer)
        {
            Rect = HudFactory.Rect("pin", parent).GetComponent<RectTransform>();
            Rect.sizeDelta = new Vector2(Size, Size);
            _portrait = new RoundPortraitView(Rect, Size, 2f, 0f);
            _tag = HudFactory.Sliced("tag", Rect, Shapes.Rounded, TagBackground, cornerScale: 0.45f);
            _time = HudFactory.Label("time", _tag.rectTransform, 10.5f, Color.white, Align.Center, bold: true, monospaced: true);
            HudFactory.Stretch(_time.Rect, new Vector2(3f, 0f), new Vector2(-3f, 0f));
            foreach (var child in Rect.GetComponentsInChildren<Transform>(true)) child.gameObject.layer = layer;
            foreach (var graphic in Rect.GetComponentsInChildren<Graphic>(true)) graphic.raycastTarget = false;
        }

        public RectTransform Rect { get; }

        public void SetActive(bool active)
        {
            if (Rect.gameObject.activeSelf != active) Rect.gameObject.SetActive(active);
        }

        public void Show(Sprite icon, bool ready, GatherNode node, double now)
        {
            _portrait.Set(icon, Theme.Steel, down: !ready, silhouette: false);
            _tag.gameObject.SetActive(!ready);
            if (ready) return;
            _time.Value = StateText.Short(node.ReadyAt - now);
            var tag = _tag.rectTransform;
            tag.anchorMin = tag.anchorMax = new Vector2(0.5f, 0.5f);
            tag.pivot = new Vector2(0.5f, 1f);
            tag.sizeDelta = new Vector2(Mathf.Ceil(_time.PreferredWidth) + 8f, 15f);
            tag.anchoredPosition = new Vector2(0f, -Size / 2f + 2f);
        }
    }
}
