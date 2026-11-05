using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Core.Ui;

/// <summary>
/// The look of Pocket Compendium's monster panels: a dark background with a faint edge, and a
/// header bar with a gold accent along its top, a title and a count. The owner places the header
/// and adds its own controls to it.
/// </summary>
public sealed class PanelChrome
{
    public const float AccentHeight = 2f;
    public const float BarHeight = 30f;
    public const float HeaderHeight = AccentHeight + BarHeight;

    private static readonly Color Edge = new(1f, 1f, 1f, 0.07f);

    public PanelChrome(RectTransform root)
    {
        Background = HudFactory.Box("background", root, Theme.Panel);
        HudFactory.Stretch(Background, Vector2.zero, Vector2.zero);
        HudFactory.Frame(Background.transform, Edge, 1f);

        var bar = HudFactory.Box("header", root, Theme.Header);
        Header = bar.rectTransform;
        Header.anchorMin = Header.anchorMax = new Vector2(0f, 1f);
        Header.pivot = new Vector2(0f, 1f);
        bar.raycastTarget = true;

        var accent = HudFactory.Tinted("accent", Header, Shapes.Fade, Theme.Gold);
        accent.type = Image.Type.Simple;
        accent.preserveAspect = false;
        HudFactory.Place(accent, new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(0f, -AccentHeight), Vector2.zero);
        var line = HudFactory.Box("line", Header, Theme.Line);
        HudFactory.Place(line, Vector2.zero, new Vector2(1f, 0f), Vector2.zero, new Vector2(0f, 1f));

        Title = HudFactory.Label("title", Header, 14f, Theme.Gold, Align.Left, bold: true);
        Count = HudFactory.Label("count", Header, 12f, Theme.Muted, Align.Left);
    }

    public Image Background { get; }
    public RectTransform Header { get; }
    public Label Title { get; }
    public Label Count { get; }

    /// <summary>The width the title and the count take, with the header's margins.</summary>
    public float TitleWidth => 10f + Mathf.Ceil(Title.PreferredWidth) + 8f +
                               (Count.PreferredWidth > 0f ? Mathf.Ceil(Count.PreferredWidth) + 8f : 0f);

    /// <summary>
    /// Sizes the header to <paramref name="width"/> and places the title, at most
    /// <paramref name="titleWidth"/> wide, and the count after it. Returns the x after both.
    /// </summary>
    public float LayoutHeader(float width, float titleWidth)
    {
        Header.sizeDelta = new Vector2(width, HeaderHeight);
        float x = 10f;
        HudFactory.TopLeft(Title.Rect, x, AccentHeight, titleWidth, BarHeight);
        x += Mathf.Min(titleWidth, Mathf.Ceil(Title.PreferredWidth)) + 8f;
        HudFactory.TopLeft(Count.Rect, x, AccentHeight, 50f, BarHeight);
        return x + (Count.PreferredWidth > 0f ? Mathf.Ceil(Count.PreferredWidth) + 8f : 0f);
    }
}
