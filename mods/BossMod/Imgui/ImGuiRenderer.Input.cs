using ImGuiNET;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.Controls;

namespace BossMod.Imgui;

/// <summary>
/// Bridges the new Unity InputSystem (<c>Mouse.current</c> / <c>Keyboard.current</c>)
/// into ImGui's IO. Text input is handled separately in <see cref="HookTextInput"/>.
/// </summary>
public sealed partial class ImGuiRenderer
{
    private void UpdateInput(ImGuiIOPtr io)
    {
        var mouse = Mouse.current;
        var keyboard = Keyboard.current;
        if (mouse == null || keyboard == null) return;

        // Mouse position — Unity Y is bottom-up, ImGui is top-down.
        var mpos = mouse.position.ReadValue();
        io.AddMousePosEvent(mpos.x, Screen.height - mpos.y);

        io.AddMouseButtonEvent(0, mouse.leftButton.isPressed);
        io.AddMouseButtonEvent(1, mouse.rightButton.isPressed);
        io.AddMouseButtonEvent(2, mouse.middleButton.isPressed);

        var scroll = mouse.scroll.ReadValue();
        if (scroll.x != 0f || scroll.y != 0f)
            io.AddMouseWheelEvent(scroll.x / 120f, scroll.y / 120f);

        // Modifier keys — ImGui.NET 1.89.1 has no ModCtrl/ModShift/ModAlt
        // aliases (added upstream in v1.89.5+). Set the individual L/R keys;
        // ImGui internally treats them as the modifier set.
        io.AddKeyEvent(ImGuiKey.LeftCtrl,   keyboard.leftCtrlKey.isPressed);
        io.AddKeyEvent(ImGuiKey.RightCtrl,  keyboard.rightCtrlKey.isPressed);
        io.AddKeyEvent(ImGuiKey.LeftShift,  keyboard.leftShiftKey.isPressed);
        io.AddKeyEvent(ImGuiKey.RightShift, keyboard.rightShiftKey.isPressed);
        io.AddKeyEvent(ImGuiKey.LeftAlt,    keyboard.leftAltKey.isPressed);
        io.AddKeyEvent(ImGuiKey.RightAlt,   keyboard.rightAltKey.isPressed);

        // Common keys (extend as needed by Settings widgets)
        Map(io, ImGuiKey.Tab, keyboard.tabKey);
        Map(io, ImGuiKey.LeftArrow, keyboard.leftArrowKey);
        Map(io, ImGuiKey.RightArrow, keyboard.rightArrowKey);
        Map(io, ImGuiKey.UpArrow, keyboard.upArrowKey);
        Map(io, ImGuiKey.DownArrow, keyboard.downArrowKey);
        Map(io, ImGuiKey.PageUp, keyboard.pageUpKey);
        Map(io, ImGuiKey.PageDown, keyboard.pageDownKey);
        Map(io, ImGuiKey.Home, keyboard.homeKey);
        Map(io, ImGuiKey.End, keyboard.endKey);
        Map(io, ImGuiKey.Insert, keyboard.insertKey);
        Map(io, ImGuiKey.Delete, keyboard.deleteKey);
        Map(io, ImGuiKey.Backspace, keyboard.backspaceKey);
        Map(io, ImGuiKey.Space, keyboard.spaceKey);
        Map(io, ImGuiKey.Enter, keyboard.enterKey);
        Map(io, ImGuiKey.Escape, keyboard.escapeKey);
        Map(io, ImGuiKey.A, keyboard.aKey);
        Map(io, ImGuiKey.C, keyboard.cKey);
        Map(io, ImGuiKey.V, keyboard.vKey);
        Map(io, ImGuiKey.X, keyboard.xKey);

        DrainCharsInto(io);  // Task 7
    }

    private static void Map(ImGuiIOPtr io, ImGuiKey key, KeyControl ctrl)
        => io.AddKeyEvent(key, ctrl.isPressed);
}
