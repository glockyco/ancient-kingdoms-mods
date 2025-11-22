using System.Collections.Generic;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class AltarExporter : BaseExporter
{
    public AltarExporter(MelonLogger.Instance logger, string exportPath) : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting altars...");

        var altarList = new List<AltarData>();

        // Load zone triggers for position-based zone detection
        var zoneTriggerType = Il2CppType.Of<Il2Cpp.ZoneTrigger>();
        var zoneTriggers = Resources.FindObjectsOfTypeAll(zoneTriggerType);
        Logger.Msg($"Found {zoneTriggers.Length} zone triggers for zone detection");

        // Export Forgotten Altars (EventAltar)
        var forgottenAltarType = Il2CppType.Of<Il2Cpp.EventAltar>();
        var forgottenAltars = Resources.FindObjectsOfTypeAll(forgottenAltarType);
        Logger.Msg($"Found {forgottenAltars.Length} forgotten altar objects total");

        foreach (var obj in forgottenAltars)
        {
            var altar = obj.TryCast<Il2Cpp.EventAltar>();
            if (altar == null || altar.gameObject == null || !altar.gameObject.scene.IsValid())
                continue;

            var altarData = ExportForgottenAltar(altar, zoneTriggers);
            if (altarData != null)
                altarList.Add(altarData);
        }

        // Export Avatar Altars (AvatarEventAltar)
        var avatarAltarType = Il2CppType.Of<Il2Cpp.AvatarEventAltar>();
        var avatarAltars = Resources.FindObjectsOfTypeAll(avatarAltarType);
        Logger.Msg($"Found {avatarAltars.Length} avatar altar objects total");

        foreach (var obj in avatarAltars)
        {
            var altar = obj.TryCast<Il2Cpp.AvatarEventAltar>();
            if (altar == null || altar.gameObject == null || !altar.gameObject.scene.IsValid())
                continue;

            var altarData = ExportAvatarAltar(altar, zoneTriggers);
            if (altarData != null)
                altarList.Add(altarData);
        }

        WriteJson(altarList, "altars.json");
        Logger.Msg($"✓ Exported {altarList.Count} altars");
    }

    private AltarData ExportForgottenAltar(Il2Cpp.EventAltar altar, Il2CppSystem.Object[] zoneTriggers)
    {
        if (altar.defaultEvent == null)
        {
            Logger.Warning($"EventAltar missing defaultEvent reference, skipping");
            return null;
        }

        var defaultEvent = altar.defaultEvent;
        var nameText = altar.nameOverlay != null ? altar.nameOverlay.text : "Unknown Altar";
        var altarId = $"altar_{SanitizeId(nameText)}_{altar.GetInstanceID()}";

        var altarData = new AltarData
        {
            id = altarId,
            name = nameText,
            type = "forgotten",
            zone_id = GetZoneIdFromPosition(altar.transform.position, zoneTriggers),
            position = new Position(
                altar.transform.position.x,
                altar.transform.position.y,
                altar.transform.position.z
            ),
            min_level_required = defaultEvent.minLevelRequired,
            required_activation_item_id = altar.requiredActivationItem != null
                ? SanitizeId(altar.requiredActivationItem.name)
                : null,
            required_activation_item_name = altar.requiredActivationItem != null
                ? altar.requiredActivationItem.nameItem
                : null,
            init_event_message = defaultEvent.initEventMessage,
            radius_event = defaultEvent.radiusEvent,
            uses_veteran_scaling = true,
            total_waves = defaultEvent.listWavesMonsters != null ? defaultEvent.listWavesMonsters.Count : 0
        };

        // Export rewards
        if (defaultEvent.normalReward != null)
        {
            altarData.reward_normal_id = SanitizeId(defaultEvent.normalReward.name);
            altarData.reward_normal_name = defaultEvent.normalReward.nameItem;
        }
        if (defaultEvent.magicReward != null)
        {
            altarData.reward_magic_id = SanitizeId(defaultEvent.magicReward.name);
            altarData.reward_magic_name = defaultEvent.magicReward.nameItem;
        }
        if (defaultEvent.epicReward != null)
        {
            altarData.reward_epic_id = SanitizeId(defaultEvent.epicReward.name);
            altarData.reward_epic_name = defaultEvent.epicReward.nameItem;
        }
        if (defaultEvent.legendaryReward != null)
        {
            altarData.reward_legendary_id = SanitizeId(defaultEvent.legendaryReward.name);
            altarData.reward_legendary_name = defaultEvent.legendaryReward.nameItem;
        }

        // Export waves
        ExportWaves(defaultEvent.listWavesMonsters, altarData);

        return altarData;
    }

    private AltarData ExportAvatarAltar(Il2Cpp.AvatarEventAltar altar, Il2CppSystem.Object[] zoneTriggers)
    {
        if (altar.avatarEvent == null)
        {
            Logger.Warning($"AvatarEventAltar missing avatarEvent reference, skipping");
            return null;
        }

        var avatarEvent = altar.avatarEvent;
        var nameText = altar.nameOverlay != null ? altar.nameOverlay.text : "Unknown Altar";
        var altarId = $"altar_{SanitizeId(nameText)}_{altar.GetInstanceID()}";

        var altarData = new AltarData
        {
            id = altarId,
            name = nameText,
            type = "avatar",
            zone_id = GetZoneIdFromPosition(altar.transform.position, zoneTriggers),
            position = new Position(
                altar.transform.position.x,
                altar.transform.position.y,
                altar.transform.position.z
            ),
            min_level_required = 0, // Avatar altars don't have level requirement in altar itself
            required_activation_item_id = altar.requiredActivationItem != null
                ? SanitizeId(altar.requiredActivationItem.name)
                : null,
            required_activation_item_name = altar.requiredActivationItem != null
                ? altar.requiredActivationItem.nameItem
                : null,
            init_event_message = avatarEvent.initEventMessage,
            radius_event = avatarEvent.radiusEvent,
            uses_veteran_scaling = false,
            total_waves = avatarEvent.listWavesMonsters != null ? avatarEvent.listWavesMonsters.Count : 0
        };

        // Export waves
        ExportWaves(avatarEvent.listWavesMonsters, altarData);

        return altarData;
    }

    private void ExportWaves(Il2CppSystem.Collections.Generic.List<Il2Cpp.WaveMonsterSpawnEvent> waveList, AltarData altarData)
    {
        if (waveList == null)
            return;

        int totalDuration = 5; // Initial 5 second countdown

        for (int i = 0; i < waveList.Count; i++)
        {
            var wave = waveList[i];
            if (wave == null)
                continue;

            var waveData = new AltarWave
            {
                wave_number = i,
                init_wave_message = wave.initWaveMessage,
                finish_wave_message = wave.finishWaveMessage,
                seconds_before_start = wave.secondsBeforeStart,
                seconds_to_complete_wave = wave.secondsToCompleteWave,
                require_all_monsters_cleared = wave.requireAllMonstersCleared
            };

            // Export wave monsters
            if (wave.waveMonsters != null)
            {
                foreach (var monsterSpawn in wave.waveMonsters)
                {
                    if (monsterSpawn == null || monsterSpawn.monster == null)
                        continue;

                    var monsterData = new AltarWaveMonster
                    {
                        monster_id = SanitizeId(monsterSpawn.monster.name),
                        monster_name = monsterSpawn.monster.nameEntity,
                        base_level = monsterSpawn.level,
                        spawn_location = new Position(
                            monsterSpawn.spawnLocation.x,
                            monsterSpawn.spawnLocation.y,
                            monsterSpawn.spawnLocation.z
                        )
                    };

                    waveData.monsters.Add(monsterData);
                }
            }

            altarData.waves.Add(waveData);

            // Calculate duration
            totalDuration += wave.secondsBeforeStart + wave.secondsToCompleteWave;
        }

        altarData.estimated_duration_seconds = totalDuration;
    }

    private string GetZoneIdFromPosition(UnityEngine.Vector3 position, Il2CppSystem.Object[] zoneTriggers)
    {
        var position2D = new UnityEngine.Vector2(position.x, position.y);

        foreach (var triggerObj in zoneTriggers)
        {
            var trigger = triggerObj.TryCast<Il2Cpp.ZoneTrigger>();
            if (trigger == null || trigger.gameObject == null)
                continue;

            var collider = trigger.GetComponent<UnityEngine.Collider2D>();
            if (collider == null)
                continue;

            if (collider.OverlapPoint(position2D))
            {
                return GetZoneIdFromByte(trigger.idZone);
            }
        }

        return "unknown";
    }

    private string GetZoneIdFromByte(byte zoneId)
    {
        if (Il2Cpp.ZoneInfo.zones != null && Il2Cpp.ZoneInfo.zones.ContainsKey(zoneId))
        {
            var zone = Il2Cpp.ZoneInfo.zones[zoneId];
            if (zone != null && !string.IsNullOrEmpty(zone.name))
            {
                return SanitizeId(zone.name);
            }
        }

        return "unknown";
    }
}
