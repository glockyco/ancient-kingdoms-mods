namespace PocketCompendium.Core.Settings;

/// <summary>Settings every feature follows, shown first in the settings window.</summary>
public sealed class GeneralSettings
{
    /// <param name="earlierUndiscovered">The value Bestiary pages saved for Undiscovered monsters
    /// before the switch applied everywhere, so a player who switched it off there starts with it
    /// off here.</param>
    public GeneralSettings(bool earlierUndiscovered)
    {
        Page = new SettingsPage("General", "General");
        UndiscoveredMonsters = Page.Toggle(
            "UndiscoveredMonsters",
            true,
            "Undiscovered",
            "Shows the names and pictures of monsters, herbs, ores and fish you haven't discovered yet, where the game shows ??? and a silhouette.",
            initial: earlierUndiscovered);
        Current = this;
    }

    /// <summary>The settings, for features that follow them.</summary>
    public static GeneralSettings Current { get; private set; }

    public SettingsPage Page { get; }
    public ToggleSetting UndiscoveredMonsters { get; }
}
