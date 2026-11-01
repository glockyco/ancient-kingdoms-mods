using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Core.Ui;

/// <summary>
/// A monster portrait cut into a circle, for world markers, edge arrows and map pins. Around it
/// sit, as each surface needs, a frame in a colour, a ring that fills with progress, and a glow.
/// </summary>
public sealed class RoundPortraitView
{
    private static readonly Color Down = new(0.48f, 0.48f, 0.52f, 1f);
    private static readonly Color RingTrack = new(0.04f, 0.05f, 0.06f, 0.75f);
    private static readonly Color Edge = new(0f, 0f, 0f, 0.75f);
    private static readonly Color SweepColor = new(0f, 0f, 0f, 0.62f);
    private static readonly Color SilhouetteBackdrop = new(0.16f, 0.18f, 0.22f, 1f);

    private readonly Image _glow;
    private readonly Image _ringTrack;
    private readonly Image _ring;
    private readonly Image _frame;
    private readonly Image _backdrop;
    private readonly Image _portrait;
    private readonly Image _sweep;

    /// <param name="size">The portrait's outer diameter, frame included.</param>
    /// <param name="frame">The width of the coloured frame around the portrait.</param>
    /// <param name="ring">The width of the progress ring outside the frame, or 0 for none.</param>
    public RoundPortraitView(Transform parent, float size, float frame, float ring)
    {
        float outer = size + 2f * ring;
        Rect = HudFactory.Rect("roundPortrait", parent).GetComponent<RectTransform>();
        Rect.sizeDelta = new Vector2(outer, outer);

        _glow = HudFactory.Tinted("glow", Rect, Shapes.Glow, new Color(1f, 0.843f, 0f, 0.55f));
        _glow.rectTransform.sizeDelta = new Vector2(outer * 1.9f, outer * 1.9f);
        _glow.enabled = false;

        var edge = HudFactory.Tinted("edge", Rect, Shapes.Disc, Edge);
        edge.rectTransform.sizeDelta = new Vector2(outer + 2f, outer + 2f);

        if (ring > 0f)
        {
            _ringTrack = HudFactory.Tinted("ringTrack", Rect, Shapes.Disc, RingTrack);
            _ringTrack.rectTransform.sizeDelta = new Vector2(outer, outer);
            _ring = HudFactory.Tinted("ring", Rect, Shapes.Disc, Theme.Ready);
            _ring.rectTransform.sizeDelta = new Vector2(outer, outer);
            _ring.type = Image.Type.Filled;
            _ring.fillMethod = Image.FillMethod.Radial360;
            _ring.fillOrigin = (int)Image.Origin360.Top;
            _ring.fillClockwise = true;
            _ring.preserveAspect = false;
        }

        _frame = HudFactory.Tinted("frame", Rect, Shapes.Disc, Color.white);
        _frame.rectTransform.sizeDelta = new Vector2(size, size);

        // The disc masks the portrait to a circle and shows behind it as its backdrop.
        _backdrop = HudFactory.Tinted("mask", Rect, Shapes.Disc, Theme.IconBg);
        _backdrop.rectTransform.sizeDelta = new Vector2(size - 2f * frame, size - 2f * frame);
        _backdrop.gameObject.AddComponent<Mask>().showMaskGraphic = true;
        _portrait = HudFactory.Icon("image", _backdrop.rectTransform, null);
        HudFactory.Stretch(_portrait, Vector2.zero, Vector2.zero);
        _portrait.preserveAspect = false;
        _sweep = HudFactory.Box("sweep", _backdrop.rectTransform, SweepColor);
        HudFactory.Stretch(_sweep, Vector2.zero, Vector2.zero);
        _sweep.type = Image.Type.Filled;
        _sweep.fillMethod = Image.FillMethod.Radial360;
        _sweep.fillOrigin = (int)Image.Origin360.Top;
        _sweep.fillClockwise = true;
        _sweep.enabled = false;
    }

    public RectTransform Rect { get; }

    /// <param name="sweep">The share of the wait still to run, darkened over the portrait, or 0.</param>
    public void Set(Sprite sprite, Color frame, bool down, bool silhouette, float sweep = 0f)
    {
        if (_portrait.sprite != sprite) _portrait.sprite = sprite;
        _portrait.enabled = sprite != null;
        _portrait.color = silhouette ? Color.black : down ? Down : Color.white;
        _frame.color = silhouette ? Theme.Dim : frame;
        _backdrop.color = silhouette ? SilhouetteBackdrop : Theme.IconBg;
        _sweep.enabled = !silhouette && sweep > 0f;
        _sweep.fillAmount = sweep;
    }

    /// <summary>Fills the ring outside the frame, or hides it for null.</summary>
    public void SetProgress(float? done)
    {
        if (_ring == null) return;
        _ringTrack.enabled = done.HasValue;
        _ring.enabled = done.HasValue;
        if (done.HasValue) _ring.fillAmount = done.Value;
    }

    public void SetGlow(bool glow) => _glow.enabled = glow;
}
