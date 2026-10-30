using MelonLoader;

namespace BetterBestiary;

internal static class BetterBestiarySettings
{
    private static MelonPreferences_Entry<bool> _showSkillsPanelButton;

    internal static bool ShowSkillsPanelButton => _showSkillsPanelButton == null || _showSkillsPanelButton.Value;

    internal static void Initialize()
    {
        var category = MelonPreferences.CreateCategory("BetterBestiary");
        _showSkillsPanelButton = category.CreateEntry(
            "ShowSkillsPanelButton",
            true,
            "Show the Skills button and side panel on the Bestiary detail page.");
    }
}
