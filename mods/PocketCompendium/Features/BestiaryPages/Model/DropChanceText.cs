using System;
using System.Globalization;

namespace PocketCompendium.Features.BestiaryPages.Model;

/// <summary>A drop's chance per kill as its slot shows it, with one decimal: 0.492 is "49.2%".</summary>
internal static class DropChanceText
{
    public static string Percent(double chance)
    {
        double percent = chance * 100.0;
        // A chance that rounds to 0.0% still exists, and a chance short of certain is not 100%.
        if (percent > 0 && percent < 0.05) return "<0.1%";
        if (percent < 100 && percent >= 99.95) return ">99.9%";
        return Math.Round(percent, 1, MidpointRounding.AwayFromZero).ToString("0.0", CultureInfo.InvariantCulture) + "%";
    }
}
