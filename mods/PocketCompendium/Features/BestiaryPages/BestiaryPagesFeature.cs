using System;
using System.Collections.Generic;
using Il2Cpp;
using PocketCompendium.Core;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Settings;
using PocketCompendium.Core.Tracking;
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
            "Skills panel",
            "Shows the monster's skills beside its page, with what each does, its cast time and cooldown. Hover over a skill for its full mechanics.");
        DropChances = Settings.Toggle(
            "DropChances",
            true,
            "Drop chances",
            "Shows each item's chance to drop when you kill the monster. A Fatecharm in your main inventory raises the chances shown.");
        // Undiscovered monsters lived here before it applied everywhere. General starts from it.
        _earlierUndiscovered = Settings.Stored("UndiscoveredMonsters", true);
        UndiscoveredDrops = Settings.Toggle(
            "UndiscoveredDrops",
            true,
            "Undiscovered drops",
            "Lets you hover over drops you haven't found yet for their tooltip, where the game shows only a black silhouette.");
        _skillsOpen = Settings.Stored("SkillsWindowOpen", true);
        _instance = this;
    }

    public ToggleSetting SkillsButton { get; }
    public ToggleSetting DropChances { get; }
    public ToggleSetting UndiscoveredDrops { get; }

    private readonly MelonLoader.MelonPreferences_Entry<bool> _skillsOpen;
    private readonly MelonLoader.MelonPreferences_Entry<bool> _earlierUndiscovered;

    /// <summary>The value this page saved for Undiscovered monsters, which General starts from.</summary>
    public bool EarlierUndiscoveredMonsters => _earlierUndiscovered.Value;

    /// <summary>Whether the Skills window opens with a page, until the player closes it.</summary>
    internal static bool SkillsWindowOpen
    {
        get => _instance == null || _instance._skillsOpen.Value;
        set
        {
            if (_instance == null || _instance._skillsOpen.Value == value) return;
            _instance._skillsOpen.Value = value;
            _instance.Settings.Save();
        }
    }

    /// <summary>Whether the feature runs. Its patches pass through while it does not.</summary>
    internal static bool Active => _instance != null && _instance.Running && !_instance.Failed;

    internal static bool ShowSkillsButton => _instance != null && _instance.SkillsButton.Value;

    internal static bool ShowDropChances => _instance == null || _instance.DropChances.Value;

    internal static bool ShowUndiscoveredDrops => _instance == null || _instance.UndiscoveredDrops.Value;

    protected internal override void Enable()
    {
        if (_patched) return;

        Patching.Apply(typeof(UIBestiaryDetailPatch));
        Patching.Apply(typeof(UIJournalPatch));
        GamepadLootNavigation.Patch(Patching.Harmony);
        _patched = true;
    }

    protected internal override void Disable()
    {
        var detail = UIBestiaryDetail.singleton;
        if (detail != null)
            BestiaryLootRenderer.RestoreGameLayout(detail);
        BestiaryLootRenderer.Forget();
        SkillsPanelController.Hide();
        WatchButtonController.Hide();
    }

    // The slots added to the page and the Skills window live inside the game's Bestiary, which
    // goes with the World scene.
    protected internal override void OnSceneUnloaded(string sceneName)
    {
        if (sceneName != "World") return;
        BestiaryLootRenderer.Forget();
        SkillsPanelController.Forget();
    }

    protected internal override void Update()
    {
        BestiaryAltClickHandler.Update();
        GamepadLootNavigation.Update();
    }

    /// <summary>
    /// Whether Pocket Compendium draws this monster's page, rather than the game. A monster the
    /// player has not discovered keeps the game's ??? page while Undiscovered is off.
    /// </summary>
    internal static bool Draws(Monster monster) =>
        Active && monster != null && !FailedMonsters.Contains(monster.nameEntity ?? string.Empty) &&
        Discovery.Shown(monster.nameEntity);

    internal static void ReportPageFailure(Monster monster, Exception ex)
    {
        var name = monster != null ? monster.nameEntity ?? string.Empty : string.Empty;
        if (!FailedMonsters.Add(name))
            return;

        Log.Error($"Bestiary pages could not draw the page of '{name}' and leave it to the game for this session", ex);
    }

    /// <summary>Stops the feature after a failure in its patches outside the drawing of one page.</summary>
    internal static void ReportFailure(Exception ex) => _instance?.Fail(ex);
}
