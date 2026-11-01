using System;
using System.Collections.Generic;
using Il2Cpp;
using PocketCompendium.Core;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Ui;
using PocketCompendium.Core.Settings;
using PocketCompendium.Features.BestiaryPages.Patches;
using PocketCompendium.Features.BestiaryPages.Ui;

namespace PocketCompendium.Features.BestiaryPages;

/// <summary>
/// Every monster's full Bestiary page: lore, stats, loot with tooltips, a Skills panel, a Watch
/// button for tracked monsters, gamepad focus on loot, and Alt-click to open a monster's page.
/// </summary>
public sealed class BestiaryPagesFeature : Feature
{
    private static BestiaryPagesFeature _instance;

    // Monsters whose page failed to draw. The game draws their page for the rest of the session.
    private static readonly HashSet<string> FailedMonsters = new(StringComparer.Ordinal);

    private bool _patched;

    public BestiaryPagesFeature()
        : base("BestiaryPages", "Bestiary pages", "Shows every monster's full Bestiary page, with its lore, stats, drops and skills.")
    {
        SkillsButton = Settings.Toggle(
            "SkillsButton",
            true,
            "Skills button",
            "Shows the Skills button and side panel on Bestiary pages.");
        _instance = this;
    }

    public ToggleSetting SkillsButton { get; }

    public override UnityEngine.Sprite Icon => Icons.BookOpen;

    /// <summary>Whether the feature runs. Its patches pass through while it does not.</summary>
    internal static bool Active => _instance != null && _instance.Running && !_instance.Failed;

    internal static bool ShowSkillsButton => _instance != null && _instance.SkillsButton.Value;

    protected internal override void Enable()
    {
        if (_patched) return;

        Patching.Apply(typeof(UIBestiaryDetailPatch));
        GamepadLootNavigation.Patch(Patching.Harmony);
        _patched = true;
    }

    protected internal override void Disable()
    {
        var detail = UIBestiaryDetail.singleton;
        if (detail != null)
            BestiaryLootRenderer.RestoreGameLayout(detail);
        SkillsPanelController.Hide();
        WatchButtonController.Hide();
    }

    protected internal override void Update()
    {
        BestiaryAltClickHandler.Update();
        GamepadLootNavigation.Update();
    }

    /// <summary>Whether Pocket Compendium draws this monster's page, rather than the game.</summary>
    internal static bool Draws(Monster monster) =>
        Active && monster != null && !FailedMonsters.Contains(monster.nameEntity ?? string.Empty);

    internal static void ReportPageFailure(Monster monster, Exception ex)
    {
        var name = monster != null ? monster.nameEntity ?? string.Empty : string.Empty;
        if (!FailedMonsters.Add(name))
            return;

        Log.Error($"Bestiary pages could not draw the page of '{name}' and leave it to the game for this session: {ex}");
    }
}
