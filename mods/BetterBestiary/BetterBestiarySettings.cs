using MelonLoader;

namespace BetterBestiary;

internal static class BetterBestiarySettings
{
    private static MelonPreferences_Entry<bool> _autoAddMissingBestiaryEntries;

    internal static bool AutoAddMissingBestiaryEntries => _autoAddMissingBestiaryEntries != null && _autoAddMissingBestiaryEntries.Value;

    internal static void Initialize()
    {
        var category = MelonPreferences.CreateCategory("BetterBestiary");
        _autoAddMissingBestiaryEntries = category.CreateEntry(
            "AutoAddMissingBestiaryEntries",
            false,
            "Scan loaded bosses, elites, and fabled monsters and add missing Bestiary entries at runtime.");
    }
}
