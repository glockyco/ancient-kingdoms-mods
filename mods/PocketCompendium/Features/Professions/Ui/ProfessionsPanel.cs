using System.Collections.Generic;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Text;
using PocketCompendium.Core.Ui;
using PocketCompendium.Features.Professions.Model;
using UnityEngine;

namespace PocketCompendium.Features.Professions.Ui;

/// <summary>
/// The Professions panel in the list or compact style. Its header holds the lock, the style
/// button, the settings button and the pin that shows only the watched professions. In the
/// compact style the header shows only while the pointer is over the panel, as the boss list's does.
/// </summary>
internal sealed class ProfessionsPanel
{
    private const float HeaderHeight = PanelChrome.HeaderHeight;
    private const float ControlSize = 22f;
    private const float ControlIconSize = 15f;
    private const float Pad = 6f;
    private const float Gap = 6f;
    private const float ColumnGap = 8f;
    private const float RowWidth = 182f;
    // Rows go into two columns, as on the game's tab, once one column would be long and two fit.
    private const int OneColumnMost = 6;
    // Room for the title and the four header buttons.
    private const float MinWidth = 224f;

    private readonly ProfessionsSettings _settings;
    private readonly Feature _feature;
    private readonly List<ProfessionRowView> _rows = new();
    private readonly List<ProfessionTileView> _tiles = new();
    private readonly List<RectTransform> _dragHandles = new();
    private readonly List<int> _shown = new();

    private PanelChrome _chrome;
    private RectTransform _header;
    private RectTransform _body;
    private IconButton _lockButton;
    private IconButton _styleButton;
    private IconButton _settingsButton;
    private IconButton _pinButton;
    private HoverText _lockTooltip;
    private HoverText _styleTooltip;
    private HoverText _pinTooltip;
    private bool _compact;

    public ProfessionsPanel(ProfessionsSettings settings, Feature feature)
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
        _chrome = new PanelChrome(root);
        _header = _chrome.Header;
        _chrome.Title.Value = "Professions";
        _body = HudFactory.Rect("body", root).GetComponent<RectTransform>();
        _lockButton = ControlButton(Icons.LockOpen, 0, out _lockTooltip);
        _styleButton = ControlButton(Icons.LayoutGrid, 1, out _styleTooltip);
        _settingsButton = ControlButton(Icons.Sliders, 2, out var settingsTooltip);
        _pinButton = ControlButton(Icons.Pin, 3, out _pinTooltip);
        settingsTooltip.Text = "<b>Settings</b>\n" + ModText.Name + "'s settings, on the Professions page.";
        // The header comes after the body, so it draws above the rows it overlaps in the compact style.
        _header.SetAsLastSibling();
        _dragHandles.Clear();
        _dragHandles.Add(_header);
        Host.ResizesHeight = false;
    }

    public void Destroy()
    {
        Host.Destroy();
        _rows.Clear();
        _tiles.Clear();
        _dragHandles.Clear();
    }

    public void SetVisible(bool visible) => Host.SetVisible(visible);

    /// <summary>Lays out the shown professions in the chosen style.</summary>
    public void Rebuild(ProfessionSource source)
    {
        _compact = _settings.Style.Value == ProfessionStyle.Compact;
        var all = source.All;
        ProfessionLevels.Select(all.Length, index => _settings.Watched(all[index].Key), _settings.WatchedOnly.Value, _shown);

        float width;
        float height;
        if (_compact)
        {
            int columns = Mathf.Max(1, Mathf.FloorToInt((Host.Width - 2f * Pad + Gap) / (ProfessionTileView.Size + Gap)));
            int used = Mathf.Max(1, Mathf.Min(columns, _shown.Count));
            int lines = (_shown.Count + columns - 1) / columns;
            width = Mathf.Max(MinWidth, 2f * Pad + used * ProfessionTileView.Size + (used - 1) * Gap);
            height = 2f * Pad + lines * ProfessionTileView.Size + (lines - 1) * Gap;
            for (int index = 0; index < _shown.Count; index++)
            {
                if (index == _tiles.Count) _tiles.Add(new ProfessionTileView(_body));
                var tile = _tiles[index];
                tile.SetActive(true);
                var profession = all[_shown[index]];
                tile.Set(profession, _settings.Watched(profession.Key));
                HudFactory.TopLeft(tile.Rect, Pad + index % columns * (ProfessionTileView.Size + Gap),
                    Pad + index / columns * (ProfessionTileView.Size + Gap), ProfessionTileView.Size, ProfessionTileView.Size);
            }
            Hide(_tiles, _shown.Count);
            Hide(_rows, 0);
        }
        else
        {
            // The grip sets the width, as for the tiles: two columns where they fit.
            bool twoFit = Host.Width >= 2f * Pad + 2f * RowWidth + ColumnGap;
            int columns = twoFit && _shown.Count > OneColumnMost ? 2 : 1;
            int lines = (_shown.Count + columns - 1) / columns;
            width = Mathf.Max(MinWidth, 2f * Pad + columns * RowWidth + (columns - 1) * ColumnGap);
            float rowWidth = columns == 1 ? width - 2f * Pad : RowWidth;
            height = 2f * Pad + lines * ProfessionRowView.Height;
            for (int index = 0; index < _shown.Count; index++)
            {
                if (index == _rows.Count) _rows.Add(new ProfessionRowView(_body));
                var row = _rows[index];
                row.SetActive(true);
                var profession = all[_shown[index]];
                row.Set(profession, _settings.Watched(profession.Key), rowWidth);
                HudFactory.TopLeft(row.Rect, Pad + index % columns * (RowWidth + ColumnGap),
                    Pad + index / columns * ProfessionRowView.Height, rowWidth, ProfessionRowView.Height);
            }
            Hide(_rows, _shown.Count);
            Hide(_tiles, 0);
        }

        // The compact header sits above the panel, so the tiles start at its top.
        float top = _compact ? 0f : HeaderHeight;
        _chrome.LayoutHeader(width, width - 4f * (ControlSize + 4f) - 16f);
        _header.anchoredPosition = new Vector2(0f, _compact ? HeaderHeight : 0f);
        HudFactory.TopLeft(_body, 0f, top, width, height);
        Host.SetFittedSize(width, top + height);
        if (!_compact) SetHeaderShown(true);
        UpdateLooks();
    }

    /// <summary>Runs every frame: header buttons, watching, then placement. Reports a change to rebuild for.</summary>
    public void UpdateInput(out bool changed)
    {
        changed = false;
        if (!Host.Exists) return;
        Host.UpdateGrip();

        bool overPanel = Pointer.Over(Host.Rect) || Pointer.Over(_header);
        if (_compact) SetHeaderShown(overPanel || Host.Moving);
        UpdateLooks();

        if (_header.gameObject.activeSelf)
        {
            if (_settingsButton.Update()) SettingsWindow.Current?.Open(_feature);
            if (_styleButton.Update())
            {
                _settings.Style.Value = _compact ? ProfessionStyle.List : ProfessionStyle.Compact;
                changed = true;
            }
            if (_pinButton.Update())
            {
                _settings.WatchedOnly.Value = !_settings.WatchedOnly.Value;
                changed = true;
            }
            if (_lockButton.Update())
            {
                // Under Lock all the panel's own lock cannot unlock it, so the click leads to the switch that can.
                if (PanelHost.LockAll()) SettingsWindow.Current?.OpenLayout();
                else Host.Locked = !Host.Locked;
            }
        }

        ProfessionSource.Profession clicked = null;
        foreach (var row in _rows)
            if (row.Profession != null && row.UpdateHover(overPanel) && Pointer.Clicked(row.Rect))
                clicked = row.Profession;
        foreach (var tile in _tiles)
            if (tile.Profession != null && tile.UpdateHover(overPanel) && Pointer.Clicked(tile.Rect))
                clicked = tile.Profession;
        if (clicked != null)
        {
            _settings.ToggleWatch(clicked.Key);
            changed = true;
        }

        Host.Update(_dragHandles);
    }

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

    private void UpdateLooks()
    {
        bool locked = Host.EffectivelyLocked;
        _lockButton.Icon = locked ? Icons.Lock : Icons.LockOpen;
        _lockButton.Active = locked;
        _lockTooltip.Text = PanelHost.LockAll()
            ? "<b>Panels locked</b>\nEvery panel is locked. Click to turn off Lock all panels in General."
            : locked
                ? "<b>Unlock panel</b>\nAllow dragging from the header and resizing from the corner."
                : "<b>Lock panel</b>\nPrevent dragging and resizing.";

        _styleButton.Icon = _compact ? Icons.LayoutList : Icons.LayoutGrid;
        _styleTooltip.Text = _compact ? "<b>List</b>\nRows with names and levels." : "<b>Compact</b>\nIcons with levels.";

        bool pinned = _settings.WatchedOnly.Value;
        _pinButton.Active = pinned;
        _pinTooltip.Text = pinned
            ? "<b>Show all</b>\nShow every profession."
            : "<b>Watched only</b>\nShow only the professions you watch. Click one to watch it.";
    }

    private void SetHeaderShown(bool shown)
    {
        if (_header.gameObject.activeSelf != shown) _header.gameObject.SetActive(shown);
    }

    private static void Hide(List<ProfessionRowView> views, int used)
    {
        for (int index = used; index < views.Count; index++) views[index].SetActive(false);
    }

    private static void Hide(List<ProfessionTileView> views, int used)
    {
        for (int index = used; index < views.Count; index++) views[index].SetActive(false);
    }
}
