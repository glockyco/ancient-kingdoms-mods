using MelonLoader;

namespace BetterBestiary;

internal static class BetterBestiarySettings
{
    private static MelonPreferences_Entry<bool> _autoAddMissingBestiaryEntries;
    private static MelonPreferences_Entry<bool> _showSkillsPanelButton;

    internal static bool AutoAddMissingBestiaryEntries => _autoAddMissingBestiaryEntries != null && _autoAddMissingBestiaryEntries.Value;

    internal static bool ShowSkillsPanelButton => _showSkillsPanelButton == null || _showSkillsPanelButton.Value;

    internal static void Initialize()
    {
        var category = MelonPreferences.CreateCategory("BetterBestiary");
        _autoAddMissingBestiaryEntries = category.CreateEntry(
            "AutoAddMissingBestiaryEntries",
            false,
            "Scan loaded bosses, elites, and fabled monsters and add missing Bestiary entries at runtime.");
        _showSkillsPanelButton = category.CreateEntry(
            "ShowSkillsPanelButton",
            true,
            "Show the Skills button and side panel on the Bestiary detail page.");
    }
}
