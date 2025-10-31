using System.Collections.Generic;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class BuffExporter : BaseExporter
{
    public BuffExporter(MelonLogger.Instance logger, string exportPath)
        : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting buffs/debuffs...");

        var type = Il2CppType.Of<Il2Cpp.BuffSkill>();
        var buffs = Resources.FindObjectsOfTypeAll(type);

        var buffList = new List<BuffData>();

        foreach (var obj in buffs)
        {
            var buff = obj.TryCast<Il2Cpp.BuffSkill>();
            if (buff == null || string.IsNullOrEmpty(buff.name))
                continue;

            var buffData = new BuffData
            {
                id = buff.name.ToLowerInvariant().Replace(" ", "_"),
                name = buff.nameSkill ?? buff.name,
                duration_base = buff.buffTime.baseValue,
                duration_per_level = buff.buffTime.bonusPerLevel,
                remain_after_death = buff.remainAfterDeath,
                category = buff.categoryBuff ?? "unknown",
                is_invisibility = buff.invisibility,
                is_poison_debuff = buff.isPoisonDebuff,
                is_fire_debuff = buff.isFireDebuff,
                is_cold_debuff = buff.isColdDebuff,
                is_disease_debuff = buff.isDiseaseDebuff,
                is_melee_debuff = buff.isMeleeDebuff,
                is_cleanse = buff.isCleanseSpell,
                is_dispel = buff.isDispel,
                is_ward = buff.isWard,
                is_blindness = buff.isBlindness
            };

            buffList.Add(buffData);
        }

        WriteJson(buffList, "buffs.json");
        Logger.Msg($"✓ Exported {buffList.Count} buffs/debuffs");
    }
}
