using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Core.Ui;

/// <summary>
/// A monster portrait in a frame of its tier colour. A dead monster's portrait darkens under a
/// sweep that clears as its wait runs out, an undiscovered one shows as a black silhouette like
/// the game's Bestiary, and a watched one carries a gold corner.
/// </summary>
public sealed class PortraitView
{
    private static readonly Color Down = new(0.42f, 0.42f, 0.45f, 1f);
    private static readonly Color SweepColor = new(0f, 0f, 0f, 0.62f);
    private static readonly Color SilhouetteBackground = new(0.16f, 0.18f, 0.22f, 1f);

    private readonly Image _frame;
    private readonly Image _background;
    private readonly Image _portrait;
    private readonly Image _sweep;
    private readonly RectTransform _corner;

    public PortraitView(Transform parent, float size, float border)
    {
        _frame = HudFactory.Box("portrait", parent, Color.white);
        Rect = _frame.rectTransform;
        Rect.sizeDelta = new Vector2(size, size);

        _background = HudFactory.Box("background", Rect, Theme.IconBg);
        HudFactory.Stretch(_background, new Vector2(border, border), new Vector2(-border, -border));
        _portrait = HudFactory.Icon("image", Rect, null);
        HudFactory.Stretch(_portrait, new Vector2(border, border), new Vector2(-border, -border));

        _sweep = HudFactory.Box("sweep", Rect, SweepColor);
        _sweep.type = Image.Type.Filled;
        _sweep.fillMethod = Image.FillMethod.Radial360;
        _sweep.fillOrigin = (int)Image.Origin360.Top;
        _sweep.fillClockwise = true;
        HudFactory.Stretch(_sweep, new Vector2(border, border), new Vector2(-border, -border));

        // A gold diamond with a dark edge over the top-right corner, like the compact tiles' mark.
        // Its center sits half its reach inside the corner, so in a grid of tiles it stops short
        // of the tile above and the tile beside.
        float cornerSize = Mathf.Round(size * 0.22f);
        float inset = (cornerSize + 2f) * 0.7071f * 0.5f;
        var edge = HudFactory.Box("watched", Rect, Color.black);
        _corner = edge.rectTransform;
        _corner.anchorMin = _corner.anchorMax = new Vector2(1f, 1f);
        _corner.pivot = new Vector2(0.5f, 0.5f);
        _corner.sizeDelta = new Vector2(cornerSize + 2f, cornerSize + 2f);
        _corner.anchoredPosition = new Vector2(-inset, -inset);
        _corner.localRotation = Quaternion.Euler(0f, 0f, 45f);
        var gold = HudFactory.Box("gold", _corner, Theme.Golden);
        HudFactory.Stretch(gold, Vector2.one, -Vector2.one);
        _corner.gameObject.SetActive(false);
    }

    public RectTransform Rect { get; }

    /// <param name="remaining">The share of the wait still to run, 0 without a countdown.</param>
    public void Set(Sprite sprite, Color tier, bool down, float remaining, bool watched, bool silhouette)
    {
        if (_portrait.sprite != sprite) _portrait.sprite = sprite;
        _portrait.enabled = sprite != null;
        _frame.color = silhouette ? Theme.Dim : tier;
        _background.color = silhouette ? SilhouetteBackground : Theme.IconBg;
        _portrait.color = silhouette ? Color.black : down ? Down : Color.white;

        float fill = silhouette ? 0f : remaining;
        _sweep.enabled = fill > 0f;
        _sweep.fillAmount = fill;

        if (_corner.gameObject.activeSelf != watched) _corner.gameObject.SetActive(watched);
    }
}
