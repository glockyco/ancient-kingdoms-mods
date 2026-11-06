using System.Collections.Generic;
using Il2Cpp;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Settings;
using PocketCompendium.Core.Text;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;
using PocketCompendium.Features.Gathering.Model;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.Gathering.Ui;

/// <summary>
/// The Gathering list: a tab per category over compact tiles, the current zone's types first with
/// how many are ready, the others dimmed. A click on a tile watches its type.
/// </summary>
internal sealed class GatherListPanel
{
    private const float HeaderHeight = PanelChrome.HeaderHeight;
    private const float TabHeight = 30f;
    private const float Pad = 6f;
    private const float Gap = 6f;
    private const float ControlSize = 22f;
    private const float ControlIconSize = 15f;
    private const float MinWidth = 210f;

    private static readonly GatherCategory[] Tabs = { GatherCategory.Herbs, GatherCategory.Ores, GatherCategory.Fishing, GatherCategory.Sparks };
    private static readonly Color TabActive = new(0.906f, 0.698f, 0.290f, 0.14f);
    private static readonly Color TabEmpty = new(1f, 1f, 1f, 0.18f);

    private readonly GatheringSettings _settings;
    private readonly Feature _feature;
    private readonly List<GatherTileView> _tiles = new();
    private readonly List<RectTransform> _dragHandles = new();
    private readonly List<GatherType> _shown = new();
    private readonly TabView[] _tabs = new TabView[Tabs.Length];

    private PanelChrome _chrome;
    private RectTransform _header;
    private IconButton _settingsButton;
    private IconButton _lockButton;
    private IconButton _respawningButton;
    private HoverText _respawningTooltip;
    private HoverText _lockTooltip;
    private RectTransform _grid;
    private Label _empty;

    public GatherListPanel(GatheringSettings settings, Feature feature)
    {
        _settings = settings;
        _feature = feature;
    }

    private PanelHost Host => _settings.Panel;
    public bool Exists => Host.Exists;

    private GatherCategory Tab => Tabs[Mathf.Clamp(_settings.Tab.Value, 0, Tabs.Length - 1)];

    public void Create()
    {
        if (Host.Exists) return;
        Host.Create();
        var root = Host.Rect;
        _chrome = new PanelChrome(root);
        _header = _chrome.Header;
        _chrome.Title.Value = "Gathering";
        _lockButton = ControlButton(Icons.LockOpen, 0, out _lockTooltip);
        _settingsButton = ControlButton(Icons.Sliders, 1, out var settingsTooltip);
        _respawningButton = ControlButton(Icons.Timer, 2, out _respawningTooltip);
        settingsTooltip.Text = "<b>Settings</b>\n" + ModText.Name + "'s settings, on the Gathering page.";

        for (int index = 0; index < Tabs.Length; index++) _tabs[index] = new TabView(root, IconOf(Tabs[index]));
        var line = HudFactory.Box("tabLine", root, Theme.Line);
        HudFactory.Place(line, new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(0f, -HeaderHeight - TabHeight - 1f), new Vector2(0f, -HeaderHeight - TabHeight));

        _grid = HudFactory.Rect("grid", root).GetComponent<RectTransform>();
        _empty = HudFactory.Label("empty", root, 12.5f, Theme.Dim, Align.Center);
        _dragHandles.Clear();
        _dragHandles.Add(_header);
        Host.ResizesHeight = false;
    }

    public void Destroy()
    {
        Host.Destroy();
        _tiles.Clear();
        _dragHandles.Clear();
    }

    public void SetVisible(bool visible) => Host.SetVisible(visible);

    /// <summary>Lays out the chosen tab's tiles: the zone's types first, then, with All zones, the others.</summary>
    public void Rebuild(GatherCatalogue catalogue, int zone, double now)
    {
        var nodes = catalogue.Zone(zone);
        bool allZones = _settings.Zones.Value == ZoneScope.AllZones;
        float width = Host.Width;
        int columns = Mathf.Max(1, Mathf.FloorToInt((width - 2f * Pad + Gap) / (GatherTileView.Size + Gap)));

        for (int index = 0; index < Tabs.Length; index++)
        {
            int count = 0;
            foreach (var type in catalogue.Types[Tabs[index]])
                if (allZones || type.Zones.Contains(zone))
                    count++;
            _tabs[index].Set(count, Tabs[index] == Tab);
        }

        _shown.Clear();
        var elsewhere = new List<GatherType>();
        foreach (var type in catalogue.Types[Tab])
        {
            if (type.Zones.Contains(zone)) _shown.Add(type);
            else if (allZones) elsewhere.Add(type);
        }

        int here = _shown.Count;
        _shown.AddRange(elsewhere);
        var player = Player.localPlayer;
        for (int index = 0; index < _shown.Count; index++)
        {
            var type = _shown[index];
            if (index == _tiles.Count) _tiles.Add(new GatherTileView(_grid));
            var tile = _tiles[index];
            tile.SetActive(true);

            bool watched = _settings.Watched(type.Key);
            bool silhouette = !Discovered(player, type);
            string caption = null;
            bool ready = false;
            var summary = default(TypeSummary);
            if (index < here)
            {
                summary = GatherLogic.Summarize(nodes, type, now);
                ready = summary.Ready > 0;
                caption = GatherLogic.Caption(summary, now);
            }

            tile.Set(type, catalogue.Icon(type), caption, ready, watched, silhouette);
            tile.SetTooltip(GatherTooltip.Build(type, catalogue, nodes, zone, summary, now, watched, silhouette));
            HudFactory.TopLeft(tile.Rect, Pad + index % columns * (GatherTileView.Size + Gap),
                Pad + index / columns * (GatherTileView.Size + Gap), GatherTileView.Size, GatherTileView.Size);
        }

        for (int index = _shown.Count; index < _tiles.Count; index++) _tiles[index].SetActive(false);
        Layout(columns);
    }

    /// <summary>Runs every frame: hover looks, header buttons, tabs, tiles, then placement.</summary>
    public void UpdateInput(out bool changed)
    {
        changed = false;
        if (!Host.Exists) return;
        Host.UpdateGrip();
        UpdateLockLook();

        if (_settingsButton.Update()) SettingsWindow.Current?.Open(_feature);
        UpdateRespawningLook();
        if (_respawningButton.Update())
        {
            _settings.Growing.Value = _settings.Growing.Value == GrowingNodes.Hide ? GrowingNodes.Show : GrowingNodes.Hide;
            _settings.Save();
        }
        if (_lockButton.Update())
        {
            // Under Lock all the panel's own lock cannot unlock it, so the click leads to the switch that can.
            if (PanelHost.LockAll()) SettingsWindow.Current?.OpenLayout();
            else Host.Locked = !Host.Locked;
        }

        for (int index = 0; index < _tabs.Length; index++)
        {
            if (!_tabs[index].Update() || index == _settings.Tab.Value) continue;
            _settings.Tab.Value = index;
            _settings.Save();
            changed = true;
        }

        foreach (var tile in _tiles)
        {
            if (tile.Type == null || !tile.UpdateHover() || !Pointer.Clicked(tile.Rect)) continue;
            _settings.ToggleWatch(tile.Type.Key);
            changed = true;
        }

        Host.Update(_dragHandles);
    }

    private void Layout(int columns)
    {
        int count = _shown.Count;
        int used = Mathf.Max(1, Mathf.Min(columns, count));
        float width = Mathf.Max(MinWidth, 2f * Pad + used * GatherTileView.Size + (used - 1) * Gap);
        int lines = Mathf.Max(1, (count + columns - 1) / columns);
        float gridHeight = count > 0 ? 2f * Pad + lines * GatherTileView.Size + (lines - 1) * Gap : 40f;

        _chrome.LayoutHeader(width, width - 70f);
        float tabWidth = (width - 2f * Pad) / Tabs.Length;
        for (int index = 0; index < _tabs.Length; index++)
            _tabs[index].Place(Pad + index * tabWidth, HeaderHeight, tabWidth, TabHeight);

        float top = HeaderHeight + TabHeight + 1f;
        HudFactory.TopLeft(_grid, 0f, top, width, gridHeight);
        _empty.SetActive(count == 0);
        if (count == 0)
        {
            _empty.Value = "None here";
            HudFactory.TopLeft(_empty.Rect, 8f, top, width - 16f, gridHeight);
        }

        Host.SetFittedSize(width, top + gridHeight);
    }

    // The game hides what a character hasn't gathered behind a silhouette in its journal. Sparks have
    // no journal entry and always show.
    private static bool Discovered(Player player, GatherType type)
    {
        if (type.Category == GatherCategory.Sparks || GeneralSettings.Current == null || GeneralSettings.Current.UndiscoveredMonsters.Value)
            return true;
        if (player == null) return true;
        var record = type.Category switch
        {
            GatherCategory.Herbs => player.plantsGathered,
            GatherCategory.Ores => player.minedOres,
            _ => player.fishGathered,
        };
        return record != null && record.ContainsKey(type.Name);
    }

    private static Sprite IconOf(GatherCategory category) => category switch
    {
        GatherCategory.Herbs => Icons.Leaf,
        GatherCategory.Ores => Icons.Pickaxe,
        GatherCategory.Fishing => Icons.Fish,
        _ => Icons.Sparkles,
    };

    private IconButton ControlButton(Sprite icon, int slot, out HoverText tooltip)
    {
        var button = new IconButton(_header, icon, ControlSize, ControlIconSize);
        var rect = button.Rect;
        rect.anchorMin = rect.anchorMax = new Vector2(1f, 0.5f);
        rect.pivot = new Vector2(1f, 0.5f);
        rect.anchoredPosition = new Vector2(-8f - slot * (ControlSize + 4f), -PanelChrome.AccentHeight / 2f);
        tooltip = new HoverText(rect);
        return button;
    }

    // Gold while respawning nodes show, as the timer marks respawns elsewhere in the mod.
    private void UpdateRespawningLook()
    {
        bool shown = _settings.Growing.Value == GrowingNodes.Show;
        _respawningButton.Active = shown;
        _respawningTooltip.Text = shown
            ? "<b>Hide respawning nodes</b>\nMarks only nodes that are ready to gather, on the map and the minimap."
            : "<b>Show respawning nodes</b>\nAlso marks nodes that are respawning, on the map and the minimap.";
    }

    private void UpdateLockLook()
    {
        bool locked = Host.EffectivelyLocked;
        _lockButton.Icon = locked ? Icons.Lock : Icons.LockOpen;
        _lockButton.Active = locked;
        _lockTooltip.Text = PanelHost.LockAll()
            ? "<b>Panels locked</b>\nEvery panel is locked. Click to turn off Lock all panels in General."
            : locked
                ? "<b>Unlock panel</b>\nAllow dragging from the header and resizing from the corner."
                : "<b>Lock panel</b>\nPrevent dragging and resizing.";
    }

    /// <summary>A category's tab: its icon and how many types it lists, gold while chosen.</summary>
    private sealed class TabView
    {
        private readonly Image _background;
        private readonly Image _icon;
        private readonly Label _count;
        private bool _active;
        private int _shownCount;

        public TabView(Transform parent, Sprite icon)
        {
            _background = HudFactory.Sliced("tab", parent, Shapes.Rounded, Color.clear, cornerScale: 0.45f);
            _background.raycastTarget = true;
            Rect = _background.rectTransform;
            _icon = HudFactory.Tinted("icon", Rect, icon, Theme.Control);
            _count = HudFactory.Label("count", Rect, 12f, Theme.Muted, Align.Left);
        }

        public RectTransform Rect { get; }

        public void Set(int count, bool active)
        {
            _active = active;
            _shownCount = count;
            _count.Value = count.ToString();
            _count.Text.fontStyle = active ? Il2CppTMPro.FontStyles.Bold : Il2CppTMPro.FontStyles.Normal;
            Look(false);
        }

        public void Place(float x, float y, float width, float height)
        {
            HudFactory.TopLeft(Rect, x + 1f, y + 3f, width - 2f, height - 6f);
            float inner = height - 6f;
            HudFactory.TopLeft(_icon, width / 2f - 15f, (inner - 15f) / 2f, 15f, 15f);
            HudFactory.TopLeft(_count.Rect, width / 2f + 3f, 0f, width / 2f - 4f, inner);
        }

        /// <summary>Updates the hover look and reports a click.</summary>
        public bool Update()
        {
            bool hovered = Pointer.Over(Rect);
            Look(hovered);
            return hovered && Pointer.Clicked(Rect);
        }

        private void Look(bool hovered)
        {
            _background.color = _active ? TabActive : hovered ? Theme.Hover : Color.clear;
            var colour = _active ? Theme.Ready : _shownCount > 0 ? Theme.Control : TabEmpty;
            _icon.color = colour;
            _count.Color = _active ? Theme.Ready : _shownCount > 0 ? Theme.Muted : Theme.Dim;
        }
    }
}
