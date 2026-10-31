using PocketCompendium.Core.Settings;
using PocketCompendium.Core.Ui;
using PocketCompendium.Features.BossSkills.Model;
using UnityEngine;

namespace PocketCompendium.Features.BossSkills;

/// <summary>The skill panel's placement and row size, on the Boss skills settings page.</summary>
public sealed class BossSkillsSettings
{
    public BossSkillsSettings(SettingsPage page)
    {
        Compact = page.Toggle(
            "Compact",
            false,
            "Compact rows",
            "Smaller rows and icons. The panel's compact button switches this too.");
        Panel = new PanelHost(
            page,
            "Panel",
            PanelResize.Scale,
            new Vector2(Tuning.PanelDefaultX, Tuning.PanelDefaultY),
            Vector2.zero,
            Vector2.zero,
            Vector2.zero);
    }

    public ToggleSetting Compact { get; }
    public PanelHost Panel { get; }
}
