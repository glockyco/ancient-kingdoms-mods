using MelonLoader;

namespace BestiaryRevealer;

internal static class BestiaryRevealerSettings
{
    private static MelonPreferences_Entry<bool> _autoAddMissingBestiaryEntries;

    internal static bool AutoAddMissingBestiaryEntries => _autoAddMissingBestiaryEntries != null && _autoAddMissingBestiaryEntries.Value;

    internal static void Initialize()
    {
        var category = MelonPreferences.CreateCategory("BestiaryRevealer");
        _autoAddMissingBestiaryEntries = category.CreateEntry(
            "AutoAddMissingBestiaryEntries",
            false,
            "Scan loaded bosses, elites, and fabled monsters and add missing Bestiary entries at runtime.");
    }
}
