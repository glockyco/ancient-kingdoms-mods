using System;
using System.Collections.Generic;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public sealed class EquipmentSlotExporter : BaseExporter
{
    public EquipmentSlotExporter(MelonLogger.Instance logger, string exportPath)
        : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting archetype equipment slots...");

        var networkManager = Il2CppMirror.NetworkManager.singleton
            ?? throw new InvalidOperationException("NetworkManager.singleton is unavailable; cannot export player equipment slots.");
        var networkManagerMmo = networkManager.TryCast<Il2Cpp.NetworkManagerMMO>()
            ?? throw new InvalidOperationException("NetworkManager.singleton is not NetworkManagerMMO; cannot export player equipment slots.");
        var playerClasses = networkManagerMmo.playerClasses
            ?? throw new InvalidOperationException("NetworkManagerMMO.playerClasses is unavailable; cannot export player equipment slots.");
        if (playerClasses.Count == 0)
            throw new InvalidOperationException("NetworkManagerMMO.playerClasses is empty; cannot export player equipment slots.");

        var rows = new List<EquipmentSlotData>();
        var playerIds = new HashSet<string>();
        foreach (var player in playerClasses)
        {
            if (player == null)
                throw new InvalidOperationException("NetworkManagerMMO.playerClasses contains a null prefab.");

            var playerId = PlayerClassId(player.name);
            if (!playerIds.Add(playerId))
                throw new InvalidOperationException($"Player class equipment slots contain duplicate owner '{playerId}'.");

            var equipment = player.equipment?.TryCast<Il2Cpp.PlayerEquipment>()
                ?? throw new InvalidOperationException($"Player class '{playerId}' has no PlayerEquipment component.");
            rows.AddRange(EquipmentSlotRows.Create("player", playerId, ReadCategories(equipment.slotInfo, "player", playerId)));
        }

        var ui = Il2Cpp.UIMercenaries.singleton
            ?? throw new InvalidOperationException("UIMercenaries.singleton is unavailable; cannot export mercenary equipment slots.");
        var mercenaryPrefabs = new (string Id, GameObject Prefab)[]
        {
            ("warrior", ui.warriorMercenary),
            ("cleric", ui.clericMercenary),
            ("rogue", ui.rogueMercenary),
            ("wizard", ui.wizardMercenary),
            ("druid", ui.druidMercenary),
            ("ranger", ui.rangerMercenary),
        };

        foreach (var (mercenaryId, prefab) in mercenaryPrefabs)
        {
            if (prefab == null)
                throw new InvalidOperationException($"Mercenary prefab '{mercenaryId}' is unavailable.");

            var pet = prefab.GetComponent<Il2Cpp.Pet>()
                ?? throw new InvalidOperationException($"Mercenary prefab '{mercenaryId}' has no Pet component.");
            var equipment = pet.equipment?.TryCast<Il2Cpp.MercenaryEquipment>()
                ?? throw new InvalidOperationException($"Mercenary prefab '{mercenaryId}' has no MercenaryEquipment component.");
            rows.AddRange(EquipmentSlotRows.Create("mercenary", mercenaryId, ReadCategories(equipment.slotInfo, "mercenary", mercenaryId)));
        }

        var expectedRows = (playerIds.Count + mercenaryPrefabs.Length) * EquipmentSlotRows.SlotCount;
        if (rows.Count != expectedRows)
            throw new InvalidOperationException($"Equipment slot export produced {rows.Count} rows; expected {expectedRows}.");

        WriteJson(rows, "equipment_slots.json");
        Logger.Msg($"Exported {rows.Count} equipment slots for {playerIds.Count} player classes and {mercenaryPrefabs.Length} mercenary archetypes.");
    }

    private static string PlayerClassId(string prefabName)
    {
        if (string.IsNullOrWhiteSpace(prefabName))
            throw new InvalidOperationException("A player class prefab has no name.");

        const string prefix = "player_";
        var id = SanitizeId(prefabName);
        return id.StartsWith(prefix, StringComparison.Ordinal) ? id[prefix.Length..] : id;
    }

    private static string[] ReadCategories(
        Il2CppInterop.Runtime.InteropTypes.Arrays.Il2CppReferenceArray<Il2Cpp.EquipmentInfo> slotInfo,
        string ownerType,
        string ownerId)
    {
        if (slotInfo == null)
            throw new InvalidOperationException($"{ownerType} '{ownerId}' has no equipment slot table.");

        var categories = new string[slotInfo.Length];
        for (var slotIndex = 0; slotIndex < slotInfo.Length; slotIndex++)
            categories[slotIndex] = slotInfo[slotIndex].requiredCategory;
        return categories;
    }
}
