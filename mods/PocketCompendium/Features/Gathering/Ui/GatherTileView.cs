using PocketCompendium.Core.Ui;
using PocketCompendium.Features.Gathering.Model;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.Gathering.Ui;

/// <summary>One gathering type in the boss list's compact look: its picture with a number or time on it.</summary>
internal sealed class GatherTileView
{
    public const float Size = 44f;

    private static readonly Color CaptionShade = new(0f, 0f, 0f, 0.85f);
    private static readonly Color Elsewhere = new(0.42f, 0.42f, 0.45f, 1f);

    private readonly PortraitView _portrait;
    private readonly Image _image;
    private readonly Image _shade;
    private readonly Label _caption;
    private readonly Image _hover;
    private readonly HoverText _tooltip;

    public GatherTileView(Transform parent)
    {
        _portrait = new PortraitView(parent, Size, 2f);
        Rect = _portrait.Rect;
        Rect.GetComponent<Image>().raycastTarget = true;
        _image = Rect.Find("image").GetComponent<Image>();
        _tooltip = new HoverText(Rect);

        _shade = HudFactory.Box("shade", Rect, CaptionShade);
        _shade.sprite = Shapes.Shade;
        HudFactory.Place(_shade.rectTransform, Vector2.zero, new Vector2(1f, 0.6f), new Vector2(2f, 2f), new Vector2(-2f, 0f));

        _hover = HudFactory.Box("hover", Rect, new Color(1f, 1f, 1f, 0.12f));
        HudFactory.Stretch(_hover, new Vector2(2f, 2f), new Vector2(-2f, -2f));
        _hover.enabled = false;

        _caption = HudFactory.Label("caption", Rect, 12f, Color.white, Align.Center, bold: true, monospaced: true);
        _caption.Text.extraPadding = true;
        HudFactory.Outline(_caption.Text);
        HudFactory.Place(_caption.Rect, new Vector2(0f, 0f), new Vector2(1f, 0f), new Vector2(-3f, -2f), new Vector2(3f, 17f));
    }

    public RectTransform Rect { get; }
    public GatherType Type { get; private set; }

    public void SetActive(bool active)
    {
        if (Rect.gameObject.activeSelf != active) Rect.gameObject.SetActive(active);
        if (!active) Type = null;
    }

    /// <param name="caption">How many are ready, or when the next one is. Null for a type of another zone.</param>
    public void Set(GatherType type, Sprite icon, string caption, bool ready, bool watched, bool silhouette)
    {
        Type = type;
        _portrait.Set(icon, Theme.Steel, dimmed: false, watched, silhouette);
        if (!silhouette && caption == null) _image.color = Elsewhere;
        _shade.enabled = caption != null;
        _caption.Value = caption ?? "";
        _caption.Color = ready ? Theme.Ready : Color.white;
    }

    public void SetTooltip(string text) => _tooltip.Text = text;

    public bool UpdateHover(bool overPanel)
    {
        bool hovered = overPanel && Pointer.Over(Rect);
        if (hovered != _hoverShown)
        {
            _hoverShown = hovered;
            _hover.enabled = hovered;
        }
        return hovered;
    }

    private bool _hoverShown;
}
