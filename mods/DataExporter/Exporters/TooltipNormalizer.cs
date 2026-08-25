using System.Collections.Generic;

namespace DataExporter.Exporters;

/// <summary>
/// Removes the emphasis a rendered tooltip carries about one player.
///
/// The game renders a tooltip for the character in front of it. UsableItem
/// reddens a required level that character has not reached, and EquipmentItem
/// reddens a required class it cannot use. Neither statement describes the item,
/// and no character can use every class of item, so no choice of exporting
/// character makes the rendering correct.
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
}
