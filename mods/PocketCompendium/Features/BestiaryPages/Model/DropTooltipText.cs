namespace PocketCompendium.Features.BestiaryPages.Model;

/// <summary>
/// The lines Pocket Compendium adds under a drop's item tooltip. No game references, so the test
/// project compiles this file directly.
/// </summary>
internal static class DropTooltipText
{
    /// <summary>A drop the zone's Fatecharm raises: both chances and the charm's cost.</summary>
    public static string Fatecharm(double chance, double raised, string fatecharm) =>
        DropChanceText.Percent(chance) + " per kill.\n" +
        DropChanceText.Percent(raised) + " with the " + fatecharm + " in your main inventory. The kill uses it up.";

    /// <summary>An item the table lists several times. Each entry rolls on its own.</summary>
    public static string Copies(int copies) => "One kill can give up to " + copies + ".";

    /// <summary>A Forgotten Altar reward's quality, by quality 1 to 4.</summary>
    public enum AltarTier { Normal, Magic, Epic, Legendary }

    // Source: DefaultEvent.cs:236-237. The activator's level plus veteran points picks the reward:
    // below 40 normal, 40 to 49 magic, 50 to 149 epic, 150 or more legendary. Veteran points are
    // earned only at the level cap. Same wording as the website's formatAltarRequirement.
    public static string Altar(AltarTier tier, int levelCap)
    {
        const int Magic = 40, Epic = 50, Legendary = 150;
        string condition = tier switch
        {
            AltarTier.Normal => "below level " + Magic,
            AltarTier.Magic => "level " + Magic + " - " + (Epic - 1),
            AltarTier.Epic => "level " + levelCap + " with " + (Epic - levelCap) + " - " + (Legendary - 1 - levelCap) + " veteran points",
            _ => "level " + levelCap + " with " + (Legendary - levelCap) + " or more veteran points",
        };
        return "Only when the player who starts the altar is " + condition + ".";
    }
}
