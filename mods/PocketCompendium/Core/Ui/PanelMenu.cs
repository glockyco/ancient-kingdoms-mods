using System;
using System.Collections.Generic;
using Il2Cpp;
using MelonLoader;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Core.Ui;

/// <summary>One panel the menu shows and hides: its name, icon and stored shown state.</summary>
public sealed class PanelToggle
{
    public PanelToggle(string title, Func<Sprite> icon, Func<bool> available, MelonPreferences_Entry<bool> shown, Action save)
    {
        Title = title;
        Icon = icon;
        Available = available;
        Shown = shown;
        Save = save;
    }

    public string Title { get; }
    public Func<Sprite> Icon { get; }

    /// <summary>Whether the panel's feature runs, so the menu lists it.</summary>
    public Func<bool> Available { get; }

    public MelonPreferences_Entry<bool> Shown { get; }
    public Action Save { get; }
}

/// <summary>
/// A round button on the minimap's free lower left that opens a menu with a switch for each of the
/// mod's panels. The button is a copy of the minimap's help button, so it has the game's frame and
/// press look. It shows while at least one panel's feature runs.
/// </summary>
public static class PanelMenu
{
    private const float MenuWidth = 168f;
    private const float RowHeight = 32f;
    private const float Pad = 6f;

    private static readonly List<PanelToggle> Toggles = new();
    private static readonly List<PanelToggle> Listed = new();
    private static readonly List<MenuRow> Rows = new();

    private static GameObject _button;
    private static RectTransform _buttonRect;
    private static Image _icon;
    private static HoverText _tooltip;
    private static RectTransform _menu;
    private static bool _open;

    public static void Register(PanelToggle toggle) => Toggles.Add(toggle);

    /// <summary>Runs every frame after the settings window and before the features.</summary>
    public static void Update(bool inWorld)
    {
        Listed.Clear();
        // The local map covers the minimap and its button while open.
        var map = UIMap.singleton;
        bool mapShown = map != null && map.panel != null && map.panel.activeSelf;
        if (inWorld && !mapShown)
            foreach (var toggle in Toggles)
                if (toggle.Available())
                    Listed.Add(toggle);

        if (Listed.Count == 0 || !EnsureButton())
        {
            Hide();
            return;
        }

        if (!_button.activeSelf) _button.SetActive(true);
        _icon.color = _open ? Theme.Golden : Color.white;
        _tooltip.Text = "<b>Pocket Compendium</b>\nShow or hide its panels.";

        if (Pointer.Clicked(_buttonRect))
        {
            _open = !_open;
            if (_open) BuildMenu();
        }
        else if (_open)
        {
            HandleMenu();
        }

        if (_menu != null && _menu.gameObject.activeSelf != _open) _menu.gameObject.SetActive(_open);
    }

    /// <summary>Forgets the button after the game destroyed the minimap it sits in.</summary>
    public static void OnSceneUnloaded(string sceneName)
    {
        if (sceneName != "World") return;
        _button = null;
        _buttonRect = null;
        _icon = null;
        _tooltip = null;
        Close();
    }

    public static void Destroy()
    {
        if (_button != null) UnityEngine.Object.Destroy(_button);
        if (_menu != null) UnityEngine.Object.Destroy(_menu.gameObject);
        _button = null;
        _menu = null;
        Rows.Clear();
        _open = false;
    }

    private static void Hide()
    {
        if (_button != null && _button.activeSelf) _button.SetActive(false);
        Close();
    }

    private static void Close()
    {
        _open = false;
        if (_menu != null && _menu.gameObject.activeSelf) _menu.gameObject.SetActive(false);
    }

    private static bool EnsureButton()
    {
        if (_button != null) return true;
        var map = UIMap.singleton;
        if (map == null || map.panelMinimap == null) return false;
        var minimap = map.panelMinimap.transform;
        var help = minimap.Find("Help");
        var players = minimap.Find("IconPlayersOnline");
        var circle = minimap.Find("Minimap Circle");
        if (help == null || players == null || circle == null) return false;

        _button = UnityEngine.Object.Instantiate(help.gameObject, help.parent);
        _button.name = "PC_PanelButton";
        // The copy would open the game's help, so it gets a click event of its own, which stays empty.
        var button = _button.GetComponent<Button>();
        if (button != null) button.onClick = new Button.ButtonClickedEvent();
        // The copy would also show the game's "Help" tooltip over the mod's own.
        var gameTooltip = _button.GetComponent<UIShowToolTip>();
        if (gameTooltip != null) UnityEngine.Object.DestroyImmediate(gameTooltip);
        _buttonRect = _button.GetComponent<RectTransform>();
        // Mirrored from the players-online button across the minimap's middle.
        var position = players.position;
        _buttonRect.position = new Vector3(2f * circle.position.x - position.x, position.y, position.z);

        var iconTransform = _button.transform.Find("HelpIcon");
        _icon = iconTransform != null ? iconTransform.GetComponent<Image>() : null;
        if (_icon == null)
        {
            UnityEngine.Object.Destroy(_button);
            _button = null;
            return false;
        }

        _icon.sprite = Icons.BookOpen;
        _icon.rectTransform.sizeDelta = new Vector2(24f, 24f);
        _tooltip = new HoverText(_buttonRect) { Look = TooltipLook.Game };
        return true;
    }

    // The menu sits left of the button, its bottom level with the button's, and lists the panels
    // whose features run when it opens.
    private static void BuildMenu()
    {
        if (_menu == null)
        {
            _menu = HudFactory.Rect("PC_PanelMenu", Overlay.Windows).GetComponent<RectTransform>();
            _menu.anchorMin = _menu.anchorMax = new Vector2(0f, 1f);
            _menu.pivot = new Vector2(0f, 1f);
            var background = HudFactory.Box("background", _menu, new Color(Theme.Panel.r, Theme.Panel.g, Theme.Panel.b, 1f));
            background.raycastTarget = true;
            HudFactory.Stretch(background, Vector2.zero, Vector2.zero);
            HudFactory.Frame(background.transform, new Color(1f, 1f, 1f, 0.07f), 1f);
        }

        for (int index = 0; index < Listed.Count; index++)
        {
            if (index == Rows.Count) Rows.Add(new MenuRow(_menu));
            Rows[index].Place(Pad + index * RowHeight);
            Rows[index].SetActive(true);
        }
        for (int index = Listed.Count; index < Rows.Count; index++) Rows[index].SetActive(false);

        float height = 2f * Pad + Listed.Count * RowHeight;
        _menu.sizeDelta = new Vector2(MenuWidth, height);
        float scale = Overlay.PanelScale;
        float half = _buttonRect.rect.width * 0.5f * _buttonRect.lossyScale.x;
        float left = _buttonRect.position.x - half - 8f - MenuWidth * scale;
        float bottom = _buttonRect.position.y - half;
        _menu.anchoredPosition = new Vector2(left / scale, -(Screen.height - bottom - height * scale) / scale);
    }

    private static void HandleMenu()
    {
        if (Listed.Count != ActiveRows())
        {
            BuildMenu();
        }

        for (int index = 0; index < Listed.Count; index++)
        {
            var toggle = Listed[index];
            var row = Rows[index];
            row.Set(toggle.Icon(), toggle.Title, toggle.Shown.Value);
            if (!row.Clicked()) continue;
            toggle.Shown.Value = !toggle.Shown.Value;
            toggle.Save();
        }

        // A press anywhere else closes the menu and still reaches what it was meant for.
        if (Pointer.Pressed && !RectTransformUtility.RectangleContainsScreenPoint(_menu, Pointer.Position, null))
            Close();
    }

    private static int ActiveRows()
    {
        int count = 0;
        foreach (var row in Rows)
            if (row.Active)
                count++;
        return count;
    }

    /// <summary>One panel's row: its icon, name and switch. The whole row takes the click.</summary>
    private sealed class MenuRow
    {
        private readonly Image _background;
        private readonly Image _icon;
        private readonly Label _label;
        private readonly SwitchView _switch;

        public MenuRow(Transform parent)
        {
            _background = HudFactory.Box("row", parent, Color.clear);
            _background.raycastTarget = true;
            Rect = _background.rectTransform;
            _icon = HudFactory.Tinted("icon", Rect, null, Theme.Control);
            HudFactory.TopLeft(_icon, 12f, (RowHeight - 16f) / 2f, 16f, 16f);
            _label = HudFactory.Label("label", Rect, 13f, Theme.Muted, Align.Left);
            HudFactory.TopLeft(_label.Rect, 36f, 0f, 90f, RowHeight);
            _switch = new SwitchView(Rect);
            HudFactory.TopLeft(_switch.Rect, MenuWidth - 12f - SwitchView.Width, (RowHeight - SwitchView.Height) / 2f, SwitchView.Width, SwitchView.Height);
        }

        public RectTransform Rect { get; }
        public bool Active => Rect.gameObject.activeSelf;

        public void Place(float y) => HudFactory.TopLeft(Rect, 0f, y, MenuWidth, RowHeight);

        public void SetActive(bool active)
        {
            if (Rect.gameObject.activeSelf != active) Rect.gameObject.SetActive(active);
        }

        public void Set(Sprite icon, string title, bool on)
        {
            if (_icon.sprite != icon) _icon.sprite = icon;
            _icon.enabled = icon != null;
            _icon.color = on ? Theme.Ready : Theme.Control;
            _label.Value = title;
            _label.Color = on ? Theme.Text : Theme.Muted;
            _switch.Set(on);
        }

        public bool Clicked()
        {
            bool hovered = Pointer.Over(Rect);
            _background.color = hovered ? Theme.Hover : Color.clear;
            return hovered && Pointer.Clicked(Rect);
        }
    }
}
