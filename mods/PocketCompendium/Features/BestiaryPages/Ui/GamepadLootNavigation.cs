using System;
using System.Collections.Generic;
using HarmonyLib;
using Il2Cpp;
using PocketCompendium.Core;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace PocketCompendium.Features.BestiaryPages.Ui;

/// <summary>
/// Lets a gamepad reach the Bestiary page's loot slots, the buttons below the page and the cards
/// of the Skills window. The game gives loot slots no focus and shows their tooltips only on mouse
/// hover. Each loot slot gets a Selectable, the right edge of the monster grid leads to the loot,
/// the right edge of the page leads to the cards, and a focused slot or card shows its tooltip the
/// way the game's own gamepad lists do (UINpcTradingSlot).
/// </summary>
internal static class GamepadLootNavigation
{
    private const string BestiaryTab = "Bestiary";

    private static GameObject _tooltipOwner;

    /// <summary>
    /// Patches the journal's gamepad navigation. Patched apart from the attribute patches, so a
    /// future game version without this method leaves mouse behaviour intact.
    /// </summary>
    internal static void Patch(HarmonyLib.Harmony harmony)
    {
        try
        {
            var target = AccessTools.Method(typeof(UIJournal), nameof(UIJournal.RefreshGamepadNavigation));
            if (target == null)
                throw new MissingMethodException(nameof(UIJournal), nameof(UIJournal.RefreshGamepadNavigation));

            harmony.Patch(
                target,
                prefix: new HarmonyMethod(typeof(GamepadLootNavigation), nameof(KeepFocusOnPage)),
                postfix: new HarmonyMethod(typeof(GamepadLootNavigation), nameof(LinkPageToGrid)));
        }
        catch (Exception ex)
        {
            Log.Warning($"Gamepad focus for Bestiary loot is unavailable: {ex.Message}");
        }
    }

    internal static void EnsureSelectable(UIBestiaryLoot slot)
    {
        if (slot == null || slot.GetComponent<Selectable>() != null)
            return;

        var selectable = slot.gameObject.AddComponent<Selectable>();
        selectable.transition = Selectable.Transition.None;
        var navigation = new Navigation();
        navigation.mode = Navigation.Mode.Explicit;
        selectable.navigation = navigation;
    }

    /// <summary>Shows the tooltip of a loot slot or skill card that just gained gamepad focus.</summary>
    internal static void Update()
    {
        var selected = GameManager.isUsingGamepad ? CurrentSelection() : null;
        if (selected == _tooltipOwner)
            return;

        _tooltipOwner = null;
        if (selected == null)
            return;

        foreach (var slot in BestiaryLootRenderer.ShownSlots)
        {
            if (slot == null || slot.gameObject != selected)
                continue;
            if (slot.tooltip != null && slot.tooltip.enabled)
                slot.tooltip.ShowToolTip();
            _tooltipOwner = selected;
            return;
        }

        if (SkillsPanelController.ShowFocused(selected))
            _tooltipOwner = selected;
    }

    // RefreshGamepadNavigation moves focus back to a grid slot every frame. While the focus is on
    // the page, the method is skipped; the grid keeps the navigation it set on earlier frames.
    // An exception would reach the game on every frame, so a failure stops Bestiary pages and the
    // game keeps its own navigation.
    private static bool KeepFocusOnPage(UIJournal __instance)
    {
        try
        {
            return !(DrivesPage(__instance) && IsPageSelectable(CurrentSelection()));
        }
        catch (Exception ex)
        {
            BestiaryPagesFeature.ReportFailure(ex);
            return true;
        }
    }

    private static void LinkPageToGrid(UIJournal __instance)
    {
        try
        {
            LinkPage(__instance);
        }
        catch (Exception ex)
        {
            BestiaryPagesFeature.ReportFailure(ex);
        }
    }

    private static void LinkPage(UIJournal journal)
    {
        if (!DrivesPage(journal))
            return;

        var loot = LootSelectables();
        var buttons = PageButtons();
        var entries = SkillsPanelController.VisibleEntries;
        if (loot.Count == 0 && buttons.Count == 0)
            return;

        var entryCount = GameManager.singleton != null && GameManager.singleton.elitesBosses != null
            ? Math.Min(GameManager.singleton.elitesBosses.Count, journal.content.childCount)
            : 0;
        var gridColumns = Math.Max(1, journal.content.GetComponent<GridLayoutGroup>()?.constraintCount ?? 1);
        var gridEntry = CurrentGridEntry(journal, entryCount);
        var first = loot.Count > 0 ? loot[0] : buttons[0];
        var firstButton = buttons.Count > 0 ? buttons[0] : null;
        var firstCard = entries.Count > 0 ? entries[0] : null;

        for (var i = 0; i < entryCount; i++)
        {
            if (i % gridColumns != gridColumns - 1 && i != entryCount - 1)
                continue;
            var slot = journal.content.GetChild(i).GetComponent<UIJournalSlot>();
            if (slot == null || slot.button == null)
                continue;
            var navigation = slot.button.navigation;
            navigation.selectOnRight = first;
            slot.button.navigation = navigation;
        }

        var lootColumns = LootColumns();
        for (var i = 0; i < loot.Count; i++)
        {
            var column = i % lootColumns;
            var navigation = new Navigation();
            navigation.mode = Navigation.Mode.Explicit;
            navigation.selectOnLeft = column > 0 ? loot[i - 1] : gridEntry;
            navigation.selectOnRight = column < lootColumns - 1 && i + 1 < loot.Count ? loot[i + 1] : firstCard;
            navigation.selectOnUp = i >= lootColumns ? loot[i - lootColumns] : null;
            navigation.selectOnDown = i + lootColumns < loot.Count ? loot[i + lootColumns] : firstButton;
            loot[i].navigation = navigation;
        }

        for (var i = 0; i < buttons.Count; i++)
        {
            var navigation = new Navigation();
            navigation.mode = Navigation.Mode.Explicit;
            navigation.selectOnUp = loot.Count > 0 ? loot[(loot.Count - 1) / lootColumns * lootColumns] : null;
            navigation.selectOnLeft = i > 0 ? buttons[i - 1] : gridEntry;
            navigation.selectOnRight = i + 1 < buttons.Count ? buttons[i + 1] : firstCard;
            buttons[i].navigation = navigation;
        }

        // The cards run top to bottom, and left leads back to the button that opens them.
        var back = buttons.Count > 0 ? buttons[buttons.Count - 1] : first;
        for (var i = 0; i < entries.Count; i++)
        {
            var navigation = new Navigation();
            navigation.mode = Navigation.Mode.Explicit;
            navigation.selectOnUp = i > 0 ? entries[i - 1] : null;
            navigation.selectOnDown = i + 1 < entries.Count ? entries[i + 1] : null;
            navigation.selectOnLeft = back;
            entries[i].navigation = navigation;
        }
    }

    // Same conditions under which the journal drives its grid with a gamepad. While the feature
    // is off, both patches pass through.
    private static bool DrivesPage(UIJournal journal) =>
        BestiaryPagesFeature.Active &&
        journal != null &&
        journal.panel != null &&
        journal.currentTab == BestiaryTab &&
        GameManager.isUsingGamepad &&
        GameManager.isLocalPlayerActive &&
        !GameManager.IsGamepadSkillbarAssignmentActive &&
        GameManager.IsGamepadMenuFocused(journal.panel) &&
        !UIUtils.AnyInputActive();

    private static bool IsPageSelectable(GameObject selected)
    {
        if (selected == null)
            return false;

        foreach (var button in PageButtons())
        {
            if (button.gameObject == selected)
                return true;
        }

        foreach (var slot in BestiaryLootRenderer.ShownSlots)
        {
            if (slot != null && slot.gameObject == selected)
                return true;
        }

        foreach (var entry in SkillsPanelController.VisibleEntries)
        {
            if (entry != null && entry.gameObject == selected)
                return true;
        }

        return false;
    }

    // The buttons below the page, left to right as they stand.
    private static List<Selectable> PageButtons()
    {
        var buttons = new List<Selectable>(2);
        var watch = WatchButtonController.VisibleButton;
        if (watch != null) buttons.Add(watch);
        var skills = SkillsPanelController.VisibleButton;
        if (skills != null) buttons.Add(skills);
        return buttons;
    }

    private static List<Selectable> LootSelectables()
    {
        var selectables = new List<Selectable>();
        foreach (var slot in BestiaryLootRenderer.ShownSlots)
        {
            if (slot == null || !slot.gameObject.activeInHierarchy)
                continue;
            var selectable = slot.GetComponent<Selectable>();
            if (selectable != null)
                selectables.Add(selectable);
        }

        return selectables;
    }

    private static int LootColumns()
    {
        var detail = UIBestiaryDetail.singleton;
        var grid = detail != null && detail.loot0 != null
            ? detail.loot0.transform.parent.GetComponent<GridLayoutGroup>()
            : null;
        return Math.Max(1, grid != null ? grid.constraintCount : 1);
    }

    private static Selectable CurrentGridEntry(UIJournal journal, int entryCount)
    {
        Selectable first = null;
        for (var i = 0; i < entryCount; i++)
        {
            var slot = journal.content.GetChild(i).GetComponent<UIJournalSlot>();
            if (slot == null || slot.button == null || !slot.isActiveAndEnabled || !slot.button.IsInteractable())
                continue;
            if (slot.IsCurrentEntry)
                return slot.button;
            first ??= slot.button;
        }

        return first;
    }

    private static GameObject CurrentSelection() =>
        EventSystem.current != null ? EventSystem.current.currentSelectedGameObject : null;
}
