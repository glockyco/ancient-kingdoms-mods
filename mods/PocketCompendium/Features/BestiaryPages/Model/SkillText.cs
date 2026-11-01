using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace PocketCompendium.Features.BestiaryPages.Model;

/// <summary>
/// Numbers and units in the Skills panel's sentences and hover texts: "1,625", "1.5 s", "75%",
/// "5 yd", "4 to 8 s". No game references, so the test project compiles this file directly.
/// </summary>
internal static class SkillText
{
    private static readonly CultureInfo Invariant = CultureInfo.InvariantCulture;

    /// <summary>A number with thousands separators and at most two decimals: 1625 is "1,625", 1.5 is "1.5".</summary>
    public static string Number(double value) => value.ToString("#,##0.##", Invariant);

    /// <summary>A share as a percentage: 0.75 is "75%", 0.009 is "0.9%".</summary>
    public static string Percent(double share) => Number(Math.Round(share * 100.0, 2)) + "%";

    public static string Seconds(double seconds) => Number(seconds) + " s";

    public static string Yards(double yards) => Number(yards) + " yd";

    /// <summary>"4 to 8 s", or "2 s" when both ends are equal.</summary>
    public static string Range(double low, double high, string unit) =>
        low == high ? Number(low) + " " + unit : Number(low) + " to " + Number(high) + " " + unit;

    /// <summary>"a, b and c".</summary>
    public static string JoinAnd(IReadOnlyList<string> items)
    {
        if (items.Count == 0) return string.Empty;
        if (items.Count == 1) return items[0];
        var text = new StringBuilder(items[0]);
        for (var i = 1; i < items.Count; i++)
            text.Append(i == items.Count - 1 ? " and " : ", ").Append(items[i]);
        return text.ToString();
    }

    /// <summary>The text with its first letter in upper case.</summary>
    public static string Capitalize(string text) =>
        string.IsNullOrEmpty(text) ? text : char.ToUpperInvariant(text[0]) + text.Substring(1);
}
