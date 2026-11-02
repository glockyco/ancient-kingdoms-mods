#nullable disable
using System;

namespace PocketCompendium.Core.Tracking;

/// <summary>
/// Reads the message the game sends the player who renews a dungeon at a Renewal Sage:
/// <c>Trolls Cave has been renewed!</c>, from <c>Player.UserCode_CmdResetDungeon</c>. No game
/// references, so the test project compiles this file directly.
/// </summary>
public static class RenewalNotice
{
    private const string Renewed = " has been renewed!";

    /// <summary>The renewed dungeon's name as the game's zone table has it, or null for any other message.</summary>
    public static string ZoneName(string message)
    {
        if (message == null || !message.EndsWith(Renewed, StringComparison.Ordinal)) return null;

        var name = message.Substring(0, message.Length - Renewed.Length).Trim();
        return name.Length > 0 ? name : null;
    }
}
