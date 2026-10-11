using System;
using System.Collections.Generic;
using System.Globalization;

namespace DataExporter;

/// <summary>Stable identities for scene placements, with collisions rejected per export set.</summary>
public sealed class PlacementIds
{
    private readonly HashSet<string> _ids = new(StringComparer.Ordinal);

    public static string Format(string prefix, double x, double y)
    {
        var roundedX = Math.Round(x, MidpointRounding.AwayFromZero);
        var roundedY = Math.Round(y, MidpointRounding.AwayFromZero);
        // Explicitly normalize negative zero, independently of runtime formatting rules.
        if (roundedX == 0) roundedX = 0;
        if (roundedY == 0) roundedY = 0;
        return $"{prefix}_{roundedX.ToString("0", CultureInfo.InvariantCulture)}_{roundedY.ToString("0", CultureInfo.InvariantCulture)}";
    }

    public string Register(string prefix, double x, double y)
    {
        var id = Format(prefix, x, y);
        if (!_ids.Add(id))
            throw new InvalidOperationException($"Duplicate placement ID '{id}': multiple objects round to the same whole-world-unit position.");
        return id;
    }
}
