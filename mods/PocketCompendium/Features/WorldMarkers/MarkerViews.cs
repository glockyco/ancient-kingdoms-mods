using Il2CppTMPro;
using PocketCompendium.Core.Ui;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.WorldMarkers;

/// <summary>
/// Text readable over any ground without a box: a thick black outline around a widened face,
/// over a soft dark halo. Orange names on sand need all three.
/// </summary>
internal static class Outlined
{
    private static readonly int FaceDilate = Shader.PropertyToID("_FaceDilate");

    public static Label Create(string name, Transform parent, float size, Color color, Align align)
    {
        var label = HudFactory.Label(name, parent, size, color, align, bold: true, monospaced: true);
        label.Text.extraPadding = true;
        label.Text.outlineWidth = 0.32f;
        label.Text.outlineColor = new Color32(0, 0, 0, 255);
        label.Text.fontMaterial.SetFloat(FaceDilate, 0.36f);
        return label;
    }

    /// <summary>A soft dark ellipse behind text. Add it before the labels so it draws under them.</summary>
    public static RectTransform Halo(Transform parent, float width, float height)
    {
        var halo = HudFactory.Tinted("halo", parent, Shapes.Glow, new Color(0f, 0f, 0f, 0.7f));
        halo.preserveAspect = false;
        halo.rectTransform.sizeDelta = new Vector2(width, height);
        return halo.rectTransform;
    }
}

/// <summary>
/// A dead monster on its spawn point: its portrait in a ring that fills until it spawns, with its
/// name and time below.
/// </summary>
internal sealed class SpawnMarkerView
{
    private const float PortraitSize = 40f;
    private const float RingWidth = 4f;
    private const float LabelWidth = 220f;

    // Each line gets a rect taller than its outlined glyphs, because a label whose line does not
    // fit draws nothing.
    private const float LineHeight = 24f;

    private readonly RoundPortraitView _portrait;
    private readonly Label _name;
    private readonly Label _time;

    public SpawnMarkerView(Transform parent)
    {
        Rect = HudFactory.Rect("marker", parent).GetComponent<RectTransform>();
        Rect.sizeDelta = Vector2.zero;
        _portrait = new RoundPortraitView(Rect, PortraitSize, 2f, RingWidth);

        float below = -PortraitSize / 2f - RingWidth - 1f;
        Outlined.Halo(Rect, 230f, 84f).anchoredPosition = new Vector2(0f, below - LineHeight + 2f);
        _name = Outlined.Create("name", Rect, 15f, Color.white, Align.Center);
        HudFactory.Place(_name.Rect, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f),
            new Vector2(-LabelWidth / 2f, below - LineHeight), new Vector2(LabelWidth / 2f, below));
        _time = Outlined.Create("time", Rect, 16f, Color.white, Align.Center);
        HudFactory.Place(_time.Rect, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f),
            new Vector2(-LabelWidth / 2f, below - 2f * LineHeight + 4f), new Vector2(LabelWidth / 2f, below - LineHeight + 4f));
    }

    public RectTransform Rect { get; }

    public void SetActive(bool active)
    {
        if (Rect.gameObject.activeSelf != active) Rect.gameObject.SetActive(active);
    }

    public void Set(Sprite portrait, Color tier, Color nameColor, string name, string time, Color timeColor, float? done, bool silhouette)
    {
        _portrait.Set(portrait, tier, down: true, silhouette);
        _portrait.SetProgress(done);
        _name.Color = nameColor;
        _name.LocalizedValue = name;
        _time.Value = time;
        _time.Color = timeColor;
    }
}

/// <summary>
/// A monster that is up but off screen: its portrait at the screen's edge with a pointer towards
/// it, and its name and distance beside it.
/// </summary>
internal sealed class EdgeArrowView
{
    public const float PortraitSize = 38f;
    private const float PointerOrbit = PortraitSize / 2f + 8f;
    private const float LabelGap = 12f;
    private const float LabelWidth = 220f;

    private readonly RoundPortraitView _portrait;
    private readonly RectTransform _pointer;
    private readonly RectTransform _labels;
    private readonly RectTransform _halo;
    private readonly Label _name;
    private readonly Label _state;

    public EdgeArrowView(Transform parent)
    {
        Rect = HudFactory.Rect("edgeArrow", parent).GetComponent<RectTransform>();
        Rect.sizeDelta = Vector2.zero;
        _portrait = new RoundPortraitView(Rect, PortraitSize, 2f, 0f);

        var pointer = HudFactory.Tinted("pointer", Rect, Shapes.Triangle, Theme.Golden);
        pointer.preserveAspect = false;
        _pointer = pointer.rectTransform;
        _pointer.sizeDelta = new Vector2(14f, 10f);
        var shadow = pointer.gameObject.AddComponent<Shadow>();
        shadow.effectColor = new Color(0f, 0f, 0f, 0.9f);
        shadow.effectDistance = new Vector2(1f, -1f);

        _halo = Outlined.Halo(Rect, 200f, 70f);
        _labels = HudFactory.Rect("labels", Rect).GetComponent<RectTransform>();
        _labels.sizeDelta = new Vector2(LabelWidth, 44f);
        _name = Outlined.Create("name", _labels, 15f, Color.white, Align.Left);
        HudFactory.Place(_name.Rect, new Vector2(0f, 0.5f), new Vector2(1f, 0.5f), new Vector2(0f, -2f), new Vector2(0f, 22f));
        _state = Outlined.Create("state", _labels, 15f, Theme.Ready, Align.Left);
        HudFactory.Place(_state.Rect, new Vector2(0f, 0.5f), new Vector2(1f, 0.5f), new Vector2(0f, -22f), new Vector2(0f, 2f));
    }

    public RectTransform Rect { get; }

    public void SetActive(bool active)
    {
        if (Rect.gameObject.activeSelf != active) Rect.gameObject.SetActive(active);
    }

    /// <param name="angle">The direction to the monster in degrees, counter-clockwise from screen right.</param>
    /// <param name="labelsRight">Whether the labels sit right of the portrait, towards the screen's middle.</param>
    public void Aim(float angle, bool labelsRight)
    {
        float radians = angle * Mathf.Deg2Rad;
        _pointer.anchoredPosition = new Vector2(Mathf.Cos(radians), Mathf.Sin(radians)) * PointerOrbit;
        _pointer.localRotation = Quaternion.Euler(0f, 0f, angle - 90f);

        var align = labelsRight ? TextAlignmentOptions.MidlineLeft : TextAlignmentOptions.MidlineRight;
        if (_name.Text.alignment != align)
        {
            _name.Text.alignment = align;
            _state.Text.alignment = align;
        }

        // The text hugs the portrait, so its halo sits on the near part of the label column.
        float side = labelsRight ? 1f : -1f;
        _labels.anchoredPosition = new Vector2(side * (PortraitSize / 2f + LabelGap + LabelWidth / 2f), 0f);
        _halo.anchoredPosition = new Vector2(side * (PortraitSize / 2f + LabelGap + 80f), 0f);
    }

    public void Show(Sprite portrait, Color tier, Color nameColor, string name, string state, bool silhouette)
    {
        _portrait.Set(portrait, tier, down: false, silhouette);
        _name.Color = nameColor;
        _name.LocalizedValue = name;
        _state.Value = state;
    }
}
