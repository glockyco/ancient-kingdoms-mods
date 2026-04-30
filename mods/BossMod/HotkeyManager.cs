using System;
using System.Collections.Generic;
using UnityEngine.InputSystem;

namespace BossMod;

public sealed class HotkeyManager
{
    private readonly Dictionary<string, Action> _actions = new();
    private bool _f8WasDown;

    public void Register(string actionName, Action action)
    {
        _actions[actionName] = action;
    }

    public void Tick(bool skipActions)
    {
        var keyboard = Keyboard.current;
        bool f8Down = keyboard != null && keyboard.f8Key.isPressed;

        if (!skipActions && f8Down && !_f8WasDown && _actions.TryGetValue("toggle_settings", out var toggleSettings))
        {
            toggleSettings();
        }

        _f8WasDown = f8Down;
    }
}
