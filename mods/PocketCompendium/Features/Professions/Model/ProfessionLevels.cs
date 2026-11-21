using System;
using System.Collections.Generic;

namespace PocketCompendium.Features.Professions.Model;

/// <summary>
/// How the Professions panel writes a level and picks what it shows, apart from the game, so tests
/// can link it.
/// </summary>
public static class ProfessionLevels
{
    // UIProfessions.Update counts a level from 0.9999 as full and writes it as "100".
    private const float FullFrom = 0.9999f;

    /// <summary>Whether <paramref name="fraction"/>, from 0 to 1 as the game keeps it, is full.</summary>
    public static bool Maxed(float fraction) => fraction >= FullFrom;

    /// <summary>The level as the game's Professions tab writes it, without its "/ 100".</summary>
    public static string Text(float fraction) => Maxed(fraction) ? "100" : (fraction * 100f).ToString("N2");

    /// <summary>
    /// Fills <paramref name="shown"/> with the indexes of the professions to show, in order: the
    /// watched ones while <paramref name="watchedOnly"/>, and every one when none is watched.
    /// </summary>
    public static void Select(int count, Func<int, bool> watched, bool watchedOnly, List<int> shown)
    {
        shown.Clear();
        if (watchedOnly)
            for (int index = 0; index < count; index++)
                if (watched(index))
                    shown.Add(index);

        if (shown.Count > 0) return;
        for (int index = 0; index < count; index++) shown.Add(index);
    }
}
