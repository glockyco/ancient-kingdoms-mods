using UnityEngine;
using UnityEngine.InputSystem;

namespace PocketCompendium.Core.Ui;

/// <summary>
/// Mouse input for Pocket Compendium's own controls. The settings window updates before the
/// panels, and whatever handles a press claims it, so a click lands on the topmost control only.
/// </summary>
public static class Pointer
{
    private static int _claimedFrame = -1;

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

    public static bool Over(RectTransform rect) =>
        rect != null && rect.gameObject.activeInHierarchy && RectTransformUtility.RectangleContainsScreenPoint(rect, Position, null);

    /// <summary>Claims and reports a press on <paramref name="rect"/>.</summary>
    public static bool Clicked(RectTransform rect)
    {
        if (!Pressed || !Over(rect)) return false;
        Claim();
        return true;
    }
}
