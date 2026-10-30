using System.Reflection;

namespace AncientKingdomsMods.Shared;

/// <summary>
/// The commit a mod was built from. The SDK appends it to the informational version
/// (<c>1.0.0+&lt;commit&gt;</c>), and a player's <c>MelonLoader/Latest.log</c> then names the
/// exact build behind a report.
/// </summary>
internal static class ModBuild
{
    public static string Commit(Assembly assembly)
    {
        var version = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion;
        var plus = version == null ? -1 : version.IndexOf('+');
        return plus >= 0 ? version!.Substring(plus + 1) : "unknown";
    }
}
