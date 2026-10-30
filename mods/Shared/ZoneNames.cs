using System;
using System.Collections.Generic;

namespace AncientKingdomsMods.Shared;

/// <summary>
/// Matches a monster's free-text zone (<c>Monster.zoneMonster</c>) to one of the game's zones.
/// The free text drifts from the zone table: "Molten Summit" names "The Molten Summit", and
/// "The Lone-Lands" names "The Lone-lands". Sub-zones such as "Orc Village" match nothing.
/// No game references, so the test project compiles this file directly.
/// </summary>
public static class ZoneNames
{
    private const string Article = "the ";

    public static int? Match(string zoneText, IEnumerable<KeyValuePair<int, string>> zones)
    {
        var wanted = Normalize(zoneText);
        if (wanted.Length == 0)
            return null;

        foreach (var zone in zones)
        {
            if (Normalize(zone.Value) == wanted)
                return zone.Key;
        }

        return null;
    }

    public static string Normalize(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return string.Empty;

        var trimmed = name.Trim().ToLowerInvariant();
        return trimmed.StartsWith(Article, StringComparison.Ordinal)
            ? trimmed.Substring(Article.Length).TrimStart()
            : trimmed;
    }
}
