using MelonLoader;
using PocketCompendium.Core.Settings;
using PocketCompendium.Features.BossSkills.Model;

namespace PocketCompendium.Features.BossSkills;

/// <summary>The skill panel's placement and layout, kept on the Boss skills settings page.</summary>
public sealed class BossSkillsSettings
{
    private readonly SettingsPage _page;

    public readonly MelonPreferences_Entry<float> PanelX;
    public readonly MelonPreferences_Entry<float> PanelY;
    public readonly MelonPreferences_Entry<bool> Locked;
    public readonly MelonPreferences_Entry<bool> Compact;

    public BossSkillsSettings(SettingsPage page)
    {
        _page = page;
        PanelX = page.Stored("PanelX", Tuning.PanelDefaultX);
        PanelY = page.Stored("PanelY", Tuning.PanelDefaultY);
        Locked = page.Stored("Locked", false);
        Compact = page.Stored("Compact", false);
    }

    public void Save() => _page.Save();
}
