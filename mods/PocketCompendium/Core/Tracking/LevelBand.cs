namespace PocketCompendium.Core.Tracking;

/// <summary>The game's level colours for a monster's level minus the player's.</summary>
public enum LevelBand
{
    Gray,
    Green,
    White,
    Yellow,
    Red,

    /// <summary>More than 10 levels above, where the game's target frame shows a skull instead of the number.</summary>
    Skull,
}

/// <summary>
/// Copies <c>UITarget</c>'s level colour choice. No game references, so the test project compiles
/// this file directly.
/// </summary>
public static class LevelBands
{
    public static LevelBand Of(int monsterLevel, int playerLevel)
    {
        int difference = monsterLevel - playerLevel;
        if (difference > 10) return LevelBand.Skull;
        if (difference >= 5) return LevelBand.Red;
        if (difference >= 2) return LevelBand.Yellow;
        if (difference >= -1) return LevelBand.White;
        if (difference >= -10) return LevelBand.Green;
        return LevelBand.Gray;
    }
}
