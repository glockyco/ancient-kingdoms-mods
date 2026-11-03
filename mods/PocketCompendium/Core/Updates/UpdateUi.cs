using System.Collections.Generic;
using PocketCompendium.Core.Text;
using PocketCompendium.Core.Ui;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Core.Updates;

/// <summary>The words the first-start question and the Updates page share.</summary>
internal static class UpdateWords
{
    public const string Summary =
        "Pocket Compendium can check <nobr>ancient-kingdoms.compendiums.org</nobr> for updates each time the game starts. It sends nothing about you or your game.";

    /// <summary>The answers in <see cref="AncientKingdomsMods.Shared.Updates.UpdateAnswer"/> order: label and help.</summary>
    public static readonly (string Label, string Help)[] Answers =
    {
        ("Install updates for me", "Updates install while the game starts."),
        ("Only tell me about updates", "You decide when to install each one."),
        ("Don't check for updates", "Pocket Compendium never contacts the website."),
    };

    /// <summary>Under a version that is downloaded and waits for the next start.</summary>
    public const string LoadsNextStart = "It loads the next time you start the game.";
}

/// <summary>Drawing shared by the start-screen card, the first-start question and the Updates page.</summary>
internal static class UpdateUi
{
    // Opaque like the settings window, because the game blends its interface in linear colour space.
    public static readonly Color WindowBackground = new(0.047f, 0.059f, 0.082f, 1f);
    public static readonly Color Outline = new(1f, 1f, 1f, 0.10f);
    public static readonly Color Chosen = new(0.906f, 0.698f, 0.290f, 0.06f);
    public static readonly Color ChosenOutline = new(0.906f, 0.698f, 0.290f, 0.55f);
    public static readonly Color Row = new(1f, 1f, 1f, 0.02f);
    public static readonly Color RowHover = new(1f, 1f, 1f, 0.05f);

    /// <summary>A label at a place, wrapped to the width unless <paramref name="wrap"/> is false, sized to its text.</summary>
    public static Label Text(Transform parent, string text, float x, float y, float width, float size, Color color, bool bold = false, bool wrap = true)
    {
        var label = HudFactory.Label("text", parent, size, color, Align.Left, bold);
        if (wrap)
        {
            label.Text.enableWordWrapping = true;
            label.Text.overflowMode = Il2CppTMPro.TextOverflowModes.Overflow;
            label.Text.alignment = Il2CppTMPro.TextAlignmentOptions.TopLeft;
            // No line ends with one word alone.
            text = Wrapping.KeepLastWordsTogether(text);
        }
        label.Value = text;
        float height = wrap ? label.Text.GetPreferredValues(text, width, 0f).y : Mathf.Ceil(size * 1.5f);
        HudFactory.TopLeft(label.Rect, x, y, width, height);
        return label;
    }

    public static float Height(Label label) => label.Rect.sizeDelta.y;

    /// <summary>
    /// A panel in the settings window's look: opaque, rounded, a faint outline and the gold accent. Draw
    /// it before the content, then size it with <see cref="Size"/> once the content's height is known.
    /// </summary>
    public static Image Panel(RectTransform root)
    {
        var background = HudFactory.Sliced("background", root, Shapes.Rounded, WindowBackground, cornerScale: 0.5f);
        HudFactory.Stretch(background, Vector2.zero, Vector2.zero);
        background.raycastTarget = true;
        var frame = HudFactory.Sliced("frame", root, Shapes.RoundedOutline, Outline, cornerScale: 0.5f);
        HudFactory.Stretch(frame, Vector2.zero, Vector2.zero);
        var accent = HudFactory.Tinted("accent", root, Shapes.Fade, Theme.Gold);
        accent.type = Image.Type.Simple;
        accent.preserveAspect = false;
        return accent;
    }

    public static void Size(RectTransform root, Image accent, float width, float height)
    {
        root.sizeDelta = new Vector2(width, height);
        HudFactory.TopLeft(accent, 3f, 0f, width - 6f, 2f);
    }

    /// <summary>An icon on a soft gold disc, as the cards lead with.</summary>
    public static void Disc(Transform parent, Sprite icon, float x, float y, float size)
    {
        var back = HudFactory.Tinted("disc", parent, Shapes.Disc, new Color(0.906f, 0.698f, 0.290f, 0.16f));
        HudFactory.TopLeft(back, x, y, size, size);
        var image = HudFactory.Tinted("icon", back.rectTransform, icon, Theme.Ready);
        float inner = size * 0.56f;
        HudFactory.TopLeft(image, (size - inner) / 2f, (size - inner) / 2f, inner, inner);
    }

    public static RectTransform Anchored(RectTransform rect, Vector2 anchor, Vector2 position)
    {
        rect.anchorMin = anchor;
        rect.anchorMax = anchor;
        rect.pivot = anchor;
        rect.anchoredPosition = position;
        return rect;
    }
}

/// <summary>The three answers as rows with a radio mark, in the first-start question and on the Updates page.</summary>
internal sealed class AnswerRows
{
    private const float RowHeight = 52f;
    private const float Gap = 8f;

    private readonly List<Image> _rows = new();
    private readonly List<Image> _outlines = new();
    private readonly List<Image> _rings = new();
    private readonly List<Image> _dots = new();
    private readonly List<Label> _labels = new();

    public AnswerRows(Transform parent, float x, float y, float width, int chosen)
    {
        for (int index = 0; index < UpdateWords.Answers.Length; index++)
        {
            var row = HudFactory.Sliced("answer", parent, Shapes.Rounded, UpdateUi.Row, cornerScale: 0.6f);
            row.raycastTarget = true;
            var rect = HudFactory.TopLeft(row, x, y + index * (RowHeight + Gap), width, RowHeight);
            var outline = HudFactory.Sliced("outline", rect, Shapes.RoundedOutline, UpdateUi.Outline, cornerScale: 0.6f);
            HudFactory.Stretch(outline, Vector2.zero, Vector2.zero);
            var ring = HudFactory.Tinted("radio", rect, Shapes.Ring, Theme.Control);
            HudFactory.TopLeft(ring, 14f, 18f, 16f, 16f);
            var dot = HudFactory.Tinted("radioDot", rect, Shapes.Disc, Theme.Ready);
            HudFactory.TopLeft(dot, 18f, 22f, 8f, 8f);
            _labels.Add(UpdateUi.Text(rect, UpdateWords.Answers[index].Label, 42f, 8f, width - 56f, 13.5f, Theme.Text, wrap: false));
            UpdateUi.Text(rect, UpdateWords.Answers[index].Help, 42f, 28f, width - 56f, 12f, Theme.Dim, wrap: false);
            _rows.Add(row);
            _outlines.Add(outline);
            _rings.Add(ring);
            _dots.Add(dot);
        }
        Height = UpdateWords.Answers.Length * (RowHeight + Gap) - Gap;
        Set(chosen);
    }

    public float Height { get; }

    public int Chosen { get; private set; } = -1;

    public void Set(int chosen)
    {
        Chosen = chosen;
        for (int index = 0; index < _rows.Count; index++)
        {
            bool on = index == chosen;
            _outlines[index].color = on ? UpdateUi.ChosenOutline : UpdateUi.Outline;
            _rings[index].color = on ? Theme.Ready : Theme.Control;
            _dots[index].enabled = on;
            _labels[index].Text.fontStyle = on ? Il2CppTMPro.FontStyles.Bold : Il2CppTMPro.FontStyles.Normal;
        }
    }

    /// <summary>Updates the hover look and returns the row clicked this frame, or -1.</summary>
    public int Update()
    {
        int clicked = -1;
        for (int index = 0; index < _rows.Count; index++)
        {
            var rect = _rows[index].rectTransform;
            bool hovered = Pointer.Over(rect);
            _rows[index].color = index == Chosen ? UpdateUi.Chosen : hovered ? UpdateUi.RowHover : UpdateUi.Row;
            if (clicked < 0 && Pointer.Clicked(rect)) clicked = index;
        }
        return clicked;
    }
}
