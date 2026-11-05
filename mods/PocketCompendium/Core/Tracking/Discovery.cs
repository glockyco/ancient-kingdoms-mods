using Il2Cpp;
using PocketCompendium.Core.Settings;

namespace PocketCompendium.Core.Tracking;

/// <summary>
/// Whether a monster shows with its name and portrait. The game hides a monster until its
/// Bestiary has an entry for it. The General setting Undiscovered monsters shows such monsters
/// anyway, on every surface.
/// </summary>
internal static class Discovery
{
    /// <summary>Whether the player's Bestiary has an entry for the monster.</summary>
    public static bool Known(string key)
    {
        var player = Player.localPlayer;
        return player != null && player.bossesKilled != null && player.bossesKilled.ContainsKey(key);
    }

    /// <summary>Whether to show the monster's name and portrait.</summary>
    public static bool Shown(string key) =>
        GeneralSettings.Current == null || GeneralSettings.Current.UndiscoveredMonsters.Value || Known(key);
}
