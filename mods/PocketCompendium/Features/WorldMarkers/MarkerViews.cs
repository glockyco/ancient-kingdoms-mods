using Il2CppTMPro;
using PocketCompendium.Core.Ui;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.WorldMarkers;

/// <summary>
/// Text readable over any ground without a box: eight dark copies one pixel around the face, the
/// hard outline pixel-art games give their text. A font outline cannot do it, because the
/// fonts' distance fields reach less than a pixel at these sizes.
/// </summary>
internal sealed class Stroked
{
    private const float Offset = 1.2f;
    private static readonly int FaceDilate = Shader.PropertyToID("_FaceDilate");
    private static readonly Color StrokeColor = new(0.02f, 0.02f, 0.02f, 0.95f);
    private static readonly Vector2[] Directions =
    {
        new(1f, 0f), new(-1f, 0f), new(0f, 1f), new(0f, -1f),
        new(1f, 1f), new(-1f, 1f), new(1f, -1f), new(-1f, -1f),
    };

    private readonly Label _face;
    private readonly Label[] _strokes = new Label[8];

    public Stroked(string name, Transform parent, float size, Color color, Align align)
    {
        Rect = HudFactory.Rect(name, parent).GetComponent<RectTransform>();
        // The strokes come first, so the face draws over them.
        for (int index = 0; index < _strokes.Length; index++)
        {
            _strokes[index] = Make("stroke", size, StrokeColor, align);
            HudFactory.Stretch(_strokes[index].Rect, Directions[index] * Offset, Directions[index] * Offset);
        }

        _face = Make("face", size, color, align);
        HudFactory.Stretch(_face.Rect, Vector2.zero, Vector2.zero);
    }

    public RectTransform Rect { get; }

    public string Value
    {
        set
        {
            _face.Value = value;
            foreach (var stroke in _strokes) stroke.Value = value;
        }
    }

    /// <summary>Sets game text that can be Chinese or Japanese, with the game's font for it.</summary>
    public string LocalizedValue
    {
        set
        {
            _face.LocalizedValue = value;
            foreach (var stroke in _strokes) stroke.LocalizedValue = value;
        }
    }

    public Color Color
    {
        set => _face.Color = value;
    }

    public TextAlignmentOptions Alignment
    {
        get => _face.Text.alignment;
        set
        {
            _face.Text.alignment = value;
            foreach (var stroke in _strokes) stroke.Text.alignment = value;
        }
    }

    private Label Make(string name, float size, Color color, Align align)
    {
        var label = HudFactory.Label(name, Rect, size, color, align, bold: true, monospaced: true);
        label.Text.extraPadding = true;
        label.Text.fontMaterial.SetFloat(FaceDilate, 0.15f);
        return label;
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
    private readonly Stroked _name;
    private readonly Stroked _time;

    public SpawnMarkerView(Transform parent)
    {
        Rect = HudFactory.Rect("marker", parent).GetComponent<RectTransform>();
        Rect.sizeDelta = Vector2.zero;
        _portrait = new RoundPortraitView(Rect, PortraitSize, 2f, RingWidth);

        float below = -PortraitSize / 2f - RingWidth - 1f;
        _name = new Stroked("name", Rect, 15f, Color.white, Align.Center);
        HudFactory.Place(_name.Rect, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f),
            new Vector2(-LabelWidth / 2f, below - LineHeight), new Vector2(LabelWidth / 2f, below));
        _time = new Stroked("time", Rect, 16f, Color.white, Align.Center);
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
    private readonly Stroked _name;
    private readonly Stroked _state;

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

        // The labels are drawn after the pointer.
        _labels = HudFactory.Rect("labels", Rect).GetComponent<RectTransform>();
        _labels.sizeDelta = new Vector2(LabelWidth, 44f);
        _name = new Stroked("name", _labels, 15f, Color.white, Align.Left);
        HudFactory.Place(_name.Rect, new Vector2(0f, 0.5f), new Vector2(1f, 0.5f), new Vector2(0f, -2f), new Vector2(0f, 22f));
        _state = new Stroked("state", _labels, 15f, Theme.Ready, Align.Left);
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

        var align = labelsRight ? TextAlignmentOptions.Left : TextAlignmentOptions.Right;
        if (_name.Alignment != align)
        {
            _name.Alignment = align;
            _state.Alignment = align;
        }

        float side = labelsRight ? 1f : -1f;
        _labels.anchoredPosition = new Vector2(side * (PortraitSize / 2f + LabelGap + LabelWidth / 2f), 0f);
    }

    public void Show(Sprite portrait, Color tier, Color nameColor, string name, string state, bool silhouette)
    {
        _portrait.Set(portrait, tier, down: false, silhouette);
        _name.Color = nameColor;
        _name.LocalizedValue = name;
        _state.Value = state;
    }
}
