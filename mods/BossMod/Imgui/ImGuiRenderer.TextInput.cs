using System;
using System.Collections.Concurrent;
using ImGuiNET;
using UnityEngine.InputSystem;

namespace BossMod.Imgui;

/// <summary>
/// Forwards text input from the InputSystem keyboard's <c>onTextInput</c> event
/// into ImGui's input character queue. The event fires on a thread we don't
/// control, so we buffer through a <see cref="ConcurrentQueue{T}"/> and drain
/// inside <c>UpdateInput</c> on the main thread.
///
/// IL2CPP delegate note: <c>Keyboard.onTextInput</c>'s add/remove methods take
/// <c>Il2CppSystem.Action&lt;char&gt;</c>, NOT a managed <c>System.Action&lt;char&gt;</c>.
/// Wrap the managed lambda explicitly via the cast operator that
/// Il2CppInterop generates on <c>Il2CppSystem.Action&lt;T&gt;</c>.
/// </summary>
public sealed partial class ImGuiRenderer
{
    private readonly ConcurrentQueue<char> _charQueue = new();
    private Keyboard _hookedKeyboard;
    private Il2CppSystem.Action<char> _textHandler;

    private void HookTextInput()
    {
        var keyboard = Keyboard.current;
        if (keyboard == null || keyboard == _hookedKeyboard) return;

        Action<char> handler = ch =>
        {
            // Filter: printable ASCII + extended; strip control codes except whitespace.
            if (ch >= ' ' && ch != '\u007f') _charQueue.Enqueue(ch);
        };
        _textHandler = (Il2CppSystem.Action<char>)handler;
        keyboard.add_onTextInput(_textHandler);
        _hookedKeyboard = keyboard;
    }

    private void UnhookTextInput()
    {
        if (_hookedKeyboard != null && _textHandler != null)
            _hookedKeyboard.remove_onTextInput(_textHandler);
        _hookedKeyboard = null;
        _textHandler = null;
    }

    private void DrainCharsInto(ImGuiIOPtr io)
    {
        while (_charQueue.TryDequeue(out var c))
            io.AddInputCharacter(c);
    }
}
