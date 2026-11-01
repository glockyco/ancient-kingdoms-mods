using PocketCompendium.Core.Game;
using PocketCompendium.Core.Settings;
using PocketCompendium.Core.Ui;
using PocketCompendium.Features.BossSkills.Model;
using UnityEngine;

namespace PocketCompendium.Features.BossSkills;

/// <summary>Which tiers the skill panel shows, its placement and row size, on the Boss skills settings page.</summary>
public sealed class BossSkillsSettings
{
    public BossSkillsSettings(SettingsPage page)
    {
        Tiers = page.Chips("Tiers", "Monsters with only a basic attack never appear, because they have no skills to count down.",
            ("Bosses", true, "Bosses", () => GameAccess.TierColor(Tier.Boss)),
            ("Elites", true, "Elites", () => GameAccess.TierColor(Tier.Elite)),
            ("Fabled", true, "Fabled", () => GameAccess.TierColor(Tier.Fabled)));
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
    public ChipsSetting Tiers { get; }

    /// <summary>Whether the panel shows monsters of <paramref name="tier"/>.</summary>
    public bool Shows(Tier tier) => Tiers.Chips[tier switch { Tier.Boss => 0, Tier.Elite => 1, _ => 2 }].Setting.Value;
}
