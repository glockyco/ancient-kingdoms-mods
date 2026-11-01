using System;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Core.Ui;

/// <summary>An on and off switch: a rounded track with a sliding knob.</summary>
public sealed class SwitchView
{
    public const float Width = 34f;
    public const float Height = 18f;
    private const float KnobSize = 14f;

    private static readonly Color TrackOff = new(1f, 1f, 1f, 0.16f);
    private static readonly Color TrackOn = new(0.906f, 0.698f, 0.290f, 0.85f);
    private static readonly Color KnobOff = new(0.812f, 0.839f, 0.875f, 1f);

    private readonly Image _track;
    private readonly RectTransform _knob;
    private bool? _shownOn;
    private bool _shownEnabled = true;

    public SwitchView(Transform parent)
    {
        _track = HudFactory.Sliced("switch", parent, Shapes.Rounded, TrackOff, cornerScale: 1.3f);
        _track.raycastTarget = true;
        Rect = _track.rectTransform;
        Rect.sizeDelta = new Vector2(Width, Height);

        var knob = HudFactory.Tinted("knob", Rect, Shapes.Disc, KnobOff);
        _knob = knob.rectTransform;
        _knob.anchorMin = new Vector2(0f, 0.5f);
        _knob.anchorMax = new Vector2(0f, 0.5f);
        _knob.pivot = new Vector2(0f, 0.5f);
        _knob.sizeDelta = new Vector2(KnobSize, KnobSize);
    }

    public RectTransform Rect { get; }

    public void Set(bool on, bool enabled = true)
    {
        if (_shownOn == on && _shownEnabled == enabled) return;
        _shownOn = on;
        _shownEnabled = enabled;
        var track = on ? TrackOn : TrackOff;
        track.a *= enabled ? 1f : 0.5f;
        _track.color = track;
        _knob.GetComponent<Image>().color = on ? Color.white : KnobOff;
        _knob.anchoredPosition = new Vector2(on ? Width - KnobSize - 2f : 2f, 0f);
    }
}

/// <summary>
/// A row of equally wide options, one of them selected. Every option gets the same width, and the
/// picker fills the width it is given.
/// </summary>
public sealed class SegmentedView
{
    public const float Height = 26f;

    private static readonly Color Outline = new(1f, 1f, 1f, 0.13f);
    private static readonly Color Divider = new(1f, 1f, 1f, 0.09f);
    private static readonly Color Selected = new(0.906f, 0.698f, 0.290f, 0.18f);

    private readonly Label[] _labels;
    private readonly Image _selected;
    private readonly float _cellWidth;
    private int _shown = -1;

    public SegmentedView(Transform parent, float width, string[] options)
    {
        var root = HudFactory.Sliced("picker", parent, Shapes.RoundedOutline, Outline, cornerScale: 0.75f);
        root.raycastTarget = true;
        Rect = root.rectTransform;
        Rect.sizeDelta = new Vector2(width, Height);

        _cellWidth = width / options.Length;
        _selected = HudFactory.Sliced("selected", Rect, Shapes.Rounded, Selected, cornerScale: 0.6f);

        _labels = new Label[options.Length];
        for (int index = 0; index < options.Length; index++)
        {
            if (index > 0)
            {
                var divider = HudFactory.Box("divider", Rect, Divider);
                HudFactory.TopLeft(divider, index * _cellWidth, 5f, 1f, Height - 10f);
            }

            var label = HudFactory.Label("option", Rect, 12.5f, Theme.Muted, Align.Center);
            HudFactory.TopLeft(label.Go.GetComponent<RectTransform>(), index * _cellWidth + 4f, 0f, _cellWidth - 8f, Height);
            label.Value = options[index];
            _labels[index] = label;
        }
    }

    public RectTransform Rect { get; }

    public void Set(int selected)
    {
        if (_shown == selected) return;
        _shown = selected;
        HudFactory.TopLeft(_selected, selected * _cellWidth + 2f, 2f, _cellWidth - 4f, Height - 4f);
        for (int index = 0; index < _labels.Length; index++)
            _labels[index].Color = index == selected ? Theme.Ready : Theme.Muted;
    }

    /// <summary>The option under the pointer, or -1.</summary>
    public int OptionAtPointer()
    {
        if (!Pointer.Over(Rect)) return -1;
        RectTransformUtility.ScreenPointToLocalPointInRectangle(Rect, Pointer.Position, null, out var local);
        float fromLeft = local.x + Rect.rect.width * Rect.pivot.x;
        return Mathf.Clamp((int)(fromLeft / _cellWidth), 0, _labels.Length - 1);
    }
}

public enum ButtonStyle
{
    /// <summary>Text only, brightening on hover.</summary>
    Link,

    /// <summary>A quiet framed button for an action in a row.</summary>
    Secondary,

    /// <summary>A framed gold button for the main action.</summary>
    Primary,
}

/// <summary>A text button in one of the <see cref="ButtonStyle"/> looks.</summary>
public sealed class ButtonView
{
    private static readonly Color PrimaryFill = new(0.906f, 0.698f, 0.290f, 0.16f);
    private static readonly Color PrimaryFillHover = new(0.906f, 0.698f, 0.290f, 0.28f);
    private static readonly Color PrimaryOutline = new(0.906f, 0.698f, 0.290f, 0.55f);
    private static readonly Color SecondaryFill = new(1f, 1f, 1f, 0.03f);
    private static readonly Color SecondaryFillHover = new(1f, 1f, 1f, 0.09f);
    private static readonly Color SecondaryOutline = new(1f, 1f, 1f, 0.16f);

    private readonly ButtonStyle _style;
    private readonly Label _label;
    private readonly Image _fill;

    public ButtonView(Transform parent, string text, ButtonStyle style, float width, float height)
    {
        _style = style;
        if (style == ButtonStyle.Link)
        {
            _fill = HudFactory.Box("button", parent, Color.clear);
            Rect = _fill.rectTransform;
        }
        else
        {
            bool primary = style == ButtonStyle.Primary;
            _fill = HudFactory.Sliced("button", parent, Shapes.Rounded, primary ? PrimaryFill : SecondaryFill, cornerScale: 0.6f);
            Rect = _fill.rectTransform;
            var outline = HudFactory.Sliced("outline", Rect, Shapes.RoundedOutline, primary ? PrimaryOutline : SecondaryOutline, cornerScale: 0.6f);
            HudFactory.Stretch(outline, Vector2.zero, Vector2.zero);
        }

        _fill.raycastTarget = true;
        Rect.sizeDelta = new Vector2(width, height);
        bool bold = style == ButtonStyle.Primary;
        _label = HudFactory.Label("label", Rect, 13f, style == ButtonStyle.Primary ? Theme.Ready : Theme.Muted, Align.Center, bold: bold);
        HudFactory.Stretch(_label.Go.GetComponent<RectTransform>(), Vector2.zero, Vector2.zero);
        _label.Value = text;
    }

    public RectTransform Rect { get; }

    public string Text
    {
        set => _label.Value = value;
    }

    /// <summary>Updates the hover look and reports a click.</summary>
    public bool Update()
    {
        bool hovered = Pointer.Over(Rect);
        switch (_style)
        {
            case ButtonStyle.Primary:
                _fill.color = hovered ? PrimaryFillHover : PrimaryFill;
                break;
            case ButtonStyle.Secondary:
                _fill.color = hovered ? SecondaryFillHover : SecondaryFill;
                _label.Color = hovered ? Theme.Text : Theme.Muted;
                break;
            default:
                _label.Color = hovered ? Theme.Text : Theme.Muted;
                break;
        }
        return Pointer.Clicked(Rect);
    }
}

/// <summary>A square icon button, such as a panel header's lock or settings control.</summary>
public sealed class IconButton
{
    private readonly Image _background;
    private readonly Image _icon;
    private Color _color = Theme.Control;

    public IconButton(Transform parent, Sprite icon, float size, float iconSize)
    {
        _background = HudFactory.Sliced("iconButton", parent, Shapes.Rounded, Color.clear, cornerScale: 0.45f);
        _background.raycastTarget = true;
        Rect = _background.rectTransform;
        Rect.sizeDelta = new Vector2(size, size);
        _icon = HudFactory.Tinted("icon", Rect, icon, _color);
        _icon.rectTransform.sizeDelta = new Vector2(iconSize, iconSize);
    }

    public RectTransform Rect { get; }

    public Sprite Icon
    {
        set
        {
            if (_icon.sprite != value) _icon.sprite = value;
        }
    }

    /// <summary>Shows the button as on, gold on a faint gold background.</summary>
    public bool Active { get; set; }

    /// <summary>Updates the hover look and reports a click.</summary>
    public bool Update()
    {
        bool hovered = Pointer.Over(Rect);
        _background.color = Active ? Theme.ReadyBg : hovered ? new Color(1f, 1f, 1f, 0.08f) : Color.clear;
        _color = Active ? Theme.Ready : hovered ? Theme.Text : Theme.Control;
        _icon.color = _color;
        return Pointer.Clicked(Rect);
    }
}

/// <summary>A switch shown as a chip: a pill with a coloured dot and a label.</summary>
public sealed class ChipView
{
    public const float Height = 24f;
    private const float DotSize = 9f;

    private static readonly Color FillOn = new(1f, 1f, 1f, 0.07f);
    private static readonly Color OutlineOn = new(1f, 1f, 1f, 0.24f);
    private static readonly Color OutlineOff = new(1f, 1f, 1f, 0.10f);

    private readonly Image _fill;
    private readonly Image _outline;
    private readonly Image _dot;
    private readonly Label _label;
    private Color _dotColor;
    private bool? _shown;

    public ChipView(Transform parent, string text)
    {
        _fill = HudFactory.Sliced("chip", parent, Shapes.Rounded, Color.clear, cornerScale: 1.6f);
        _fill.raycastTarget = true;
        Rect = _fill.rectTransform;
        _outline = HudFactory.Sliced("outline", Rect, Shapes.RoundedOutline, OutlineOff, cornerScale: 1.6f);
        HudFactory.Stretch(_outline, Vector2.zero, Vector2.zero);

        _dot = HudFactory.Tinted("dot", Rect, Shapes.Disc, Color.white);
        HudFactory.TopLeft(_dot, 9f, (Height - DotSize) / 2f, DotSize, DotSize);

        _label = HudFactory.Label("label", Rect, 12.5f, Theme.Text, Align.Left);
        _label.Value = text;
        float labelWidth = Mathf.Ceil(_label.PreferredWidth) + 2f;
        HudFactory.TopLeft(_label.Rect, 9f + DotSize + 6f, 0f, labelWidth, Height);
        Width = 9f + DotSize + 6f + labelWidth + 10f;
        Rect.sizeDelta = new Vector2(Width, Height);
    }

    public RectTransform Rect { get; }
    public float Width { get; }

    public void Set(bool on, Color dot)
    {
        if (_shown == on && _dotColor == dot) return;
        _shown = on;
        _dotColor = dot;
        _fill.color = on ? FillOn : Color.clear;
        _outline.color = on ? OutlineOn : OutlineOff;
        _label.Color = on ? Theme.Text : Theme.Dim;
        dot.a = on ? 1f : 0.3f;
        _dot.color = dot;
    }
}

/// <summary>A whole number between a button that lowers it and one that raises it.</summary>
public sealed class StepperView
{
    public const float Height = 26f;
    private const float ButtonSize = 26f;
    private const float ValueWidth = 38f;
    public const float Width = ButtonSize * 2f + ValueWidth;

    private readonly StepButton _down;
    private readonly StepButton _up;
    private readonly Label _value;
    private int? _shown;
    private bool _shownEnabled = true;

    public StepperView(Transform parent)
    {
        Rect = HudFactory.Rect("stepper", parent).GetComponent<RectTransform>();
        Rect.sizeDelta = new Vector2(Width, Height);
        _down = new StepButton(Rect, 0f, plus: false);
        _value = HudFactory.Label("value", Rect, 13.5f, Theme.Text, Align.Center, monospaced: true);
        HudFactory.TopLeft(_value.Rect, ButtonSize, 0f, ValueWidth, Height);
        _up = new StepButton(Rect, ButtonSize + ValueWidth, plus: true);
    }

    public RectTransform Rect { get; }

    public void Set(int value, bool enabled)
    {
        if (_shown == value && _shownEnabled == enabled) return;
        _shown = value;
        _shownEnabled = enabled;
        _value.Value = value.ToString();
        _value.Color = enabled ? Theme.Text : Theme.Dim;
    }

    /// <summary>Updates the hover look and reports a click: -1 to lower, 1 to raise, 0 for none.</summary>
    public int Update()
    {
        if (_down.Update()) return -1;
        return _up.Update() ? 1 : 0;
    }

    // Minus and plus are drawn as bars, because not every game font has the minus sign.
    private sealed class StepButton
    {
        private static readonly Color Fill = new(1f, 1f, 1f, 0.03f);
        private static readonly Color FillHover = new(1f, 1f, 1f, 0.09f);
        private static readonly Color Outline = new(1f, 1f, 1f, 0.16f);

        private readonly Image _fill;
        private readonly Image[] _bars;

        public StepButton(RectTransform parent, float x, bool plus)
        {
            _fill = HudFactory.Sliced("step", parent, Shapes.Rounded, Fill, cornerScale: 0.6f);
            _fill.raycastTarget = true;
            HudFactory.TopLeft(_fill, x, 0f, ButtonSize, Height);
            var outline = HudFactory.Sliced("outline", _fill.rectTransform, Shapes.RoundedOutline, Outline, cornerScale: 0.6f);
            HudFactory.Stretch(outline, Vector2.zero, Vector2.zero);

            var across = HudFactory.Box("across", _fill.rectTransform, Theme.Muted);
            HudFactory.TopLeft(across, (ButtonSize - 10f) / 2f, (Height - 2f) / 2f, 10f, 2f);
            if (!plus)
            {
                _bars = new[] { across };
                return;
            }

            var down = HudFactory.Box("down", _fill.rectTransform, Theme.Muted);
            HudFactory.TopLeft(down, (ButtonSize - 2f) / 2f, (Height - 10f) / 2f, 2f, 10f);
            _bars = new[] { across, down };
        }

        public bool Update()
        {
            bool hovered = Pointer.Over(_fill.rectTransform);
            _fill.color = hovered ? FillHover : Fill;
            foreach (var bar in _bars) bar.color = hovered ? Theme.Text : Theme.Muted;
            return Pointer.Clicked(_fill.rectTransform);
        }
    }
}
