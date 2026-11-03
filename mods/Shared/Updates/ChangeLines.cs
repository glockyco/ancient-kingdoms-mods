// Oblivious, because Pocket Compendium's game references hide the compiler's nullable attributes.
#nullable disable
using System.Collections.Generic;
using System.Linq;

namespace AncientKingdomsMods.Shared.Updates;

/// <summary>The lines a notice shows for what changed between two versions.</summary>
internal static class ChangeLines
{
    /// <summary>The most lines a start-screen card shows before it says how many more changes there are.</summary>
    public const int CardLines = 3;

    /// <summary>
    /// The changes of every release after <paramref name="since"/> up to and including <paramref name="upTo"/>,
    /// newest release first, one line each. With more than one release, each line starts with its version.
    /// When there are more lines than <paramref name="maxLines"/>, the last line says how many more there are.
    /// </summary>
    public static IReadOnlyList<string> Between(IReadOnlyList<Release> releases, ModVersion since, ModVersion upTo, int maxLines = int.MaxValue)
    {
        var shown = releases
            .Where(release => release.Version > since && release.Version <= upTo)
            .OrderByDescending(release => release.Version)
            .ToList();
        var lines = new List<string>();
        foreach (var release in shown)
            foreach (var change in release.Changes)
                lines.Add(shown.Count > 1 ? release.Version + ": " + change : change);
        if (lines.Count <= maxLines) return lines;

        int more = lines.Count - maxLines;
        lines.RemoveRange(maxLines, more);
        lines.Add(more == 1 ? "And 1 more change." : "And " + more + " more changes.");
        return lines;
    }
}
