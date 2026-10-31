#nullable disable
using System;
using System.Text;

namespace PocketCompendium.Core.Tracking;

/// <summary>
/// Reads the kill notice a dedicated server sends every player for each boss:
/// <c>Killer has slain [[entity:&lt;base64 name&gt;]].</c>, from <c>Monster.OnDeath</c> and
/// <c>EntityNameLocalization.Mark</c>. No game references, so the test project compiles this file directly.
/// </summary>
public static class KillNotice
{
    private const string Slain = " has slain [[entity:";
    private const string End = "]].";

    /// <summary>The canonical name of the slain boss, or null for any other message.</summary>
    public static string SlainName(string message)
    {
        if (message == null || !message.EndsWith(End, StringComparison.Ordinal)) return null;

        int slain = message.LastIndexOf(Slain, StringComparison.Ordinal);
        if (slain <= 0) return null;

        int start = slain + Slain.Length;
        int length = message.Length - End.Length - start;
        if (length <= 0) return null;

        try
        {
            return Encoding.UTF8.GetString(Convert.FromBase64String(message.Substring(start, length)));
        }
        catch (FormatException)
        {
            return null;
        }
    }
}
