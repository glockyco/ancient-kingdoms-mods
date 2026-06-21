using System.Text.RegularExpressions;

namespace BetterBestiary.Data;

/// <summary>
/// Mirrors DataExporter's <c>BaseExporter.SanitizeId</c> (mods/DataExporter/Exporters/BaseExporter.cs)
/// so the mod derives the SAME skill id the exporter wrote into skill-summaries.json.
/// Keep in sync; the parity test in tests/BetterBestiary.Tests/SkillIdTests.cs enforces it.
/// </summary>
internal static class SkillId
{
    public static string Sanitize(string input)
    {
        if (string.IsNullOrEmpty(input))
            return input;

        var sanitized = input.ToLowerInvariant().Replace(" ", "_");
        sanitized = Regex.Replace(sanitized, @"[^a-z0-9_\-]", "");
        return sanitized;
    }
}
