using PocketCompendium.Core.Ui;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.Professions.Ui;

/// <summary>A profession in the list style: its icon, name and level, with the gold corner while watched.</summary>
internal sealed class ProfessionRowView
{
    public const float Height = 28f;
    private const float IconSize = 22f;
    private const float LevelWidth = 44f;
    private const float CornerSize = 6f;

    private readonly Image _background;
    private readonly Image _icon;
    private readonly Label _name;
    private readonly Label _level;
    private readonly RectTransform _corner;
    private readonly HoverText _tooltip;

    public ProfessionRowView(Transform parent)
    {
        _background = HudFactory.Box("profession", parent, Color.clear);
        _background.raycastTarget = true;
        Rect = _background.rectTransform;
        _icon = HudFactory.Icon("icon", Rect, null);
        HudFactory.TopLeft(_icon, 4f, (Height - IconSize) / 2f, IconSize, IconSize);
        _corner = WatchCorner.Create(_icon.rectTransform, CornerSize);
        _name = HudFactory.Label("name", Rect, 12.5f, Theme.Text, Align.Left);
        _level = HudFactory.Label("level", Rect, 12.5f, Theme.Text, Align.Right, bold: true);
        _tooltip = new HoverText(Rect);
    }

    public RectTransform Rect { get; }
    public ProfessionSource.Profession Profession { get; private set; }

    public void SetActive(bool active)
    {
        if (Rect.gameObject.activeSelf != active) Rect.gameObject.SetActive(active);
        if (!active) Profession = null;
    }

    public void Set(ProfessionSource.Profession profession, bool watched, float width)
    {
        Profession = profession;
        if (_icon.sprite != profession.Icon) _icon.sprite = profession.Icon;
        _icon.enabled = profession.Icon != null;
        if (_corner.gameObject.activeSelf != watched) _corner.gameObject.SetActive(watched);
        _name.Value = profession.Name;
        _level.Value = profession.LevelText;
        _level.Color = profession.Maxed ? Theme.LevelYellow : Theme.Text;
        _tooltip.Text = ProfessionTooltip.Build(profession, watched);
        HudFactory.TopLeft(_name.Rect, 4f + IconSize + 6f, 0f, width - IconSize - 14f - LevelWidth, Height);
        HudFactory.TopLeft(_level.Rect, width - 4f - LevelWidth, 0f, LevelWidth, Height);
    }

    public bool UpdateHover(bool overPanel)
    {
        bool hovered = overPanel && Pointer.Over(Rect);
        _background.color = hovered ? Theme.Hover : Color.clear;
        return hovered;
    }
}

/// <summary>A profession in the compact style: its icon with its level on a band, the name in its tooltip.</summary>
internal sealed class ProfessionTileView
{
    public const float Size = 44f;

    private readonly PortraitView _portrait;
    private readonly Label _caption;
    private readonly Image _hover;
    private readonly HoverText _tooltip;
    private bool _hoverShown;

    public ProfessionTileView(Transform parent)
    {
        _portrait = new PortraitView(parent, Size, 2f);
        Rect = _portrait.Rect;
        Rect.GetComponent<Image>().raycastTarget = true;
        _tooltip = new HoverText(Rect);
        TileCaption.Band(Rect);
        _hover = HudFactory.Box("hover", Rect, new Color(1f, 1f, 1f, 0.12f));
        HudFactory.Stretch(_hover, new Vector2(2f, 2f), new Vector2(-2f, -2f));
        _hover.enabled = false;
        _caption = TileCaption.Caption(Rect);
    }

    public RectTransform Rect { get; }
    public ProfessionSource.Profession Profession { get; private set; }

    public void SetActive(bool active)
    {
        if (Rect.gameObject.activeSelf != active) Rect.gameObject.SetActive(active);
        if (!active) Profession = null;
    }

    public void Set(ProfessionSource.Profession profession, bool watched)
    {
        Profession = profession;
        _portrait.Set(profession.Icon, Theme.Steel, dimmed: false, watched, silhouette: false);
        _caption.Value = profession.LevelText;
        _caption.Color = profession.Maxed ? Theme.LevelYellow : Color.white;
        _tooltip.Text = ProfessionTooltip.Build(profession, watched);
    }

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
}

/// <summary>A profession's tooltip: its name, its level out of 100 and what a click does.</summary>
internal static class ProfessionTooltip
{
    // The Gathering tiles' gap and grey click line.
    private const string SectionGap = "\n<size=50%> </size>";
    private const string Footer = "#6B7684";

    public static string Build(ProfessionSource.Profession profession, bool watched) =>
        "<b>" + profession.Name + "</b>\n" + (profession.Fraction * 100f).ToString("N2") + " of 100" + SectionGap +
        "\n<size=90%><color=" + Footer + ">" + (watched ? "Click to stop watching." : "Click to watch.") + "</color></size>";
}

/// <summary>The gold diamond over an icon's top-right corner that marks a watched item, as on tiles.</summary>
internal static class WatchCorner
{
    public static RectTransform Create(RectTransform parent, float size)
    {
        float inset = (size + 2f) * 0.7071f * 0.5f;
        var edge = HudFactory.Box("watched", parent, Color.black);
        var corner = edge.rectTransform;
        corner.anchorMin = corner.anchorMax = new Vector2(1f, 1f);
        corner.pivot = new Vector2(0.5f, 0.5f);
        corner.sizeDelta = new Vector2(size + 2f, size + 2f);
        corner.anchoredPosition = new Vector2(-inset, -inset);
        corner.localRotation = Quaternion.Euler(0f, 0f, 45f);
        var gold = HudFactory.Box("gold", corner, Theme.Golden);
        HudFactory.Stretch(gold, Vector2.one, -Vector2.one);
        corner.gameObject.SetActive(false);
        return corner;
    }
}
