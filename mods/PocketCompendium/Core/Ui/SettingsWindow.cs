using System.Collections.Generic;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Settings;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Core.Ui;

/// <summary>
/// Pocket Compendium's settings window. The sidebar lists a few groups. A group shows settings
/// that apply across features, or its features one after another, each as a row with its switch,
/// its one sentence and its small settings below it. A feature with more settings than fit there
/// has a page of its own, reached from the gear on its row and from its panel's settings button.
/// Groups such as About draw their own content.
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
    // Fits "Undiscovered monsters", the longest switch name.
    private const float LabelWidth = 165f;
    private const float ControlHeight = 26f;
    private const float HelpGap = 5f;
    private const float GearSize = 26f;

    // Opaque, because the game blends its interface in linear colour space, where even a 2%
    // translucent dark background lets a bright world show through clearly.
    private static readonly Color WindowBackground = new(0.047f, 0.059f, 0.082f, 1f);
    private static readonly Color NavBackground = new(1f, 1f, 1f, 0.018f);
    private static readonly Color NavSelected = new(0.906f, 0.698f, 0.290f, 0.06f);
    private static readonly Color NavHover = new(1f, 1f, 1f, 0.04f);

    private readonly IReadOnlyList<SettingsGroup> _groups;
    private readonly LayoutSettings _layout;
    private readonly List<NavItem> _nav = new();
    private readonly List<FeatureRow> _featureRows = new();
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
    private IconButton _close;
    private ButtonView _reset;
    private ButtonView _done;
    private RectTransform _back;
    private Label _backLabel;
    private int _selected;
    private Feature _open;
    private float _contentHeight;
    private float _scroll;
    private bool _dragging;
    private Vector2 _grab;

    public SettingsWindow(IReadOnlyList<SettingsGroup> groups, LayoutSettings layout)
    {
        _groups = groups;
        _layout = layout;
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

    /// <summary>Opens the window where <paramref name="feature"/>'s settings are: its own page, or its group.</summary>
    public void Open(Feature feature)
    {
        Open();
        for (int index = 0; index < _groups.Count; index++)
        {
            if (!Contains(_groups[index].Features, feature)) continue;
            Show(index, feature.OwnPage ? feature : null);
            return;
        }
    }

    /// <summary>Opens the window on the group that holds the panel settings.</summary>
    public void OpenLayout()
    {
        Open();
        for (int index = 0; index < _groups.Count; index++)
            if (Contains(_groups[index].Pages, _layout.Page))
                Show(index, null);
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

    private static bool Contains<T>(IReadOnlyList<T> list, T item) where T : class
    {
        foreach (var each in list)
            if (each == item)
                return true;
        return false;
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
        Show(_selected, _open);
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

        for (int index = 0; index < _groups.Count; index++)
            _nav.Add(new NavItem(nav.rectTransform, _groups[index], 10f + index * NavItemHeight));
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

    // Shows a group, or with a feature the feature's own page in that group.
    private void Show(int index, Feature open)
    {
        _selected = index;
        _open = open;
        if (_root == null) return;
        for (int item = 0; item < _nav.Count; item++)
            _nav[item].SetSelected(item == index);
        _reset.Rect.gameObject.SetActive(HasSettings(_groups[index], open));
        BuildRows();
    }

    // A page that draws itself, or a group of features, which keep their settings on their own
    // pages, shows nothing that resets.
    private static bool HasSettings(SettingsGroup group, Feature open) =>
        open != null ? open.Settings.Rows.Count > 0 : group.Content == null && group.Pages.Count > 0;

    private void ClearRows()
    {
        foreach (var group in _groups) group.Content?.Clear();
        _featureRows.Clear();
        _toggles.Clear();
        _choices.Clear();
        _actions.Clear();
        _chips.Clear();
        _ranges.Clear();
        _back = null;
        _backLabel = null;
        if (_content == null) return;
        for (int child = _content.childCount - 1; child >= 0; child--)
            Object.Destroy(_content.GetChild(child).gameObject);
    }

    private void BuildRows()
    {
        ClearRows();
        _scroll = 0f;
        float width = _content.sizeDelta.x - 2f * Pad;
        float y = _open != null ? OwnPage(_open, width) : GroupPage(_groups[_selected], width);
        _contentHeight = y + 16f;
        _content.sizeDelta = new Vector2(_content.sizeDelta.x, _contentHeight);
        _content.anchoredPosition = Vector2.zero;
    }

    private float GroupPage(SettingsGroup group, float width)
    {
        float y = 18f;
        var title = HudFactory.Label("pageTitle", _content, 17f, Theme.Text, Align.Left, bold: true);
        HudFactory.TopLeft(title.Rect, Pad, y, width, 24f);
        title.Value = group.Title;
        y += 26f;

        // A group that draws itself draws everything below its title.
        if (group.Content != null)
            return y + group.Content.Build(_content, Pad, y, width);

        y += 8f;
        // The shared pages read as one list, so a line separates the last row of one from the next.
        bool afterSetting = false;
        foreach (var page in group.Pages)
            y = Rows(page.Rows, _content, y, width, 0f, ref afterSetting);
        foreach (var feature in group.Features)
            y = FeatureBlock(feature, y, width);
        return y;
    }

    // A feature's row: its name, sentence and switch, and a gear to its own page if it has settings.
    private float FeatureBlock(Feature feature, float y, float width)
    {
        var divider = HudFactory.Box("divider", _content, Theme.Line);
        HudFactory.TopLeft(divider, Pad, y, width, 1f);
        y += 14f;

        float controls = SwitchView.Width + (feature.OwnPage ? GearSize + 8f : 0f) + 12f;
        var name = HudFactory.Label("feature", _content, 14.5f, Theme.Text, Align.Left, bold: true);
        HudFactory.TopLeft(name.Rect, Pad, y, width - controls, 22f);
        name.Value = feature.Title;

        var toggle = new SwitchView(_content);
        HudFactory.TopLeft(toggle.Rect, Pad + width - SwitchView.Width, y + (22f - SwitchView.Height) / 2f, SwitchView.Width, SwitchView.Height);

        IconButton gear = null;
        if (feature.OwnPage)
        {
            gear = new IconButton(_content, Icons.Sliders, GearSize, 15f);
            HudFactory.TopLeft(gear.Rect, Pad + width - SwitchView.Width - 8f - GearSize, y + (22f - GearSize) / 2f, GearSize, GearSize);
        }

        y += 24f;
        y += WrappedText("summary", feature.Summary, Pad, y, width - controls, 12.5f, Theme.Muted, out _) + 4f;
        float failedHeight = WrappedText("failed", "Stopped after an error. Please report it on the About page.", Pad, y, width, 12.5f, Theme.Cast, out var failed);
        y += feature.Failed ? failedHeight + 2f : 0f;
        failed.SetActive(feature.Failed);

        _featureRows.Add(new FeatureRow(feature, toggle, gear, failed, null));
        return y + 10f;
    }

    // A feature's own page: the way back to its group, then its name, sentence, switch and settings.
    private float OwnPage(Feature feature, float width)
    {
        float y = 14f;
        var back = HudFactory.Box("back", _content, Color.clear);
        back.raycastTarget = true;
        _back = HudFactory.TopLeft(back, Pad - 4f, y, 220f, 22f);
        var arrow = HudFactory.Tinted("arrow", _back, Icons.Arrow, Theme.Muted);
        HudFactory.TopLeft(arrow, 4f, 5f, 12f, 12f);
        // The arrow points up. A quarter turn about its middle points it back, to the left.
        arrow.rectTransform.pivot = new Vector2(0.5f, 0.5f);
        arrow.rectTransform.anchoredPosition = new Vector2(10f, -11f);
        arrow.rectTransform.localRotation = Quaternion.Euler(0f, 0f, 90f);
        _backLabel = HudFactory.Label("label", _back, 12.5f, Theme.Muted, Align.Left);
        HudFactory.TopLeft(_backLabel.Rect, 22f, 0f, 190f, 22f);
        _backLabel.Value = _groups[_selected].Title;
        y += 28f;

        var title = HudFactory.Label("pageTitle", _content, 17f, Theme.Text, Align.Left, bold: true);
        HudFactory.TopLeft(title.Rect, Pad, y, width - SwitchView.Width - 12f, 24f);
        title.Value = feature.Title;
        var toggle = new SwitchView(_content);
        HudFactory.TopLeft(toggle.Rect, Pad + width - SwitchView.Width, y + 3f, SwitchView.Width, SwitchView.Height);
        y += 26f;

        y += WrappedText("summary", feature.Summary, Pad, y, width - SwitchView.Width - 12f, 12.5f, Theme.Muted, out _) + 4f;
        // The note wraps, because one line runs out of the window.
        float failedHeight = WrappedText("failed", "Stopped after an error. Please report it on the About page.", Pad, y, width, 12.5f, Theme.Cast, out var failed);
        y += feature.Failed ? failedHeight + 2f : 0f;
        failed.SetActive(feature.Failed);

        y += 10f;
        var divider = HudFactory.Box("divider", _content, Theme.Line);
        HudFactory.TopLeft(divider, Pad, y, width, 1f);
        y += 8f;

        var rows = HudFactory.Rect("rows", _content);
        var rowsRect = HudFactory.TopLeft(rows.GetComponent<RectTransform>(), 0f, y, _content.sizeDelta.x, 0f);
        var rowsGroup = rows.AddComponent<CanvasGroup>();
        float height = Rows(feature.Settings.Rows, rowsRect, 0f, width, 0f);
        rowsRect.sizeDelta = new Vector2(_content.sizeDelta.x, height);

        _featureRows.Add(new FeatureRow(feature, toggle, null, failed, rowsGroup));
        return y + height;
    }

    // Builds the rows of settings in order and returns the y below them. Labels start
    // <paramref name="indent"/> to the right, and controls keep one column on every page.
    private float Rows(IReadOnlyList<SettingRow> rows, RectTransform parent, float rowY, float width, float indent)
    {
        bool afterSetting = false;
        return Rows(rows, parent, rowY, width, indent, ref afterSetting);
    }

    private float Rows(IReadOnlyList<SettingRow> rows, RectTransform parent, float rowY, float width, float indent, ref bool previousWasSetting)
    {
        foreach (var row in rows)
        {
            switch (row)
            {
                case SectionRow section:
                    rowY += previousWasSetting ? 14f : 6f;
                    var sectionLabel = HudFactory.Label("section", parent, 10.5f, Theme.GroupTitle, Align.Left);
                    sectionLabel.Text.characterSpacing = 14f;
                    HudFactory.TopLeft(sectionLabel.Rect, Pad + indent, rowY, width - indent, 16f);
                    sectionLabel.Value = section.Title.ToUpperInvariant();
                    rowY += 22f;
                    previousWasSetting = false;
                    break;
                case NoteRow note:
                    rowY += WrappedText("note", note.Text, Pad + LabelWidth, rowY + 2f, width - LabelWidth, 12f, Theme.Dim, out _, parent) + 10f;
                    previousWasSetting = false;
                    break;
                case ToggleSetting toggle:
                    rowY = AddSeparator(parent, rowY, width, indent, previousWasSetting);
                    RowLabel(parent, toggle.Label, rowY, indent);
                    var switchView = new SwitchView(parent);
                    HudFactory.TopLeft(switchView.Rect, Pad + LabelWidth, rowY + (ControlHeight - SwitchView.Height) / 2f, SwitchView.Width, SwitchView.Height);
                    _toggles.Add(new ToggleRow(toggle, switchView));
                    rowY += ControlHeight + HelpBelow(parent, toggle.Help, rowY + ControlHeight, width) + 8f;
                    previousWasSetting = true;
                    break;
                case IChoiceSetting choice:
                    rowY = AddSeparator(parent, rowY, width, indent, previousWasSetting);
                    RowLabel(parent, choice.Label, rowY, indent);
                    var labels = new string[choice.OptionCount];
                    for (int option = 0; option < labels.Length; option++) labels[option] = choice.OptionLabel(option);
                    var picker = new SegmentedView(parent, width - LabelWidth, labels);
                    HudFactory.TopLeft(picker.Rect, Pad + LabelWidth, rowY, width - LabelWidth, SegmentedView.Height);
                    _choices.Add(new ChoiceRow(choice, picker));
                    rowY += ControlHeight + HelpBelow(parent, choice.Help, rowY + ControlHeight, width) + 8f;
                    previousWasSetting = true;
                    break;
                case ActionRow action:
                    rowY = AddSeparator(parent, rowY, width, indent, previousWasSetting);
                    RowLabel(parent, action.Label, rowY, indent);
                    var button = new ButtonView(parent, action.Button, ButtonStyle.Secondary, 110f, ControlHeight);
                    HudFactory.TopLeft(button.Rect, Pad + LabelWidth, rowY, 110f, ControlHeight);
                    _actions.Add(new ActionRowView(action, button));
                    rowY += ControlHeight + HelpBelow(parent, action.Help, rowY + ControlHeight, width) + 8f;
                    previousWasSetting = true;
                    break;
                case ChipsSetting chips:
                    rowY = AddSeparator(parent, rowY, width, indent, previousWasSetting);
                    RowLabel(parent, chips.Label, rowY, indent);
                    float chipX = Pad + LabelWidth;
                    var views = new ChipView[chips.Chips.Count];
                    for (int index = 0; index < views.Length; index++)
                    {
                        views[index] = new ChipView(parent, chips.Chips[index].Label);
                        HudFactory.TopLeft(views[index].Rect, chipX, rowY + (ControlHeight - ChipView.Height) / 2f, views[index].Width, ChipView.Height);
                        chipX += views[index].Width + 6f;
                    }
                    _chips.Add(new ChipsRow(chips, views));
                    rowY += ControlHeight + HelpBelow(parent, chips.Help, rowY + ControlHeight, width) + 8f;
                    previousWasSetting = true;
                    break;
                case RangeSetting range:
                    rowY = AddSeparator(parent, rowY, width, indent, previousWasSetting);
                    RowLabel(parent, range.Label, rowY, indent);
                    var from = new StepperView(parent);
                    HudFactory.TopLeft(from.Rect, Pad + LabelWidth, rowY, StepperView.Width, StepperView.Height);
                    var to = HudFactory.Label("to", parent, 12.5f, Theme.Muted, Align.Center);
                    HudFactory.TopLeft(to.Rect, Pad + LabelWidth + StepperView.Width, rowY, 30f, ControlHeight);
                    to.Value = "to";
                    var upper = new StepperView(parent);
                    HudFactory.TopLeft(upper.Rect, Pad + LabelWidth + StepperView.Width + 30f, rowY, StepperView.Width, StepperView.Height);
                    _ranges.Add(new RangeRow(range, from, upper, to));
                    rowY += ControlHeight + HelpBelow(parent, range.Help, rowY + ControlHeight, width) + 8f;
                    previousWasSetting = true;
                    break;
            }
        }

        return rowY;
    }

    private static float AddSeparator(RectTransform parent, float y, float width, float indent, bool afterSetting)
    {
        if (!afterSetting) return y;
        var line = HudFactory.Box("rowLine", parent, Theme.RowLine);
        HudFactory.TopLeft(line, Pad + indent, y, width - indent, 1f);
        return y + 8f;
    }

    private static void RowLabel(RectTransform parent, string text, float y, float indent)
    {
        var label = HudFactory.Label("label", parent, 13.5f, Theme.Text, Align.Left);
        HudFactory.TopLeft(label.Rect, Pad + indent, y, LabelWidth - indent - 10f, ControlHeight);
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
        // No line of a summary, help or note ends with one word alone.
        text = PocketCompendium.Core.Text.Wrapping.KeepLastWordsTogether(text);
        label.Value = text;
        float height = label.Text.GetPreferredValues(text, width, 0f).y;
        HudFactory.TopLeft(label.Rect, x, y, width, height);
        return height;
    }

    private void Refresh()
    {
        var group = _groups[_selected];
        if (group.Content != null && group.Content.Stale) BuildRows();
        // A feature that fails while its row shows needs room for its notice, so the page is laid out again.
        else if (_featureRows.Exists(row => row.Feature.Failed != row.FailedLaidOut)) BuildRows();
        foreach (var row in _featureRows)
        {
            bool on = row.Feature.Switch.Value && !row.Feature.Failed;
            row.Switch.Set(on, enabled: !row.Feature.Failed);
            row.Failed.SetActive(row.Feature.Failed);
            if (row.Rows != null) row.Rows.alpha = on ? 1f : 0.5f;
        }

        if (_backLabel != null) _backLabel.Color = Pointer.Over(_back) ? Theme.Text : Theme.Muted;
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

        var group = _groups[_selected];
        if (group.Content == null && _reset.Update()) ResetShown(group);

        for (int index = 0; index < _nav.Count; index++)
        {
            if (!Pointer.Clicked(_nav[index].Rect)) continue;
            Show(index, null);
            return;
        }

        bool insideViewport = Pointer.Over(_viewport);
        if (insideViewport)
        {
            if (_back != null && Pointer.Clicked(_back))
            {
                Show(_selected, null);
                return;
            }

            foreach (var row in _featureRows)
            {
                if (!row.Feature.Failed && Pointer.Clicked(row.Switch.Rect))
                    row.Feature.Switch.Value = !row.Feature.Switch.Value;
                if (row.Gear != null && row.Gear.Update())
                {
                    Show(_selected, row.Feature);
                    return;
                }
            }

            group.Content?.HandleInput();

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

    // Returns what the page shows to its defaults: a feature's own page, or a group's shared
    // settings. Feature switches keep their state.
    private void ResetShown(SettingsGroup group)
    {
        if (_open != null)
        {
            _open.Settings.ResetShown();
            return;
        }

        foreach (var page in group.Pages) page.ResetShown();
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

    private sealed class NavItem
    {
        private readonly SettingsGroup _group;
        private readonly Image _background;
        private readonly Image _bar;
        private readonly Image _icon;
        private readonly Label _label;

        public NavItem(RectTransform parent, SettingsGroup group, float y)
        {
            _group = group;
            _background = HudFactory.Box("navItem", parent, Color.clear);
            _background.raycastTarget = true;
            Rect = HudFactory.TopLeft(_background, 0f, y, NavWidth, NavItemHeight);

            _bar = HudFactory.Box("bar", Rect, Theme.Ready);
            HudFactory.TopLeft(_bar, 0f, 0f, 2f, NavItemHeight);

            _icon = HudFactory.Tinted("icon", Rect, group.Icon, Theme.Control);
            HudFactory.TopLeft(_icon, 16f, (NavItemHeight - 16f) / 2f, 16f, 16f);

            _label = HudFactory.Label("label", Rect, 13.5f, Theme.Muted, Align.Left);
            HudFactory.TopLeft(_label.Rect, 42f, 0f, NavWidth - 50f, NavItemHeight);
            _label.Value = group.Title;
        }

        public RectTransform Rect { get; }

        public void SetSelected(bool selected) => Refresh(selected);

        public void Refresh(bool selected)
        {
            bool hovered = !selected && Pointer.Over(Rect);
            bool failed = false;
            foreach (var feature in _group.Features) failed |= feature.Failed;
            _background.color = selected ? NavSelected : hovered ? NavHover : Color.clear;
            _bar.enabled = selected;
            _icon.color = failed ? Theme.Cast : selected ? Theme.Ready : Theme.Control;
            _label.Color = failed ? Theme.Cast : selected ? Theme.Text : Theme.Muted;
        }
    }

    private sealed class FeatureRow
    {
        public FeatureRow(Feature feature, SwitchView toggle, IconButton gear, Label failed, CanvasGroup rows)
        {
            Feature = feature;
            Switch = toggle;
            Gear = gear;
            Failed = failed;
            FailedLaidOut = feature.Failed;
            Rows = rows;
        }

        public Feature Feature { get; }
        public SwitchView Switch { get; }
        public IconButton Gear { get; }
        public Label Failed { get; }

        /// <summary>Whether the page left room for the failure notice when it was laid out.</summary>
        public bool FailedLaidOut { get; }

        /// <summary>The settings under the feature's row, dimmed while it is off, or null.</summary>
        public CanvasGroup Rows { get; }
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
