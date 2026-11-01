using System.Collections.Generic;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Settings;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Core.Ui;

/// <summary>
/// Pocket Compendium's settings window: one page per feature, each starting with that feature's
/// switch, a Layout page, and pages that draw their own content, such as About. Feature and
/// Layout pages are built from the settings each declares.
/// </summary>
public sealed class SettingsWindow
{
    private const float WindowWidth = 780f;
    private const float WindowHeight = 560f;
    private const float BarHeight = 40f;
    private const float NavWidth = 184f;
    private const float NavItemHeight = 34f;
    private const float FooterHeight = 54f;
    private const float Pad = 20f;
    private const float LabelWidth = 150f;
    private const float ControlHeight = 26f;
    private const float HelpGap = 5f;

    // Opaque, because the game blends its interface in linear colour space, where even a 2%
    // translucent dark background lets a bright world show through clearly.
    private static readonly Color WindowBackground = new(0.047f, 0.059f, 0.082f, 1f);
    private static readonly Color NavBackground = new(1f, 1f, 1f, 0.018f);
    private static readonly Color NavSelected = new(0.906f, 0.698f, 0.290f, 0.06f);
    private static readonly Color NavHover = new(1f, 1f, 1f, 0.04f);

    private readonly IReadOnlyList<Feature> _features;
    private readonly LayoutSettings _layout;
    private readonly List<Page> _pages = new();
    private readonly List<NavItem> _nav = new();
    private readonly List<ToggleRow> _toggles = new();
    private readonly List<ChoiceRow> _choices = new();
    private readonly List<ActionRowView> _actions = new();
    private readonly List<ChipsRow> _chips = new();
    private readonly List<RangeRow> _ranges = new();

    private GameObject _root;
    private RectTransform _window;
    private RectTransform _bar;
    private RectTransform _viewport;
    private RectTransform _content;
    private CanvasGroup _rowsGroup;
    private IconButton _close;
    private ButtonView _reset;
    private ButtonView _done;
    private SwitchView _headerSwitch;
    private Label _failedNote;
    private int _selected;
    private float _contentHeight;
    private float _scroll;
    private bool _dragging;
    private Vector2 _grab;

    public SettingsWindow(IReadOnlyList<Feature> features, LayoutSettings layout, params ISettingsContent[] contentPages)
    {
        _features = features;
        _layout = layout;
        foreach (var feature in features)
            _pages.Add(new Page(feature.Title, feature.Icon, feature.Settings, feature, null));
        _pages.Add(new Page(layout.Page.Title, Icons.Move, layout.Page, null, null));
        foreach (var content in contentPages)
            _pages.Add(new Page(content.Title, content.Icon, null, null, content));
        Current = this;
    }

    /// <summary>The window, for panels whose settings button opens it.</summary>
    public static SettingsWindow Current { get; private set; }

    public bool IsOpen => _root != null && _root.activeSelf;

    public void Toggle()
    {
        if (IsOpen) Close();
        else Open();
    }

    public void Open()
    {
        Build();
        _root.SetActive(true);
    }

    /// <summary>Opens the window on <paramref name="feature"/>'s page.</summary>
    public void Open(Feature feature) => Open(feature.Settings);

    /// <summary>Opens the window on the Layout page.</summary>
    public void OpenLayout() => Open(_layout.Page);

    private void Open(SettingsPage settings)
    {
        Open();
        for (int index = 0; index < _pages.Count; index++)
            if (_pages[index].Settings == settings)
                Select(index);
    }

    public void Close()
    {
        if (_root != null) _root.SetActive(false);
        _dragging = false;
    }

    public void Update()
    {
        var key = _layout.SettingsKeyControl;
        if (key != null && key.wasPressedThisFrame && !Il2Cpp.UIUtils.AnyInputActive())
            Toggle();
        if (!IsOpen) return;

        Refresh();
        HandleInput();
    }

    public void Destroy()
    {
        if (_root != null) Object.Destroy(_root);
        _root = null;
        _nav.Clear();
        ClearRows();
    }

    private void Build()
    {
        if (_root != null) return;

        _root = HudFactory.Rect("PC_Settings", Overlay.Windows);
        _window = _root.GetComponent<RectTransform>();
        _window.anchorMin = new Vector2(0.5f, 0.5f);
        _window.anchorMax = new Vector2(0.5f, 0.5f);
        _window.pivot = new Vector2(0.5f, 0.5f);
        _window.sizeDelta = new Vector2(WindowWidth, WindowHeight);
        _window.anchoredPosition = Vector2.zero;

        var background = HudFactory.Sliced("background", _window, Shapes.Rounded, WindowBackground, cornerScale: 0.5f);
        HudFactory.Stretch(background, Vector2.zero, Vector2.zero);
        background.raycastTarget = true;
        var frame = HudFactory.Sliced("frame", _window, Shapes.RoundedOutline, new Color(1f, 1f, 1f, 0.10f), cornerScale: 0.5f);
        HudFactory.Stretch(frame, Vector2.zero, Vector2.zero);

        var accent = HudFactory.Tinted("accent", _window, Shapes.Fade, Theme.Gold);
        accent.type = Image.Type.Simple;
        accent.preserveAspect = false;
        HudFactory.TopLeft(accent, 3f, 0f, WindowWidth - 6f, 2f);

        BuildBar();
        BuildNav();
        BuildPane();
        BuildFooter();
        Select(_selected);
    }

    private void BuildBar()
    {
        var bar = HudFactory.Box("bar", _window, Theme.Header);
        _bar = HudFactory.TopLeft(bar, 0f, 2f, WindowWidth, BarHeight);
        var line = HudFactory.Box("barLine", _bar, Theme.Line);
        HudFactory.Place(line, new Vector2(0f, 0f), new Vector2(1f, 0f), Vector2.zero, new Vector2(0f, 1f));

        var title = HudFactory.Label("title", _bar, 15f, Theme.Gold, Align.Left, bold: true);
        HudFactory.TopLeft(title.Rect, 16f, 0f, 220f, BarHeight);
        title.Value = "Pocket Compendium";
        var subtitle = HudFactory.Label("subtitle", _bar, 13f, Theme.Muted, Align.Left);
        HudFactory.TopLeft(subtitle.Rect, 16f + title.PreferredWidth + 10f, 0f, 200f, BarHeight);
        subtitle.Value = "Settings";

        _close = new IconButton(_bar, Icons.X, 26f, 15f);
        HudFactory.TopLeft(_close.Rect, WindowWidth - 26f - 9f, (BarHeight - 26f) / 2f, 26f, 26f);
    }

    private void BuildNav()
    {
        var nav = HudFactory.Box("nav", _window, NavBackground);
        float top = BarHeight + 2f;
        HudFactory.TopLeft(nav, 0f, top, NavWidth, WindowHeight - top - FooterHeight);
        var navLine = HudFactory.Box("navLine", _window, Theme.Line);
        HudFactory.TopLeft(navLine, NavWidth, top, 1f, WindowHeight - top - FooterHeight);

        for (int index = 0; index < _pages.Count; index++)
            _nav.Add(new NavItem(nav.rectTransform, _pages[index], 10f + index * NavItemHeight));
    }

    private void BuildPane()
    {
        float top = BarHeight + 2f;
        var viewport = HudFactory.Rect("viewport", _window);
        _viewport = HudFactory.TopLeft(viewport.GetComponent<RectTransform>(), NavWidth + 1f, top, WindowWidth - NavWidth - 1f, WindowHeight - top - FooterHeight);
        viewport.AddComponent<RectMask2D>();

        var content = HudFactory.Rect("content", _viewport);
        _content = HudFactory.TopLeft(content.GetComponent<RectTransform>(), 0f, 0f, _viewport.sizeDelta.x, 0f);
    }

    private void BuildFooter()
    {
        var line = HudFactory.Box("footerLine", _window, Theme.Line);
        HudFactory.TopLeft(line, 0f, WindowHeight - FooterHeight, WindowWidth, 1f);

        _reset = new ButtonView(_window, "Reset this page", ButtonStyle.Link, 130f, 30f);
        HudFactory.TopLeft(_reset.Rect, 10f, WindowHeight - FooterHeight + 12f, 130f, 30f);

        _done = new ButtonView(_window, "Done", ButtonStyle.Primary, 96f, 32f);
        HudFactory.TopLeft(_done.Rect, WindowWidth - 96f - 16f, WindowHeight - FooterHeight + 11f, 96f, 32f);
    }

    private void Select(int index)
    {
        _selected = index;
        for (int item = 0; item < _nav.Count; item++)
            _nav[item].SetSelected(item == index);
        // Content pages hold no settings to reset.
        _reset.Rect.gameObject.SetActive(_pages[index].Settings != null);
        BuildRows(_pages[index]);
    }

    private void ClearRows()
    {
        foreach (var page in _pages) page.Content?.Clear();
        _toggles.Clear();
        _choices.Clear();
        _actions.Clear();
        _chips.Clear();
        _ranges.Clear();
        _headerSwitch = null;
        _failedNote = null;
        _rowsGroup = null;
        if (_content == null) return;
        for (int child = _content.childCount - 1; child >= 0; child--)
            Object.Destroy(_content.GetChild(child).gameObject);
    }

    private void BuildRows(Page page)
    {
        ClearRows();
        _scroll = 0f;
        float width = _content.sizeDelta.x - 2f * Pad;
        float y = 18f;

        var title = HudFactory.Label("pageTitle", _content, 17f, Theme.Text, Align.Left, bold: true);
        HudFactory.TopLeft(title.Rect, Pad, y, width - SwitchView.Width - 12f, 24f);
        title.Value = page.Title;
        y += 26f;

        if (page.Feature != null)
        {
            _headerSwitch = new SwitchView(_content);
            HudFactory.TopLeft(_headerSwitch.Rect, Pad + width - SwitchView.Width, 21f, SwitchView.Width, SwitchView.Height);

            y += WrappedText("summary", page.Feature.Summary, Pad, y, width - SwitchView.Width - 12f, 12.5f, Theme.Muted, out _) + 4f;

            // The note wraps, because one line runs out of the window.
            float failedHeight = WrappedText("failed", "Stopped after an error. Restart the game to use it again. Please report it on the About page.", Pad, y, width, 12.5f, Theme.Cast, out _failedNote);
            y += page.Feature.Failed ? failedHeight + 2f : 0f;
            _failedNote.SetActive(page.Feature.Failed);
        }

        // A content page draws everything below its title itself.
        if (page.Content != null)
        {
            _contentHeight = y + page.Content.Build(_content, Pad, y, width) + 16f;
            _content.sizeDelta = new Vector2(_content.sizeDelta.x, _contentHeight);
            _content.anchoredPosition = Vector2.zero;
            return;
        }

        y += 10f;
        var divider = HudFactory.Box("divider", _content, Theme.Line);
        HudFactory.TopLeft(divider, Pad, y, width, 1f);
        y += 8f;

        var rows = HudFactory.Rect("rows", _content);
        var rowsRect = HudFactory.TopLeft(rows.GetComponent<RectTransform>(), 0f, y, _content.sizeDelta.x, 0f);
        _rowsGroup = rows.AddComponent<CanvasGroup>();

        float rowY = 0f;
        bool previousWasSetting = false;
        foreach (var row in page.Settings.Rows)
        {
            switch (row)
            {
                case SectionRow section:
                    rowY += previousWasSetting ? 14f : 6f;
                    var sectionLabel = HudFactory.Label("section", rowsRect, 10.5f, Theme.GroupTitle, Align.Left);
                    sectionLabel.Text.characterSpacing = 14f;
                    HudFactory.TopLeft(sectionLabel.Rect, Pad, rowY, width, 16f);
                    sectionLabel.Value = section.Title.ToUpperInvariant();
                    rowY += 22f;
                    previousWasSetting = false;
                    break;
                case NoteRow note:
                    rowY += WrappedText("note", note.Text, Pad + LabelWidth, rowY + 2f, width - LabelWidth, 12f, Theme.Dim, out _, rowsRect) + 10f;
                    previousWasSetting = false;
                    break;
                case ToggleSetting toggle:
                    rowY = AddSeparator(rowsRect, rowY, width, previousWasSetting);
                    RowLabel(rowsRect, toggle.Label, rowY, width);
                    var switchView = new SwitchView(rowsRect);
                    HudFactory.TopLeft(switchView.Rect, Pad + LabelWidth, rowY + (ControlHeight - SwitchView.Height) / 2f, SwitchView.Width, SwitchView.Height);
                    _toggles.Add(new ToggleRow(toggle, switchView));
                    rowY += ControlHeight + HelpBelow(rowsRect, toggle.Help, rowY + ControlHeight, width) + 8f;
                    previousWasSetting = true;
                    break;
                case IChoiceSetting choice:
                    rowY = AddSeparator(rowsRect, rowY, width, previousWasSetting);
                    RowLabel(rowsRect, choice.Label, rowY, width);
                    var labels = new string[choice.OptionCount];
                    for (int option = 0; option < labels.Length; option++) labels[option] = choice.OptionLabel(option);
                    var picker = new SegmentedView(rowsRect, width - LabelWidth, labels);
                    HudFactory.TopLeft(picker.Rect, Pad + LabelWidth, rowY, width - LabelWidth, SegmentedView.Height);
                    _choices.Add(new ChoiceRow(choice, picker));
                    rowY += ControlHeight + HelpBelow(rowsRect, choice.Help, rowY + ControlHeight, width) + 8f;
                    previousWasSetting = true;
                    break;
                case ActionRow action:
                    rowY = AddSeparator(rowsRect, rowY, width, previousWasSetting);
                    RowLabel(rowsRect, action.Label, rowY, width);
                    var button = new ButtonView(rowsRect, action.Button, ButtonStyle.Secondary, 110f, ControlHeight);
                    HudFactory.TopLeft(button.Rect, Pad + LabelWidth, rowY, 110f, ControlHeight);
                    _actions.Add(new ActionRowView(action, button));
                    rowY += ControlHeight + HelpBelow(rowsRect, action.Help, rowY + ControlHeight, width) + 8f;
                    previousWasSetting = true;
                    break;
                case ChipsSetting chips:
                    rowY = AddSeparator(rowsRect, rowY, width, previousWasSetting);
                    RowLabel(rowsRect, chips.Label, rowY, width);
                    float chipX = Pad + LabelWidth;
                    var views = new ChipView[chips.Chips.Count];
                    for (int index = 0; index < views.Length; index++)
                    {
                        views[index] = new ChipView(rowsRect, chips.Chips[index].Label);
                        HudFactory.TopLeft(views[index].Rect, chipX, rowY + (ControlHeight - ChipView.Height) / 2f, views[index].Width, ChipView.Height);
                        chipX += views[index].Width + 6f;
                    }
                    _chips.Add(new ChipsRow(chips, views));
                    rowY += ControlHeight + HelpBelow(rowsRect, chips.Help, rowY + ControlHeight, width) + 8f;
                    previousWasSetting = true;
                    break;
                case RangeSetting range:
                    rowY = AddSeparator(rowsRect, rowY, width, previousWasSetting);
                    RowLabel(rowsRect, range.Label, rowY, width);
                    var from = new StepperView(rowsRect);
                    HudFactory.TopLeft(from.Rect, Pad + LabelWidth, rowY, StepperView.Width, StepperView.Height);
                    var to = HudFactory.Label("to", rowsRect, 12.5f, Theme.Muted, Align.Center);
                    HudFactory.TopLeft(to.Rect, Pad + LabelWidth + StepperView.Width, rowY, 30f, ControlHeight);
                    to.Value = "to";
                    var upper = new StepperView(rowsRect);
                    HudFactory.TopLeft(upper.Rect, Pad + LabelWidth + StepperView.Width + 30f, rowY, StepperView.Width, StepperView.Height);
                    _ranges.Add(new RangeRow(range, from, upper, to));
                    rowY += ControlHeight + HelpBelow(rowsRect, range.Help, rowY + ControlHeight, width) + 8f;
                    previousWasSetting = true;
                    break;
            }
        }

        rowsRect.sizeDelta = new Vector2(_content.sizeDelta.x, rowY);
        _contentHeight = y + rowY + 16f;
        _content.sizeDelta = new Vector2(_content.sizeDelta.x, _contentHeight);
        _content.anchoredPosition = Vector2.zero;
    }

    private float AddSeparator(RectTransform parent, float y, float width, bool afterSetting)
    {
        if (!afterSetting) return y;
        var line = HudFactory.Box("rowLine", parent, Theme.RowLine);
        HudFactory.TopLeft(line, Pad, y, width, 1f);
        return y + 8f;
    }

    private static void RowLabel(RectTransform parent, string text, float y, float width)
    {
        var label = HudFactory.Label("label", parent, 13.5f, Theme.Text, Align.Left);
        HudFactory.TopLeft(label.Rect, Pad, y, LabelWidth - 10f, ControlHeight);
        label.Value = text;
    }

    private float HelpBelow(RectTransform parent, string help, float y, float width)
    {
        if (string.IsNullOrEmpty(help)) return 0f;
        return HelpGap + WrappedText("help", help, Pad + LabelWidth, y + HelpGap, width - LabelWidth, 12f, Theme.Dim, out _, parent);
    }

    private float WrappedText(string name, string text, float x, float y, float width, float size, Color color, out Label label, RectTransform parent = null)
    {
        label = HudFactory.Label(name, parent ?? _content, size, color, Align.Left);
        label.Text.enableWordWrapping = true;
        label.Text.overflowMode = Il2CppTMPro.TextOverflowModes.Overflow;
        label.Text.alignment = Il2CppTMPro.TextAlignmentOptions.TopLeft;
        label.Value = text;
        float height = label.Text.GetPreferredValues(text, width, 0f).y;
        HudFactory.TopLeft(label.Rect, x, y, width, height);
        return height;
    }

    private void Refresh()
    {
        var page = _pages[_selected];
        if (page.Feature != null)
        {
            _headerSwitch?.Set(page.Feature.Switch.Value && !page.Feature.Failed, enabled: !page.Feature.Failed);
            _failedNote?.SetActive(page.Feature.Failed);
            if (_rowsGroup != null) _rowsGroup.alpha = page.Feature.Switch.Value && !page.Feature.Failed ? 1f : 0.5f;
        }

        foreach (var toggle in _toggles) toggle.View.Set(toggle.Setting.Value);
        foreach (var choice in _choices) choice.View.Set(choice.Setting.SelectedIndex);
        foreach (var chips in _chips)
            for (int index = 0; index < chips.Views.Length; index++)
                chips.Views[index].Set(chips.Setting.Chips[index].Setting.Value, chips.Setting.Chips[index].Dot());
        foreach (var range in _ranges)
        {
            bool enabled = range.Setting.Enabled();
            range.From.Set(range.Setting.From, enabled);
            range.To.Set(range.Setting.To, enabled);
            range.Joiner.Color = enabled ? Theme.Muted : Theme.Dim;
        }
        for (int index = 0; index < _nav.Count; index++)
            _nav[index].Refresh(index == _selected);
    }

    private void HandleInput()
    {
        if (_close.Update() || _done.Update())
        {
            Close();
            Pointer.Claim();
            return;
        }

        if (_pages[_selected].Settings != null && _reset.Update()) _pages[_selected].Settings.ResetShown();

        for (int index = 0; index < _nav.Count; index++)
        {
            if (!Pointer.Clicked(_nav[index].Rect)) continue;
            Select(index);
            return;
        }

        var feature = _pages[_selected].Feature;
        if (_headerSwitch != null && feature != null && !feature.Failed && Pointer.Clicked(_headerSwitch.Rect))
            feature.Switch.Value = !feature.Switch.Value;

        bool insideViewport = Pointer.Over(_viewport);
        if (insideViewport)
        {
            _pages[_selected].Content?.HandleInput();

            foreach (var toggle in _toggles)
                if (Pointer.Clicked(toggle.View.Rect))
                    toggle.Setting.Value = !toggle.Setting.Value;

            foreach (var choice in _choices)
            {
                if (!Pointer.Pressed) break;
                int option = choice.View.OptionAtPointer();
                if (option < 0) continue;
                Pointer.Claim();
                choice.Setting.SelectedIndex = option;
            }

            foreach (var action in _actions)
                if (action.Button.Update())
                    action.Row.Run();

            foreach (var chips in _chips)
                for (int index = 0; index < chips.Views.Length; index++)
                    if (Pointer.Clicked(chips.Views[index].Rect))
                        chips.Setting.Chips[index].Setting.Value = !chips.Setting.Chips[index].Setting.Value;

            foreach (var range in _ranges)
            {
                range.Setting.From += range.From.Update();
                range.Setting.To += range.To.Update();
            }

            Scroll();
        }

        DragWindow();

        // A press anywhere on the window stays on the window.
        if (Pointer.Pressed && Pointer.Over(_window)) Pointer.Claim();
    }

    private void Scroll()
    {
        float overflow = Mathf.Max(0f, _contentHeight - _viewport.sizeDelta.y);
        if (overflow <= 0f || Mathf.Approximately(Pointer.Scroll, 0f)) return;
        _scroll = Mathf.Clamp(_scroll - Pointer.Scroll * 40f, 0f, overflow);
        _content.anchoredPosition = new Vector2(0f, _scroll);
    }

    private void DragWindow()
    {
        if (!_dragging && Pointer.Pressed && Pointer.Over(_bar))
        {
            Pointer.Claim();
            _dragging = true;
            _grab = Pointer.Position;
        }

        if (!_dragging) return;
        if (!Pointer.Held)
        {
            _dragging = false;
            return;
        }

        _window.anchoredPosition += (Pointer.Position - _grab) / Overlay.PanelScale;
        _grab = Pointer.Position;
    }

    private sealed class Page
    {
        public Page(string title, Sprite icon, SettingsPage settings, Feature feature, ISettingsContent content)
        {
            Title = title;
            Icon = icon;
            Settings = settings;
            Feature = feature;
            Content = content;
        }

        public string Title { get; }
        public Sprite Icon { get; }
        public SettingsPage Settings { get; }
        public Feature Feature { get; }
        public ISettingsContent Content { get; }
    }

    private sealed class NavItem
    {
        private readonly Page _page;
        private readonly Image _background;
        private readonly Image _bar;
        private readonly Image _icon;
        private readonly Label _label;

        public NavItem(RectTransform parent, Page page, float y)
        {
            _page = page;
            _background = HudFactory.Box("navItem", parent, Color.clear);
            _background.raycastTarget = true;
            Rect = HudFactory.TopLeft(_background, 0f, y, NavWidth, NavItemHeight);

            _bar = HudFactory.Box("bar", Rect, Theme.Ready);
            HudFactory.TopLeft(_bar, 0f, 0f, 2f, NavItemHeight);

            _icon = HudFactory.Tinted("icon", Rect, page.Icon, Theme.Control);
            HudFactory.TopLeft(_icon, 16f, (NavItemHeight - 16f) / 2f, 16f, 16f);

            _label = HudFactory.Label("label", Rect, 13.5f, Theme.Muted, Align.Left);
            HudFactory.TopLeft(_label.Rect, 42f, 0f, NavWidth - 50f, NavItemHeight);
            _label.Value = page.Title;
        }

        public RectTransform Rect { get; }

        public void SetSelected(bool selected) => Refresh(selected);

        public void Refresh(bool selected)
        {
            bool hovered = !selected && Pointer.Over(Rect);
            bool failed = _page.Feature != null && _page.Feature.Failed;
            bool off = _page.Feature != null && !_page.Feature.Switch.Value;
            _background.color = selected ? NavSelected : hovered ? NavHover : Color.clear;
            _bar.enabled = selected;
            _icon.color = failed ? Theme.Cast : selected ? Theme.Ready : Theme.Control;
            _label.Color = failed ? Theme.Cast : selected ? Theme.Text : off ? Theme.Dim : Theme.Muted;
        }
    }

    private sealed class ToggleRow
    {
        public ToggleRow(ToggleSetting setting, SwitchView view)
        {
            Setting = setting;
            View = view;
        }

        public ToggleSetting Setting { get; }
        public SwitchView View { get; }
    }

    private sealed class ChoiceRow
    {
        public ChoiceRow(IChoiceSetting setting, SegmentedView view)
        {
            Setting = setting;
            View = view;
        }

        public IChoiceSetting Setting { get; }
        public SegmentedView View { get; }
    }

    private sealed class ActionRowView
    {
        public ActionRowView(ActionRow row, ButtonView button)
        {
            Row = row;
            Button = button;
        }

        public ActionRow Row { get; }
        public ButtonView Button { get; }
    }

    private sealed class ChipsRow
    {
        public ChipsRow(ChipsSetting setting, ChipView[] views)
        {
            Setting = setting;
            Views = views;
        }

        public ChipsSetting Setting { get; }
        public ChipView[] Views { get; }
    }

    private sealed class RangeRow
    {
        public RangeRow(RangeSetting setting, StepperView from, StepperView to, Label joiner)
        {
            Setting = setting;
            From = from;
            To = to;
            Joiner = joiner;
        }

        public RangeSetting Setting { get; }
        public StepperView From { get; }
        public StepperView To { get; }
        public Label Joiner { get; }
    }
}
