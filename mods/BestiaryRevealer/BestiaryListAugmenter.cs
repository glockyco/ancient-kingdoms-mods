using System;
using System.Collections.Generic;
using System.Linq;
using Il2Cpp;
using Il2CppInterop.Runtime;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace BestiaryRevealer;

internal static class BestiaryListAugmenter
{
    private const string WorldSceneName = "World";
    private static bool _loggedSkippedScene;
    private static bool _loggedAllPresent;
    private static bool _loggedNoLoadedMonsters;
    private static bool _hasScannedWorldScene;

    internal static void AddLoadedMissingEntries()
    {
        if (!BestiaryRevealerSettings.AutoAddMissingBestiaryEntries)
            return;

        if (_hasScannedWorldScene)
            return;

        var activeScene = SceneManager.GetActiveScene().name;
        if (activeScene != WorldSceneName)
        {
            if (!_loggedSkippedScene)
            {
                _loggedSkippedScene = true;
                BestiaryRevealer.LogMessage($"Auto-add scan skipped: active scene is '{activeScene}', not '{WorldSceneName}'. Open the Bestiary in the main game scene after monsters are loaded.");
            }
            return;
        }

        var gameManager = GameManager.singleton;
        if (gameManager == null || gameManager.elitesBosses == null)
            return;

        var existingNames = new HashSet<string>(StringComparer.Ordinal);
        foreach (var existing in gameManager.elitesBosses)
        {
            if (existing != null && !string.IsNullOrEmpty(existing.nameEntity))
                existingNames.Add(existing.nameEntity);
        }

        var candidatesByName = new Dictionary<string, Monster>(StringComparer.Ordinal);
        var type = Il2CppType.Of<Monster>();
        var objects = Resources.FindObjectsOfTypeAll(type);
        if (objects.Length == 0)
        {
            if (!_loggedNoLoadedMonsters)
            {
                _loggedNoLoadedMonsters = true;
                BestiaryRevealer.LogMessage("Auto-add scan found no loaded Monster objects; will retry the next time the Bestiary is opened.");
            }
            return;
        }

        _hasScannedWorldScene = true;
        _loggedNoLoadedMonsters = false;

        foreach (var obj in objects)
        {
            var monster = obj.TryCast<Monster>();
            if (!IsCandidate(monster) || existingNames.Contains(monster.nameEntity) || candidatesByName.ContainsKey(monster.nameEntity))
                continue;

            candidatesByName.Add(monster.nameEntity, monster);
        }

        if (candidatesByName.Count == 0)
        {
            if (!_loggedAllPresent)
            {
                _loggedAllPresent = true;
                BestiaryRevealer.LogMessage($"All loaded boss, elite, and fabled monsters are already in the Bestiary list. Scanned {objects.Length} loaded Monster objects.");
            }
            return;
        }

        var addedNames = new List<string>();
        foreach (var monster in candidatesByName.Values.OrderBy(monster => monster.nameEntity, StringComparer.Ordinal))
        {
            gameManager.elitesBosses.Add(monster);
            existingNames.Add(monster.nameEntity);
            addedNames.Add(monster.nameEntity);
        }

        BestiaryRevealer.LogMessage($"Auto-added {addedNames.Count} missing Bestiary entries: {string.Join(", ", addedNames)}");
        _loggedAllPresent = false;
    }

    private static bool IsCandidate(Monster monster)
    {
        return monster != null &&
               !string.IsNullOrEmpty(monster.nameEntity) &&
               (monster.isBoss || monster.isElite || monster.isFabled) &&
               !monster.isForgotttenAltarEvent;
    }
}
