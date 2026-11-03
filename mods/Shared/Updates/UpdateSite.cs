// Oblivious, because Pocket Compendium's game references hide the compiler's nullable attributes.
#nullable disable
using System;

namespace AncientKingdomsMods.Shared.Updates;

/// <summary>The website Pocket Compendium downloads its mod list and new versions from.</summary>
internal static class UpdateSite
{
    public const string Default = "https://ancient-kingdoms.compendiums.org";

#if UPDATE_TEST
    // Only a build made with -p:UpdateTest=true, which also carries a test key, reads another address,
    // so a release build can't be pointed anywhere else.
    public static string Address => Environment.GetEnvironmentVariable("POCKET_COMPENDIUM_TEST_SITE") ?? Default;
#else
    public static string Address => Default;
#endif
}
