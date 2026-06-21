#nullable disable
namespace BetterBestiary.Skills;

/// <summary>
/// Mirror of the website's <c>LinearValue</c> (<c>{ base_value, bonus_per_level }</c>):
/// a skill stat that scales linearly with skill level. Stored as <see cref="double"/>
/// so it covers both the integer (<c>LinearStatBonus</c>) and float
/// (<c>LinearStatBonusFloat</c>) game types without losing fractional speeds/percent.
/// </summary>
internal sealed class LinearValue
{
    public double base_value { get; set; }
    public double bonus_per_level { get; set; }

    public LinearValue()
    {
    }

    public LinearValue(double baseValue, double bonusPerLevel)
    {
        base_value = baseValue;
        bonus_per_level = bonusPerLevel;
    }
}
