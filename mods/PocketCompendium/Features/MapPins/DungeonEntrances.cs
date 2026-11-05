using System.Collections.Generic;
using Il2Cpp;
using Il2CppInterop.Runtime.InteropTypes.Arrays;
using PocketCompendium.Core.Text;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;
using PocketCompendium.Features.BossList.Model;
using PocketCompendium.Features.BossList.Ui;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.MapPins;

/// <summary>
/// The dungeon entrances on the local map. Hovering one, where the game writes the dungeon's name
/// under the map, shows the dungeon's tracked monsters beside it in the boss list's compact style.
/// </summary>
internal sealed class DungeonEntrances
{
    // The game names the map icon of every dungeon entrance this way.
    private const string IconName = "DungeonMinimapIcon";

    // An entrance icon sits within a few yd of the portal into its dungeon.
    private const float PortalReach = 6f;

    private readonly List<Entrance> _entrances = new();
    private DungeonCard _card;
    private int _zone = -1;

    public void Clear()
    {
        foreach (var entrance in _entrances) entrance.Destroy();
        _entrances.Clear();
        _card?.Destroy();
        _card = null;
        _zone = -1;
    }

    /// <summary>Places the entrances, shows the card of the hovered one and returns a monster clicked on it.</summary>
    public TrackedMonster Update(RectTransform container, Camera camera, Rect map, Tracker tracker, Watchlist watchlist, int zone, int layer)
    {
        if (zone != _zone) Find(container, zone, layer);
        _card ??= new DungeonCard(container, layer);

        Entrance hovered = null;
        foreach (var entrance in _entrances)
            if (entrance.Place(camera, map) && Pointer.Over(entrance.Rect))
                hovered = entrance;

        return _card.Update(hovered?.Rect, hovered?.Dungeon ?? -1, map, tracker, watchlist);
    }

    // The icons of the player's zone are the only active ones, so this runs once per zone.
    private void Find(RectTransform container, int zone, int layer)
    {
        foreach (var entrance in _entrances) entrance.Destroy();
        _entrances.Clear();
        _zone = zone;
        var portals = Object.FindObjectsOfType<Portal>();
        foreach (var icon in Object.FindObjectsOfType<UIMapIcon>())
        {
            if (icon.name != IconName) continue;
            int dungeon = DungeonOf(icon.transform.position, portals);
            if (dungeon >= 0) _entrances.Add(new Entrance(container, icon, dungeon, layer));
        }
    }

    // The icon's legend text is the dungeon's name in the player's language, so the portal beside
    // the icon names the dungeon instead.
    private static int DungeonOf(Vector2 icon, Il2CppArrayBase<Portal> portals)
    {
        int dungeon = -1;
        float nearest = PortalReach;
        foreach (var portal in portals)
        {
            float distance = Vector2.Distance(icon, portal.transform.position);
            if (distance >= nearest || !ZoneInfo.zones.ContainsKey(portal.idZone) || !ZoneInfo.zones[portal.idZone].isDungeon) continue;
            nearest = distance;
            dungeon = portal.idZone;
        }

        return dungeon;
    }

    /// <summary>An invisible spot over an entrance icon, which takes the pointer like a map pin.</summary>
    private sealed class Entrance
    {
        private readonly UIMapIcon _icon;
        private readonly Image _spot;

        public Entrance(RectTransform container, UIMapIcon icon, int dungeon, int layer)
        {
            _icon = icon;
            Dungeon = dungeon;
            _spot = HudFactory.Box("PC_DungeonEntrance", container, Color.clear);
            _spot.raycastTarget = true;
            _spot.gameObject.layer = layer;
        }

        public int Dungeon { get; }
        public RectTransform Rect => _spot.rectTransform;

        public void Destroy()
        {
            if (_spot != null) Object.Destroy(_spot.gameObject);
        }

        /// <summary>Puts the spot over the icon and returns whether the icon is on the map.</summary>
        public bool Place(Camera camera, Rect map)
        {
            var renderer = _icon != null ? _icon.GetComponent<SpriteRenderer>() : null;
            var bounds = renderer != null && renderer.sprite != null ? renderer.bounds : default;
            Vector3 centre = camera.WorldToViewportPoint(bounds.center);
            bool shown = renderer != null && renderer.sprite != null && centre.z >= 0f &&
                         centre.x is >= 0f and <= 1f && centre.y is >= 0f and <= 1f;
            if (Rect.gameObject.activeSelf != shown) Rect.gameObject.SetActive(shown);
            if (!shown) return false;

            Vector3 low = camera.WorldToViewportPoint(bounds.min);
            Vector3 high = camera.WorldToViewportPoint(bounds.max);
            Rect.anchoredPosition = new Vector2(map.xMin + centre.x * map.width, map.yMin + centre.y * map.height);
            Rect.sizeDelta = new Vector2(Mathf.Abs(high.x - low.x) * map.width, Mathf.Abs(high.y - low.y) * map.height);
            return true;
        }
    }
}

/// <summary>
/// One dungeon's tracked monsters in the boss list's compact style: the dungeon's name and how many
/// are up, then their tiles four to a line. It stays while the pointer is on its entrance, on the
/// card or on the strip between them, so a tile's tooltip and clicks work as in the boss list.
/// </summary>
internal sealed class DungeonCard
{
    private const int Columns = 4;
    private const float MinWidth = 210f;
    private const float Gap = 8f;

    // A pointer that slips off the entrance, the strip and the card for a moment keeps the card.
    private const float Linger = 0.3f;

    // The dungeon as the boss list shows a zone: every tier and level, in the order of states.
    private static readonly ListFilter Everything = new() { Zones = ZoneFilter.AllZones, Sort = SortOrder.State };

    private readonly RectTransform _root;
    private readonly RectTransform _bridge;
    private readonly PanelChrome _chrome;
    private readonly TileGrid _grid;
    private readonly List<ListEntry> _entries = new();
    private readonly List<TrackedMonster> _monsters = new();
    private readonly List<ListGroup> _groups = new();
    private int _dungeon = -1;
    private int _shownSecond = -1;
    private int _shownVersion = -1;
    private float _keepUntil;

    /// <param name="pins">The map pins' container. The card lies over it on a canvas of its own, so a
    /// pin under the card does not take the pointer.</param>
    public DungeonCard(RectTransform pins, int layer)
    {
        _root = HudFactory.Rect("PC_DungeonCard", pins.parent).GetComponent<RectTransform>();
        _root.gameObject.layer = layer;
        _root.anchorMin = _root.anchorMax = new Vector2(0.5f, 0.5f);
        _root.pivot = new Vector2(0f, 1f);
        var below = pins.GetComponent<Canvas>();
        var canvas = _root.gameObject.AddComponent<Canvas>();
        canvas.overrideSorting = true;
        canvas.sortingOrder = (below != null ? below.sortingOrder : 0) + 1;
        _root.gameObject.AddComponent<GraphicRaycaster>();
        _chrome = new PanelChrome(_root);
        // The background takes the pointer, so the card counts as hovered between its tiles.
        _chrome.Background.raycastTarget = true;
        var body = HudFactory.Rect("tiles", _root).GetComponent<RectTransform>();
        HudFactory.TopLeft(body, 0f, PanelChrome.HeaderHeight, 0f, 0f);
        _grid = new TileGrid(body);
        // An invisible strip over the gap, so the pointer never leaves the card on its way in.
        var bridge = HudFactory.Box("bridge", _root, Color.clear);
        bridge.raycastTarget = true;
        _bridge = bridge.rectTransform;
        _root.gameObject.SetActive(false);
    }

    public void Destroy()
    {
        if (_root != null) Object.Destroy(_root.gameObject);
    }

    /// <summary>
    /// Shows the card of the entrance under the pointer, or keeps the shown one while the pointer is
    /// on it. Returns a monster clicked on the card.
    /// </summary>
    public TrackedMonster Update(RectTransform entrance, int dungeon, Rect map, Tracker tracker, Watchlist watchlist)
    {
        bool onCard = _root.gameObject.activeSelf && (Pointer.Over(_root) || Pointer.Over(_bridge));
        if (entrance != null && dungeon != _dungeon)
        {
            // A tile's caption needs an active parent when it is made, so the card shows first.
            _dungeon = dungeon;
            if (!_root.gameObject.activeSelf) _root.gameObject.SetActive(true);
            if (!Fill(tracker, watchlist))
            {
                Hide();
                return null;
            }

            Place(entrance, map);
        }

        if (entrance != null || onCard) _keepUntil = Time.unscaledTime + Linger;
        if (Time.unscaledTime > _keepUntil || _dungeon < 0)
        {
            Hide();
            return null;
        }

        // Countdowns move once a second, and a watch or a kill changes the tracker's version.
        int second = Mathf.FloorToInt((float)tracker.Now);
        if (second != _shownSecond || tracker.Version != _shownVersion) Fill(tracker, watchlist);
        return _grid.UpdateInput(true);
    }

    private void Hide()
    {
        if (_root.gameObject.activeSelf) _root.gameObject.SetActive(false);
        _dungeon = -1;
    }

    // Returns false for a dungeon without tracked monsters, which gets no card.
    private bool Fill(Tracker tracker, Watchlist watchlist)
    {
        _shownSecond = Mathf.FloorToInt((float)tracker.Now);
        _shownVersion = tracker.Version;
        var player = Player.localPlayer;
        int playerLevel = player != null ? player.level.current : 0;

        _entries.Clear();
        _monsters.Clear();
        foreach (var monster in tracker.Monsters)
        {
            if (monster.Zone != _dungeon) continue;
            _entries.Add(new ListEntry
            {
                Key = monster.Key,
                Zone = monster.Zone,
                Tier = monster.Tier,
                Level = monster.Level,
                State = monster.State,
                Watched = watchlist.Contains(monster.Key),
                Discovered = Discovery.Known(monster.Key),
                Distance = float.NaN,
            });
            _monsters.Add(monster);
        }

        ListModel.Build(_entries, Everything, playerLevel, _dungeon, _groups);
        if (_groups.Count == 0) return false;

        int up = 0;
        _grid.Begin();
        foreach (int index in _groups[0].Rows)
        {
            var monster = _monsters[index];
            var entry = _entries[index];
            bool shown = Discovery.Shown(monster.Key);
            if (monster.State.IsUp) up++;
            var data = new RowData
            {
                Monster = monster,
                Entry = entry,
                Silhouette = !shown,
                Now = tracker.Now,
                PlayerLevel = playerLevel,
            };
            _grid.Add(data, entry.Watched, MonsterTooltip.Build(monster, tracker.Now, shown, entry.Watched, null, Vector2.zero), Columns);
        }

        _grid.End();
        // The map draws only its own layer, as for the pins, and new tiles start on the default one.
        int layer = _root.gameObject.layer;
        foreach (var child in _root.GetComponentsInChildren<Transform>(true)) child.gameObject.layer = layer;
        _chrome.Title.LocalizedValue = GameText.ZoneName("", _dungeon);
        _chrome.Count.Value = up > 0 ? up + " up" : "";

        int used = Mathf.Min(Columns, _grid.Count);
        float width = Mathf.Max(MinWidth, TileGrid.Width(used), _chrome.TitleWidth);
        _chrome.LayoutHeader(width, width - 20f);
        _root.sizeDelta = new Vector2(width, PanelChrome.HeaderHeight + TileGrid.Height(_grid.Count, Columns));
        return true;
    }

    // Right of the entrance and level with it, or left of it near the map's right edge, inside the
    // map. The strip spans the gap at the entrance's height.
    private void Place(RectTransform entrance, Rect map)
    {
        var size = _root.sizeDelta;
        var at = entrance.anchoredPosition;
        var spot = entrance.sizeDelta;
        float half = spot.x / 2f + Gap;
        bool right = at.x + half + size.x <= map.xMax;
        float x = right ? at.x + half : at.x - half - size.x;
        float y = Mathf.Clamp(at.y + PanelChrome.HeaderHeight / 2f, map.yMin + size.y, map.yMax);
        _root.anchoredPosition = new Vector2(x, y);
        HudFactory.TopLeft(_bridge, right ? -Gap : size.x, y - (at.y + spot.y / 2f), Gap, spot.y);
    }
}
