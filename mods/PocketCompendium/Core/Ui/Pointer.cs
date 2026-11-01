using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;

namespace PocketCompendium.Core.Ui;

/// <summary>
/// Mouse input for Pocket Compendium's own controls. The settings window updates before the
/// panels, and whatever handles a press claims it, so a click lands on the topmost control only.
/// The game's interface draws over the panels, so a control takes the pointer only where no other
/// canvas covers it.
/// </summary>
public static class Pointer
{
    private static readonly Il2CppSystem.Collections.Generic.List<RaycastResult> Hits = new();

    private static int _claimedFrame = -1;
    private static int _topFrame = -1;
    private static GameObject _top;
    private static EventSystem _eventSystem;
    private static PointerEventData _event;

    public static Vector2 Position => Mouse.current != null ? Mouse.current.position.ReadValue() : Vector2.zero;

    /// <summary>The left button went down this frame and nothing above has handled it.</summary>
    public static bool Pressed =>
        Mouse.current != null && Mouse.current.leftButton.wasPressedThisFrame && _claimedFrame != Time.frameCount;

    public static bool Held => Mouse.current != null && Mouse.current.leftButton.isPressed;

    public static bool Released => Mouse.current != null && Mouse.current.leftButton.wasReleasedThisFrame;

    /// <summary>Wheel movement this frame, in notches, positive away from the player.</summary>
    public static float Scroll => Mouse.current != null ? Mouse.current.scroll.ReadValue().y / 120f : 0f;

    public static bool Shift =>
        Keyboard.current != null && (Keyboard.current.leftShiftKey.isPressed || Keyboard.current.rightShiftKey.isPressed);

    /// <summary>Marks this frame's press as handled.</summary>
    public static void Claim() => _claimedFrame = Time.frameCount;

    /// <summary>
    /// Whether the pointer is over <paramref name="rect"/> and the topmost interface element there
    /// belongs to the same canvas, so a game window or the chat over a panel takes the pointer.
    /// </summary>
    public static bool Over(RectTransform rect)
    {
        if (rect == null || !rect.gameObject.activeInHierarchy || !RectTransformUtility.RectangleContainsScreenPoint(rect, Position, null))
            return false;

        var top = TopElement();
        if (top == null) return true;
        var canvas = rect.GetComponentInParent<Canvas>();
        return canvas == null || top.transform.IsChildOf(canvas.transform);
    }

    /// <summary>Claims and reports a press on <paramref name="rect"/>.</summary>
    public static bool Clicked(RectTransform rect)
    {
        if (!Pressed || !Over(rect)) return false;
        Claim();
        return true;
    }

    // The topmost interface element under the pointer, from the raycast the game's UI uses. One
    // raycast a frame serves every control.
    private static GameObject TopElement()
    {
        if (_topFrame == Time.frameCount) return _top;
        _topFrame = Time.frameCount;
        _top = null;

        var system = EventSystem.current;
        if (system == null) return null;
        if (_eventSystem != system)
        {
            _eventSystem = system;
            _event = new PointerEventData(system);
        }

        _event.position = Position;
        Hits.Clear();
        system.RaycastAll(_event, Hits);
        if (Hits.Count > 0) _top = Hits[0].gameObject;
        return _top;
    }
}
