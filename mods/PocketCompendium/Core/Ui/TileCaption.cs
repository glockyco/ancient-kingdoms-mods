using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Core.Ui;

/// <summary>
/// The caption of a compact tile, such as a boss's time, a herb's count or a profession's level: a
/// bold 13 px caption on a solid dark band across the tile's bottom, so light captions stay
/// readable on bright pictures. Digits are monospaced, so a countdown doesn't shift. A tile adds
/// the band first and the caption last, so its hover look and icons sit between them.
/// </summary>
public static class TileCaption
{
    private const float BandHeight = 17f;
    private static readonly Color BandColor = new(0f, 0f, 0f, 0.78f);

    /// <summary>Adds the band inside the tile's 2-unit frame.</summary>
    public static Image Band(RectTransform tile)
    {
        var band = HudFactory.Box("band", tile, BandColor);
        HudFactory.Place(band.rectTransform, Vector2.zero, new Vector2(1f, 0f), new Vector2(2f, 2f), new Vector2(-2f, BandHeight));
        return band;
    }

    /// <summary>Adds the caption over the band.</summary>
    public static Label Caption(RectTransform tile)
    {
        var caption = HudFactory.Label("caption", tile, 13f, Color.white, Align.Center, bold: true, monospaced: true);
        caption.Text.extraPadding = true;
        HudFactory.Outline(caption.Text);
        HudFactory.Place(caption.Rect, Vector2.zero, new Vector2(1f, 0f), new Vector2(-3f, 0f), new Vector2(3f, BandHeight + 1f));
        return caption;
    }
}
