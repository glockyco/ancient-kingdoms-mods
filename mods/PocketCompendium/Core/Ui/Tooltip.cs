using System.Collections.Generic;
using Il2Cpp;
using Il2CppTMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace PocketCompendium.Core.Ui;

/// <summary>
/// The hover text of one of Pocket Compendium's own elements, shown in <see cref="Tooltip"/>.
/// </summary>
public sealed class HoverText
{
    public HoverText(RectTransform rect)
    {
        Rect = rect;
        Tooltip.Register(this);
    }

    public RectTransform Rect { get; }

    /// <summary>The text to show. Null or empty shows nothing.</summary>
    public string Text { get; set; }
}

/// <summary>
/// Pocket Compendium's tooltip: a copy of the game's tooltip frame on a canvas of its own, shown for
/// the hovered or gamepad-focused <see cref="HoverText"/> with the game's delays and placement.
/// </summary>
/// <remarks>
/// The game keeps one tooltip object and moves it under the top canvas of whatever shows it. Shown
/// for a panel, it moved into the panel canvas, which outlives the world, and after a server change
/// the game wrote every tooltip's text into that old object and showed its new one empty. The mod
/// therefore only reads the game's tooltip, once, to copy its frame.
/// </remarks>
public static class Tooltip
{
    // UIToolTipManager's delays before a tooltip shows.
    private const float MouseDelay = 0.25f;
    private const float GamepadDelay = 0.5f;
    // UIShowToolTip's gap between a tooltip and what it describes, in screen pixels.
    private const float Gap = 12f;
    // Above the game's canvases and below the settings window.
    private const int SortingOrder = 32730;

    private static readonly List<HoverText> Sources = new();

    private static GameObject _layer;
    private static Canvas _canvas;
    private static RectTransform _frame;
    private static TextMeshProUGUI _text;
    private static HoverText _target;
    private static float _showAt;
    private static bool _visible;

    internal static void Register(HoverText source) => Sources.Add(source);

    /// <summary>Shows, moves or hides the tooltip for this frame. Runs after the features update.</summary>
    public static void Update()
    {
        if (!EnsureFrame())
            return;

        var target = Find(out bool gamepad);
        if (target != _target)
        {
            // Moving from one element to the next while a tooltip shows switches at once, as in the game.
            _showAt = _visible ? 0f : Time.unscaledTime + (gamepad ? GamepadDelay : MouseDelay);
            _target = target;
        }

        if (target == null || Time.unscaledTime < _showAt)
        {
            Hide();
            return;
        }

        if (_text.text != target.Text)
        {
            _text.text = target.Text;
            LayoutRebuilder.ForceRebuildLayoutImmediate(_frame);
        }

        if (!_visible)
        {
            _frame.gameObject.SetActive(true);
            _visible = true;
            LayoutRebuilder.ForceRebuildLayoutImmediate(_frame);
        }

        Place(target.Rect, gamepad);
    }

    public static void Dispose()
    {
        if (_layer != null) Object.Destroy(_layer);
        _layer = null;
        _frame = null;
        _text = null;
        _target = null;
        _visible = false;
        Sources.Clear();
    }

    // The hovered source, or with a gamepad the focused one. Sources whose element is gone drop out.
    private static HoverText Find(out bool gamepad)
    {
        gamepad = GameManager.isUsingGamepad;
        var manager = UIToolTipManager.singleton;
        if (manager == null || manager.IsDisplayBlocked)
            return null;

        var selected = gamepad && EventSystem.current != null ? EventSystem.current.currentSelectedGameObject : null;
        for (int i = Sources.Count - 1; i >= 0; i--)
        {
            var source = Sources[i];
            if (source.Rect == null)
            {
                Sources.RemoveAt(i);
                continue;
            }

            if (string.IsNullOrEmpty(source.Text) || !source.Rect.gameObject.activeInHierarchy)
                continue;
            if (gamepad ? selected != null && source.Rect.gameObject == selected : Pointer.Over(source.Rect))
                return source;
        }

        return null;
    }

    private static void Hide()
    {
        if (!_visible) return;
        _frame.gameObject.SetActive(false);
        _visible = false;
    }

    // Copies the game's tooltip frame once, at the first frame of a world, before the game has
    // shown it for anything. The copy keeps the frame's background, layout and text style.
    private static bool EnsureFrame()
    {
        var shortcuts = UIShortcuts.singleton;
        var game = shortcuts != null ? shortcuts.toolTip : null;
        if (_frame != null)
        {
            // The copy draws at the scale of the game's interface.
            var gameCanvas = game != null ? game.GetComponentInParent<Canvas>(true) : null;
            if (gameCanvas != null) _canvas.scaleFactor = gameCanvas.rootCanvas.scaleFactor;
            return gameCanvas != null;
        }

        if (game == null)
            return false;

        _layer = new GameObject("PC_Tooltip");
        Object.DontDestroyOnLoad(_layer);
        _canvas = _layer.AddComponent<Canvas>();
        _canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        _canvas.sortingOrder = SortingOrder;

        var copy = Object.Instantiate(game, _layer.transform, false);
        copy.name = "PC_TooltipFrame";
        copy.SetActive(false);
        // The game's own placement script and any canvas would act on the copy.
        foreach (var keep in copy.GetComponents<UIKeepInScreen>()) Object.DestroyImmediate(keep);
        foreach (var canvas in copy.GetComponents<Canvas>()) Object.DestroyImmediate(canvas);
        var group = copy.GetComponent<CanvasGroup>();
        if (group != null)
        {
            group.alpha = 1f;
            group.blocksRaycasts = false;
            group.interactable = false;
        }

        _text = MainText(copy);
        if (_text == null)
        {
            Object.Destroy(_layer);
            _layer = null;
            return false;
        }

        // Only the background and the main text stay. The game adds item icons and footers there.
        foreach (var child in copy.GetComponentsInChildren<Transform>(true))
            if (child != copy.transform && child != _text.transform && !_text.transform.IsChildOf(child))
                Object.DestroyImmediate(child.gameObject);
        foreach (var graphic in copy.GetComponentsInChildren<Graphic>(true)) graphic.raycastTarget = false;

        _frame = copy.GetComponent<RectTransform>();
        _visible = false;
        return true;
    }

    // The text the game writes a tooltip into, found the way UIShowToolTip finds it.
    private static TextMeshProUGUI MainText(GameObject frame)
    {
        foreach (var text in frame.GetComponentsInChildren<TextMeshProUGUI>(true))
        {
            var parent = text.transform.parent;
            if (!text.name.StartsWith("ItemTooltip") && (parent == null || parent.name != "ItemTooltipFooter"))
                return text;
        }

        return null;
    }

    // UIShowToolTip's placement: beside the element with a gamepad, otherwise above or below it,
    // whichever first fits on screen without covering the element.
    private static void Place(RectTransform anchor, bool beside)
    {
        var around = ScreenRect(anchor);
        var frame = ScreenRect(_frame);
        var size = frame.size;

        var right = OnScreen(new Rect(around.xMax + Gap, around.center.y - size.y * 0.5f, size.x, size.y));
        var left = OnScreen(new Rect(around.xMin - Gap - size.x, around.center.y - size.y * 0.5f, size.x, size.y));
        var above = OnScreen(new Rect(around.center.x - size.x * 0.5f, around.yMax + Gap, size.x, size.y));
        var below = OnScreen(new Rect(around.center.x - size.x * 0.5f, around.yMin - Gap - size.y, size.x, size.y));
        var chosen = beside ? Choose(around, right, left, above, below) : Choose(around, above, below, right, left);

        _frame.position += (Vector3)(chosen.min - frame.min);
    }

    // A rect's extent in screen pixels, which on an overlay canvas are world units. GetWorldCorners
    // cannot fill a managed array through the interop, so the corners come from TransformPoint.
    private static Rect ScreenRect(RectTransform rect)
    {
        var local = rect.rect;
        Vector2 min = rect.TransformPoint(local.min);
        Vector2 max = rect.TransformPoint(local.max);
        return Rect.MinMaxRect(min.x, min.y, max.x, max.y);
    }

    private static Rect Choose(Rect around, Rect first, Rect second, Rect third, Rect fourth)
    {
        float a = Overlap(around, first), b = Overlap(around, second), c = Overlap(around, third), d = Overlap(around, fourth);
        if (a <= 0f) return first;
        if (b <= 0f) return second;
        if (c <= 0f) return third;
        if (d <= 0f) return fourth;
        var best = first;
        float least = a;
        if (b < least) { best = second; least = b; }
        if (c < least) { best = third; least = c; }
        if (d < least) best = fourth;
        return best;
    }

    private static float Overlap(Rect first, Rect second)
    {
        float width = Mathf.Min(first.xMax, second.xMax) - Mathf.Max(first.xMin, second.xMin);
        float height = Mathf.Min(first.yMax, second.yMax) - Mathf.Max(first.yMin, second.yMin);
        return width > 0f && height > 0f ? width * height : 0f;
    }

    private static Rect OnScreen(Rect rect)
    {
        rect.position = new Vector2(
            Mathf.Clamp(rect.x, 0f, Mathf.Max(0f, Screen.width - rect.width)),
            Mathf.Clamp(rect.y, 0f, Mathf.Max(0f, Screen.height - rect.height)));
        return rect;
    }
}
