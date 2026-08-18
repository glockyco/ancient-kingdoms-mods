using System;
using System.Collections.Generic;
using HarmonyLib;
using Il2Cpp;

namespace BetterBestiary.Patches;

[HarmonyPatch(typeof(UIBestiaryDetail), "Update")]
internal static class UIBestiaryDetailPatch
{
    private static readonly HashSet<string> TemporaryLootNames = new();
    private static readonly HashSet<string> AddedTemporaryLootNames = new();
    private static string temporaryMonsterName;
    private static bool createdTemporaryEntry;

    [HarmonyPrefix]
    private static void KeepNativeLootTooltipsEnabled(UIBestiaryDetail __instance)
    {
        if (BetterBestiary.IsPatchDisabled)
            return;

        TemporaryLootNames.Clear();
        AddedTemporaryLootNames.Clear();
        temporaryMonsterName = null;
        createdTemporaryEntry = false;

        var journal = UIJournal.singleton;
        if (__instance == null || __instance.monster == null || journal == null ||
            journal.listBossesLootDiscovered == null)
            return;

        var monsterName = __instance.monster.nameEntity;
        if (!journal.listBossesLootDiscovered.TryGetValue(monsterName, out var discovered))
        {
            discovered = new Il2CppSystem.Collections.Generic.HashSet<string>();
            journal.listBossesLootDiscovered[monsterName] = discovered;
            createdTemporaryEntry = true;
        }

        Ui.BestiaryLootRenderer.AddNativeLootNames(__instance.monster, TemporaryLootNames);
        foreach (var itemName in TemporaryLootNames)
        {
            if (discovered.Add(itemName))
                AddedTemporaryLootNames.Add(itemName);
        }

        temporaryMonsterName = monsterName;
    }

    [HarmonyPostfix]
    private static void RestoreNativeLootDiscovery(UIBestiaryDetail __instance)
    {
        try
        {
            var journal = UIJournal.singleton;
            if (journal == null || temporaryMonsterName == null ||
                !journal.listBossesLootDiscovered.TryGetValue(temporaryMonsterName, out var discovered))
                return;

            foreach (var itemName in AddedTemporaryLootNames)
                discovered.Remove(itemName);
            if (createdTemporaryEntry && discovered.Count == 0)
                journal.listBossesLootDiscovered.Remove(temporaryMonsterName);
        }
        finally
        {
            TemporaryLootNames.Clear();
            AddedTemporaryLootNames.Clear();
            temporaryMonsterName = null;
            createdTemporaryEntry = false;
        }
    }

    [HarmonyPostfix]
    private static void RevealAfterVanillaUpdate(UIBestiaryDetail __instance)
    {
        if (BetterBestiary.IsPatchDisabled)
            return;

        try
        {
            Ui.BestiaryDetailRenderer.Reveal(__instance);
            Ui.SkillsPanelController.OnBestiaryUpdate(__instance);
        }
        catch (Exception ex)
        {
            BetterBestiary.ReportPatchException(ex);
        }
    }
}
