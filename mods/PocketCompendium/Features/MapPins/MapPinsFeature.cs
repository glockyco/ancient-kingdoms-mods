using System.Collections.Generic;
using Il2Cpp;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Game;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.MapPins;

/// <summary>
/// Portrait pins for the tracked monsters of the player's zone on the game's local map, placed
/// the way the game places its map notes. Dead monsters carry a time tag, monsters that are up
/// glow, and the game's tooltip gives the details.
/// </summary>
public sealed class MapPinsFeature : Feature
{
    // The game closes the live map in Temple of Valaark.
    private const int MaplessZone = 23;

    private readonly Dictionary<string, PinView> _pins = new();
    private RectTransform _container;
    private int _version = -1;

    public MapPinsFeature()
        : base("MapPins", "Map pins", "Marks the bosses, elites and fabled monsters in your zone on the map, with their respawn timers.")
    {
    }

    public override Sprite Icon => Icons.MapPin;

    public override bool UsesTracker => true;

    protected internal override void Enable() => _version = -1;

    protected internal override void Disable()
    {
        if (_container != null) Object.Destroy(_container.gameObject);
        _container = null;
        _pins.Clear();
    }

    // The pins live inside the game's map, which goes with the World scene.
    protected internal override void OnSceneUnloaded(string sceneName)
    {
        if (sceneName != "World") return;
        _container = null;
        _pins.Clear();
    }

    protected internal override void Update()
    {
        var tracker = Tracker.Current;
        var player = GameAccess.LocalPlayer;
        var map = UIMap.singleton;
        var questTracking = UIQuestTracking.singleton;
        bool open = tracker != null && tracker.Ready && !tracker.Failed && player != null && map != null
                    && map.localMap != null && map.panel.activeSelf && map.localMap.enabled && player.idZone != MaplessZone
                    && questTracking != null && questTracking.mapCamera != null;
        if (_container != null && _container.gameObject.activeSelf != open) _container.gameObject.SetActive(open);
        if (!open) return;

        if (_container == null) CreateContainer(map.localMap);

        bool refresh = tracker.Version != _version;
        _version = tracker.Version;
        var camera = questTracking.mapCamera;
        var rect = map.localMap.rectTransform.rect;
        var watchlist = Watchlist.Current;
        TrackedMonster clicked = null;

        foreach (var pin in _pins.Values) pin.Used = false;
        foreach (var monster in tracker.Monsters)
        {
            if (monster.Zone != player.idZone) continue;

            var position = monster.Position;
            Vector3 viewport = camera.WorldToViewportPoint(new Vector3(position.x, position.y, 0f));
            if (viewport.z < 0f || viewport.x < 0f || viewport.x > 1f || viewport.y < 0f || viewport.y > 1f) continue;

            if (!_pins.TryGetValue(monster.Key, out var pin))
            {
                pin = new PinView(_container, map.localMap.gameObject.layer);
                _pins[monster.Key] = pin;
                refresh = true;
            }

            pin.Used = true;
            pin.SetActive(true);
            pin.Rect.anchoredPosition = new Vector2(rect.xMin + viewport.x * rect.width, rect.yMin + viewport.y * rect.height);
            if (refresh) pin.Show(monster, tracker.Now, watchlist.Contains(monster.Key));
            if (pin.UpdateHover() && Pointer.Clicked(pin.Rect)) clicked = monster;
        }

        foreach (var pin in _pins.Values)
            if (!pin.Used)
                pin.SetActive(false);

        if (clicked == null) return;
        if (Pointer.Shift) BestiaryPages.BestiaryPageOpener.Open(clicked.Definition);
        else
        {
            watchlist.Toggle(clicked.Key);
            _version = -1;
        }
    }

    private void CreateContainer(RawImage localMap)
    {
        _container = HudFactory.Rect("PC_MapPins", localMap.rectTransform).GetComponent<RectTransform>();
        _container.gameObject.layer = localMap.gameObject.layer;
        HudFactory.Stretch(_container, Vector2.zero, Vector2.zero);
        _container.SetAsLastSibling();

        // The map window's frame lies over the map and takes every pointer event there. A nested
        // canvas one step above the map's own draws the pins over the frame and lets them take
        // hover and clicks first.
        var parent = localMap.canvas;
        var canvas = _container.gameObject.AddComponent<Canvas>();
        canvas.overrideSorting = true;
        canvas.sortingOrder = (parent != null ? parent.sortingOrder : 0) + 1;
        _container.gameObject.AddComponent<GraphicRaycaster>();
    }
}

/// <summary>One monster on the map: a round portrait, a time tag below a dead one, a glow when up.</summary>
internal sealed class PinView
{
    private const float Size = 30f;
    private static readonly Color TagBackground = new(0.039f, 0.047f, 0.063f, 0.9f);
    private static readonly Color TagEdge = new(1f, 1f, 1f, 0.16f);
    private static readonly Color HoverRing = new(1f, 1f, 1f, 0.9f);

    private readonly RoundPortraitView _portrait;
    private readonly Image _hover;
    private readonly Image _tag;
    private readonly Label _time;
    private readonly HoverText _tooltip;

    public PinView(RectTransform parent, int layer)
    {
        var hit = HudFactory.Box("PC_MapPin", parent, Color.clear);
        hit.raycastTarget = true;
        hit.gameObject.layer = layer;
        Rect = hit.rectTransform;
        Rect.sizeDelta = new Vector2(Size, Size);
        // A button takes the click, so the map underneath does not act on it.
        hit.gameObject.AddComponent<Button>().transition = Selectable.Transition.None;
        _tooltip = new HoverText(Rect);

        _hover = HudFactory.Tinted("hover", Rect, Shapes.Disc, HoverRing);
        _hover.rectTransform.sizeDelta = new Vector2(Size + 4f, Size + 4f);
        _hover.enabled = false;
        _portrait = new RoundPortraitView(Rect, Size, 2f, 0f);

        _tag = HudFactory.Sliced("tag", Rect, Shapes.Rounded, TagBackground, cornerScale: 0.45f);
        var edge = HudFactory.Sliced("edge", _tag.rectTransform, Shapes.RoundedOutline, TagEdge, cornerScale: 0.45f);
        HudFactory.Stretch(edge, Vector2.zero, Vector2.zero);
        _time = HudFactory.Label("time", _tag.rectTransform, 11.5f, Color.white, Align.Center, bold: true, monospaced: true);
        HudFactory.Stretch(_time.Rect, new Vector2(4f, 0f), new Vector2(-4f, 0f));
        foreach (var child in Rect.GetComponentsInChildren<Transform>(true)) child.gameObject.layer = layer;
    }

    public RectTransform Rect { get; }
    public bool Used { get; set; }

    public void SetActive(bool active)
    {
        if (Rect.gameObject.activeSelf != active) Rect.gameObject.SetActive(active);
    }

    public void Show(TrackedMonster monster, double now, bool watched)
    {
        var state = monster.State;
        bool named = MonsterTooltip.Discovered(monster.Key);
        _portrait.Set(GameAccess.Portrait(monster.Definition), GameAccess.TierColor(monster.Tier), !state.IsUp, !named,
            StateText.Remaining(state, monster.Rules, now));
        _portrait.SetGlow(state.IsUp);

        bool tagged = !state.IsUp && state.State is not (SpawnState.Seen or SpawnState.NotSeen);
        _tag.gameObject.SetActive(tagged);
        if (tagged)
        {
            _time.Value = StateText.Caption(state, now);
            float width = Mathf.Ceil(_time.PreferredWidth) + 10f;
            var tag = _tag.rectTransform;
            tag.anchorMin = tag.anchorMax = new Vector2(0.5f, 0.5f);
            tag.pivot = new Vector2(0.5f, 1f);
            tag.sizeDelta = new Vector2(width, 18f);
            tag.anchoredPosition = new Vector2(0f, -Size / 2f + 3f);
        }

        _tooltip.Text = MonsterTooltip.Build(monster, now, named, watched, null, Vector2.zero);
    }

    public bool UpdateHover()
    {
        bool hovered = Pointer.Over(Rect);
        _hover.enabled = hovered;
        return hovered;
    }
}
