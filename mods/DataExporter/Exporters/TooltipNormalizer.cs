using System.Collections.Generic;

namespace DataExporter.Exporters;

/// <summary>
/// Removes values a rendered tooltip reads from one player.
///
/// The game reddens requirements that the player does not meet, and a Gate Scroll
/// names that player's bind-point zone. Those values do not describe the item.
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
}
