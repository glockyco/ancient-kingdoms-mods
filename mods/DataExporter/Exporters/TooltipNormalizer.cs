using System;
using System.Collections.Generic;

namespace DataExporter.Exporters;

/// <summary>
/// Removes values a rendered tooltip reads from one player.
///
/// The game reddens requirements that the player does not meet, a Gate Scroll
/// names that player's bind-point zone, and a fragment reports that player's
/// inventory progress. Those values do not describe the item.
///
/// Only the given tokens lose their wrapper. A tooltip template can author red
/// text of its own, and 145 of them do.
/// </summary>
internal static class TooltipNormalizer
{
    private const string Open = "<color=red>";
    private const string Close = "</color>";

    /// <summary>
    /// The tooltip with the red wrapper removed from each given token.
    /// </summary>
    public static string WithoutPlayerEmphasis(string tooltip, IEnumerable<string> tokens)
    {
        if (string.IsNullOrEmpty(tooltip) || tokens == null)
            return tooltip;

        var result = tooltip;
        foreach (var token in tokens)
        {
            if (string.IsNullOrEmpty(token))
                continue;

            result = result.Replace(Open + token + Close, token);
        }

        return result;
    }

    /// <summary>
    /// Replaces the player's rendered bind-point zone with the generic label.
    /// </summary>
    public static string WithGenericBindPoint(
        string tooltip,
        string renderedBindPoint,
        string genericBindPoint)
    {
        if (string.IsNullOrEmpty(tooltip)
            || string.IsNullOrEmpty(renderedBindPoint)
            || string.IsNullOrEmpty(genericBindPoint))
        {
            return tooltip;
        }

        return tooltip.Replace(
            "[" + renderedBindPoint + "]",
            "[" + genericBindPoint + "]");
    }

    /// <summary>
    /// Replaces fragment inventory progress with the amount the item requires.
    /// </summary>
    public static string WithRequiredFragmentCount(
        string tooltip,
        string requiredCount)
    {
        if (string.IsNullOrEmpty(tooltip) || string.IsNullOrEmpty(requiredCount))
            return tooltip;

        var completed = "<b><color=#00FF00>"
            + requiredCount
            + " / "
            + requiredCount
            + "</color></b>";
        var result = tooltip.Replace(completed, requiredCount);

        const string incompleteOpen = "<b><color=#FF0000>";
        const string incompleteMiddle = "</color></b> / ";
        var start = result.IndexOf(incompleteOpen, StringComparison.Ordinal);
        if (start < 0)
            return result;

        var middle = result.IndexOf(
            incompleteMiddle,
            start + incompleteOpen.Length,
            StringComparison.Ordinal);
        if (middle < 0)
            return result;

        var requiredStart = middle + incompleteMiddle.Length;
        var requiredEnd = requiredStart + requiredCount.Length;
        if (requiredEnd > result.Length
            || string.CompareOrdinal(
                result,
                requiredStart,
                requiredCount,
                0,
                requiredCount.Length) != 0
            || (requiredEnd < result.Length && char.IsDigit(result[requiredEnd])))
        {
            return result;
        }

        return result.Remove(start, requiredEnd - start).Insert(start, requiredCount);
    }
}
