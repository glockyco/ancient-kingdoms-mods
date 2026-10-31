using PocketCompendium.Core.Settings;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.Controls;

namespace PocketCompendium.Core.Ui;

/// <summary>Settings for every panel at once and for the settings window itself.</summary>
public sealed class LayoutSettings
{
    // F1 to F5 select party members and F10 belongs to the game. F12 is Steam's screenshot key.
    public enum Key
    {
        F6,
        F7,
        F8,
        F9,
        F11,
    }

    public LayoutSettings()
    {
        Page = new SettingsPage("Layout", "Layout");
        LockAll = Page.Toggle(
            "LockAll",
            false,
            "Lock all panels",
            "Panels ignore drags and hide their resize grips. Each panel's own lock still works while this is off.");
        SettingsKey = Page.Choice(
            "SettingsKey",
            Key.F8,
            "Settings key",
            "Opens and closes this window, except while you type in a text field.",
            (Key.F6, "F6"),
            (Key.F7, "F7"),
            (Key.F8, "F8"),
            (Key.F9, "F9"),
            (Key.F11, "F11"));
        Page.Action(
            "Panels",
            "Reset",
            "Moves every panel back to its default place and size, and unlocks it.",
            PanelHost.ResetAll);

        PanelHost.LockAll = () => LockAll.Value;
    }

    public SettingsPage Page { get; }
    public ToggleSetting LockAll { get; }
    public ChoiceSetting<Key> SettingsKey { get; }

    /// <summary>The keyboard key that opens the settings window, or null without a keyboard.</summary>
    public KeyControl SettingsKeyControl
    {
        get
        {
            var keyboard = Keyboard.current;
            if (keyboard == null) return null;
            return SettingsKey.Value switch
            {
                Key.F6 => keyboard.f6Key,
                Key.F7 => keyboard.f7Key,
                Key.F9 => keyboard.f9Key,
                Key.F11 => keyboard.f11Key,
                _ => keyboard.f8Key,
            };
        }
    }
}
