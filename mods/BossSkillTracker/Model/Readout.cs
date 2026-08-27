using System.Globalization;

namespace BossSkillTracker.Model;

/// <summary>
/// Formats a countdown so that its width never changes while it runs. A number always carries one
/// decimal and fills a fixed number of columns, so neither a dropped decimal nor a shrinking
/// integer part moves the surrounding text.
/// </summary>
/// <remarks>
/// The padding character is a no-break space, because TMP trims a leading ordinary space.
/// </remarks>
public static class Readout
{
    private const char Pad = '\u00A0';
    private const int Columns = 4;

    /// <summary>A single countdown, as a row shows a remaining cooldown.</summary>
    public static string Seconds(double seconds) => Number(seconds) + "s";

    /// <summary>The span between the exact deadline and the latest the cast is due.</summary>
    public static string Span(double from, double to) => "in " + Number(from) + "-" + Number(to) + "s";

    /// <summary>An upper bound alone, once the deadline has passed.</summary>
    public static string UpTo(double seconds) => "\u2264 " + Number(seconds) + "s";

    private static string Number(double seconds)
    {
        if (seconds < 0) seconds = 0;

        string text = seconds.ToString("0.0", CultureInfo.InvariantCulture);
        return text.Length >= Columns ? text : new string(Pad, Columns - text.Length) + text;
    }
}
