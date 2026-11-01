using System.Collections.Generic;
using Il2Cpp;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Game;
using PocketCompendium.Core.Text;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;
using PocketCompendium.Features.BossList.Model;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.BossList.Ui;

/// <summary>
/// The boss list panel in list or compact style. It rebuilds from the tracker after each refresh,
/// and handles its own buttons, rows, scrolling and placement every frame.
/// </summary>
internal sealed class BossListPanel
{
    private const float AccentHeight = 2f;
    private const float BarHeight = 30f;
    private const float HeaderHeight = AccentHeight + BarHeight;
    private const float ControlSize = 22f;
    private const float ControlIconSize = 15f;
    private const float TilePad = 6f;
    private const float TileGap = 6f;
    private const float EmptyHeight = 40f;
    private const float ScrollStep = 46f;

    // The compact header keeps room for its title, count and controls over a short row of tiles.
    private const float CompactMinWidth = 210f;

    private static readonly Color PanelEdge = new(1f, 1f, 1f, 0.07f);

    private readonly BossListSettings _settings;
    private readonly Feature _feature;
    private readonly ListFilter _filter = new();
    private readonly List<ListEntry> _entries = new();
    private readonly List<TrackedMonster> _monsters = new();
    private readonly List<ListGroup> _groups = new();
    private readonly List<RowView> _rows = new();
    private readonly List<GroupHeaderView> _headers = new();
    private readonly List<MoreLineView> _mores = new();
    private readonly List<TileView> _tiles = new();
    private readonly List<RectTransform> _dragHandles = new();

    private Image _background;
    private RectTransform _header;
    private Label _title;
    private Label _count;
    private Image _chip;
    private Label _chipText;
    private IconButton _settingsButton;
    private IconButton _styleButton;
    private IconButton _lockButton;
    private UIShowToolTip _styleTooltip;
    private UIShowToolTip _lockTooltip;
    private RectTransform _viewport;
    private RectTransform _content;
    private Label _empty;
    private Label _footer;

    private float _contentHeight;
    private float _viewportHeight;
    private float _scroll;
    private bool _compact;
    private bool _exact;

    public BossListPanel(BossListSettings settings, Feature feature)
    {
        _settings = settings;
        _feature = feature;
    }

    private PanelHost Host => _settings.Panel;
    public bool Exists => Host.Exists;

    public void Create()
    {
        if (Host.Exists) return;
        Host.Create();
        var root = Host.Rect;

        _background = HudFactory.Box("background", root, Theme.Panel);
        HudFactory.Stretch(_background, Vector2.zero, Vector2.zero);
        HudFactory.Frame(_background.transform, PanelEdge, 1f);

        _viewport = HudFactory.Rect("viewport", root).GetComponent<RectTransform>();
        _viewport.gameObject.AddComponent<RectMask2D>();
        _content = HudFactory.Rect("content", _viewport).GetComponent<RectTransform>();
        _content.anchorMin = _content.anchorMax = new Vector2(0f, 1f);
        _content.pivot = new Vector2(0f, 1f);

        _empty = HudFactory.Label("empty", _content, 12.5f, Theme.Dim, Align.Center);
        _footer = HudFactory.Label("footer", root, 11.5f, Theme.Dim, Align.Left);
        _footer.Text.enableWordWrapping = true;
        _footer.Value = "~ marks an estimate. This server does not send respawn times.";

        BuildHeader(root);
        _dragHandles.Clear();
        _dragHandles.Add(_header);
    }

    public void Destroy()
    {
        Host.Destroy();
        _rows.Clear();
        _headers.Clear();
        _mores.Clear();
        _tiles.Clear();
        _dragHandles.Clear();
    }

    public void SetVisible(bool visible) => Host.SetVisible(visible);

    /// <summary>Rebuilds the rows from the tracker's latest states.</summary>
    public void Rebuild(Tracker tracker, Watchlist watchlist)
    {
        var player = Player.localPlayer;
        if (player == null) return;

        _settings.Fill(_filter);
        _compact = _settings.Style.Value == ListStyle.Compact;
        _exact = tracker.Exact;
        int playerLevel = player.level.current;
        int zone = player.idZone;
        Vector2 position = player.transform.position;
        bool direction = _settings.Direction.Value;

        _entries.Clear();
        _monsters.Clear();
        foreach (var monster in tracker.Monsters)
        {
            bool here = monster.Zone == zone;
            _entries.Add(new ListEntry
            {
                Key = monster.Key,
                Zone = monster.Zone,
                Tier = monster.Tier,
                Level = monster.Level,
                State = monster.State,
                Watched = watchlist.Contains(monster.Key),
                Discovered = MonsterTooltip.Discovered(monster.Key),
                Distance = here ? Vector2.Distance(position, monster.Where) : float.NaN,
            });
            _monsters.Add(monster);
        }

        ListModel.Build(_entries, _filter, playerLevel, zone, _groups);

        float width = Host.Width;
        int up = 0;
        int rowCount = 0;
        int headerCount = 0;
        int moreCount = 0;
        float y = 0f;
        int columns = Mathf.Max(1, Mathf.FloorToInt((width - 2f * TilePad + TileGap) / (TileView.Size + TileGap)));

        foreach (var group in _groups)
        {
            if (!_compact)
            {
                var header = Pooled(_headers, headerCount++, () => new GroupHeaderView(_content));
                header.Set(GameText.ZoneName("", group.Zone), ListModel.CountText(group, _filter.Zones), !group.Current, width);
                HudFactory.TopLeft(header.Rect, 0f, y, width, GroupHeaderView.Height);
                y += GroupHeaderView.Height;
            }

            bool first = true;
            foreach (int index in group.Rows)
            {
                var data = Data(index, tracker.Now, playerLevel, position, zone, direction);
                bool watched = _entries[index].Watched;
                string tooltip = MonsterTooltip.Build(data.Monster, tracker.Now, !data.Silhouette, watched,
                    data.ShowDistance ? data.Offset.magnitude : null, data.Offset);
                if (data.Monster.State.IsUp) up++;

                if (_compact)
                {
                    var tile = Pooled(_tiles, rowCount, () => new TileView(_content));
                    tile.Set(data, watched);
                    tile.SetTooltip(tooltip);
                    HudFactory.TopLeft(tile.Rect, TilePad + rowCount % columns * (TileView.Size + TileGap),
                        TilePad + rowCount / columns * (TileView.Size + TileGap), TileView.Size, TileView.Size);
                }
                else
                {
                    var row = Pooled(_rows, rowCount, () => new RowView(_content));
                    row.Set(data, width, first, watched);
                    row.SetTooltip(tooltip);
                    HudFactory.TopLeft(row.Rect, 0f, y, width, RowView.Height);
                    y += RowView.Height;
                }

                rowCount++;
                first = false;
            }

            if (!_compact && group.Hidden > 0)
            {
                var more = Pooled(_mores, moreCount++, () => new MoreLineView(_content));
                more.Set(group.HiddenText, width);
                HudFactory.TopLeft(more.Rect, 0f, y, width, MoreLineView.Height);
                y += MoreLineView.Height;
            }
        }

        Hide(_headers, headerCount, header => header.SetActive(false));
        Hide(_mores, moreCount, more => more.SetActive(false));
        Hide(_rows, _compact ? 0 : rowCount, row => row.SetActive(false));
        Hide(_tiles, _compact ? rowCount : 0, tile => tile.SetActive(false));

        float panelWidth = width;
        if (_compact && rowCount > 0)
        {
            int lines = (rowCount + columns - 1) / columns;
            int used = Mathf.Min(columns, rowCount);
            y = 2f * TilePad + lines * TileView.Size + (lines - 1) * TileGap;
            panelWidth = Mathf.Max(CompactMinWidth, 2f * TilePad + used * TileView.Size + (used - 1) * TileGap);
        }
        else if (_compact)
        {
            panelWidth = CompactMinWidth;
        }

        _empty.SetActive(rowCount == 0 && _groups.Count == 0);
        if (rowCount == 0 && _groups.Count == 0)
        {
            _empty.Value = _compact ? "None here" : "No bosses, elites or fabled monsters here.";
            HudFactory.TopLeft(_empty.Rect, 8f, 0f, panelWidth - 16f, EmptyHeight);
            y = EmptyHeight;
        }

        _contentHeight = y;
        _count.Value = up > 0 ? up + " up" : "";
        Layout(panelWidth);
    }

    /// <summary>Runs every frame: hover looks, buttons, rows, scrolling, then placement.</summary>
    public void UpdateInput(Watchlist watchlist, out bool changed)
    {
        changed = false;
        if (!Host.Exists) return;

        bool overPanel = Pointer.Over(Host.Rect) || Pointer.Over(_header);
        if (_compact) SetHeaderShown(overPanel || Host.Moving);
        UpdateLockLook();

        if (_header.gameObject.activeSelf)
        {
            if (_settingsButton.Update()) SettingsWindow.Current?.Open(_feature);
            if (_styleButton.Update())
            {
                _settings.Style.Value = _compact ? ListStyle.List : ListStyle.Compact;
                changed = true;
            }

            if (_lockButton.Update())
            {
                // Under Lock all the panel's own lock cannot unlock it, so the click leads to the switch that can.
                if (PanelHost.LockAll()) SettingsWindow.Current?.OpenLayout();
                else Host.Locked = !Host.Locked;
            }
        }

        bool inView = Pointer.Over(_viewport);
        TrackedMonster clicked = null;
        if (_compact)
        {
            foreach (var tile in _tiles)
                if (tile.Monster != null && tile.UpdateHover() && inView && Pointer.Clicked(tile.Rect))
                    clicked = tile.Monster;
        }
        else
        {
            foreach (var row in _rows)
                if (row.Monster != null && row.UpdateHover() && inView && Pointer.Clicked(row.Rect))
                    clicked = row.Monster;
        }

        if (clicked != null)
        {
            if (Pointer.Shift) BestiaryPages.BestiaryPageOpener.Open(clicked.Definition);
            else
            {
                watchlist.Toggle(clicked.Key);
                changed = true;
            }
        }

        if (inView && Pointer.Scroll != 0f && _contentHeight > _viewportHeight)
        {
            _scroll = Mathf.Clamp(_scroll - Pointer.Scroll * ScrollStep, 0f, _contentHeight - _viewportHeight);
            _content.anchoredPosition = new Vector2(0f, _scroll);
        }

        Host.Update(_dragHandles);
    }

    private void BuildHeader(RectTransform root)
    {
        var bar = HudFactory.Box("header", root, Theme.Header);
        _header = bar.rectTransform;
        _header.anchorMin = _header.anchorMax = new Vector2(0f, 1f);
        _header.pivot = new Vector2(0f, 1f);
        bar.raycastTarget = true;

        var accent = HudFactory.Tinted("accent", _header, Shapes.Fade, Theme.Gold);
        accent.type = Image.Type.Simple;
        accent.preserveAspect = false;
        HudFactory.Place(accent, new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(0f, -AccentHeight), Vector2.zero);
        var line = HudFactory.Box("line", _header, Theme.Line);
        HudFactory.Place(line, new Vector2(0f, 0f), new Vector2(1f, 0f), Vector2.zero, new Vector2(0f, 1f));

        _title = HudFactory.Label("title", _header, 14f, Theme.Gold, Align.Left, bold: true);
        _title.Value = "Bosses";
        _count = HudFactory.Label("count", _header, 12f, Theme.Muted, Align.Left);

        _chip = HudFactory.Sliced("chip", _header, Shapes.Rounded, Theme.ReadyBg, cornerScale: 1.4f);
        var chipIcon = HudFactory.Tinted("icon", _chip.rectTransform, Icons.Sliders, Theme.Ready);
        HudFactory.TopLeft(chipIcon, 7f, 4f, 12f, 12f);
        _chipText = HudFactory.Label("text", _chip.rectTransform, 11.5f, Theme.Ready, Align.Left);

        _lockButton = ControlButton(Icons.LockOpen, 0, out _lockTooltip);
        _styleButton = ControlButton(Icons.LayoutGrid, 1, out _styleTooltip);
        _settingsButton = ControlButton(Icons.Sliders, 2, out var settingsTooltip);
        settingsTooltip.text = "<b>Settings</b>\n" + ModText.Name + "'s settings, on the Boss list page.";
    }

    private IconButton ControlButton(Sprite icon, int slot, out UIShowToolTip tooltip)
    {
        var button = new IconButton(_header, icon, ControlSize, ControlIconSize);
        var rect = button.Rect;
        rect.anchorMin = rect.anchorMax = new Vector2(1f, 0.5f);
        rect.pivot = new Vector2(1f, 0.5f);
        rect.anchoredPosition = new Vector2(-8f - slot * (ControlSize + 4f), -AccentHeight / 2f);
        tooltip = rect.gameObject.AddComponent<UIShowToolTip>();
        return button;
    }

    private void Layout(float width)
    {
        // The header: title, count and level filter chip, with the controls on the right.
        _header.sizeDelta = new Vector2(width, HeaderHeight);
        _header.anchoredPosition = new Vector2(0f, _compact ? HeaderHeight : 0f);
        float x = 10f;
        float barMiddle = AccentHeight;
        HudFactory.TopLeft(_title.Rect, x, barMiddle, 70f, BarHeight);
        x += Mathf.Ceil(_title.PreferredWidth) + 8f;
        HudFactory.TopLeft(_count.Rect, x, barMiddle, 50f, BarHeight);
        x += _count.PreferredWidth > 0f ? Mathf.Ceil(_count.PreferredWidth) + 8f : 0f;

        string chip = ChipText();
        float controlsLeft = width - 8f - 3f * (ControlSize + 4f);
        _chip.gameObject.SetActive(chip != null);
        if (chip != null)
        {
            _chipText.Value = chip;
            float chipWidth = 24f + Mathf.Ceil(_chipText.PreferredWidth) + 8f;
            // A cut chip reads worse than none, so a narrow compact header leaves it out.
            _chip.gameObject.SetActive(chipWidth <= controlsLeft - 6f - x);
            HudFactory.TopLeft(_chip, x, barMiddle + 5f, chipWidth, 20f);
            HudFactory.TopLeft(_chipText.Rect, 23f, 0f, chipWidth - 29f, 20f);
        }

        _styleButton.Icon = _compact ? Icons.LayoutList : Icons.LayoutGrid;
        _styleTooltip.text = _compact ? "<b>List</b>\nRows with names, levels and distances." : "<b>Compact</b>\nPortraits with times.";

        // Below the header, or alone in the compact style, the rows scroll inside the panel's
        // maximum height. The client's note closes the list.
        float top = _compact ? 0f : HeaderHeight;
        bool footer = !_exact && !_compact;
        _footer.SetActive(footer);
        float footerHeight = 0f;
        if (footer)
        {
            _footer.Rect.sizeDelta = new Vector2(width - 20f, 0f);
            footerHeight = Mathf.Ceil(_footer.Text.GetPreferredValues(_footer.Text.text, width - 20f, 0f).y) + 14f;
        }

        float available = Mathf.Max(TileView.Size, Host.MaxHeight - top - footerHeight);
        _viewportHeight = Mathf.Min(_contentHeight, available);
        _scroll = Mathf.Clamp(_scroll, 0f, Mathf.Max(0f, _contentHeight - _viewportHeight));

        HudFactory.TopLeft(_viewport, 0f, top, width, _viewportHeight);
        _content.sizeDelta = new Vector2(width, _contentHeight);
        _content.anchoredPosition = new Vector2(0f, _scroll);
        if (footer) HudFactory.TopLeft(_footer.Rect, 10f, top + _viewportHeight + 7f, width - 20f, footerHeight - 14f);

        Host.SetFittedSize(width, top + _viewportHeight + footerHeight);
        if (!_compact) SetHeaderShown(true);
    }

    private string ChipText() => _filter.Levels switch
    {
        LevelFilter.NotTrivial => "Not trivial",
        LevelFilter.NearMine => "Near my level",
        LevelFilter.Custom => $"Levels {_filter.From} to {_filter.To}",
        _ => null,
    };

    private void SetHeaderShown(bool shown)
    {
        if (_header.gameObject.activeSelf != shown) _header.gameObject.SetActive(shown);
    }

    private void UpdateLockLook()
    {
        bool locked = Host.EffectivelyLocked;
        _lockButton.Icon = locked ? Icons.Lock : Icons.LockOpen;
        _lockButton.Active = locked;
        _lockTooltip.text = PanelHost.LockAll()
            ? "<b>Panels locked</b>\nEvery panel is locked. Click to open the Layout settings."
            : locked
                ? "<b>Unlock panel</b>\nAllow dragging from the header and resizing from the corner."
                : "<b>Lock panel</b>\nPrevent dragging and resizing.";
    }

    private RowData Data(int index, double now, int playerLevel, Vector2 position, int zone, bool direction)
    {
        var monster = _monsters[index];
        var entry = _entries[index];
        return new RowData
        {
            Monster = monster,
            Entry = entry,
            Silhouette = !entry.Discovered && _filter.Undiscovered == UndiscoveredFilter.Silhouette,
            ShowDistance = direction && monster.Zone == zone,
            Offset = monster.Where - position,
            Now = now,
            PlayerLevel = playerLevel,
        };
    }

    private static T Pooled<T>(List<T> pool, int index, System.Func<T> create)
    {
        if (index >= pool.Count) pool.Add(create());
        var view = pool[index];
        switch (view)
        {
            case RowView row: row.SetActive(true); break;
            case TileView tile: tile.SetActive(true); break;
            case GroupHeaderView header: header.SetActive(true); break;
            case MoreLineView more: more.SetActive(true); break;
        }

        return view;
    }

    private static void Hide<T>(List<T> pool, int used, System.Action<T> hide)
    {
        for (int index = used; index < pool.Count; index++) hide(pool[index]);
    }
}
