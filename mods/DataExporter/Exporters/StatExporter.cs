using System;
using System.Linq;
using DataExporter.Models;
using MelonLoader;
using UnityEngine.Localization.Settings;

namespace DataExporter.Exporters;

public sealed class StatExporter : BaseExporter
{
    public StatExporter(MelonLogger.Instance logger, string exportPath) : base(logger, exportPath) { }

    public override void Export()
    {
        StatCatalog.Validate();
        var locale = LocalizationSettings.SelectedLocale;
        if (locale == null)
            throw new InvalidOperationException("Stat vocabulary requires an English selected locale, but no locale is selected.");
        var code = locale.Identifier.Code;
        if (string.IsNullOrEmpty(code) || (code != "en" && !code.StartsWith("en-", StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException($"Stat vocabulary requires an English selected locale, got '{code}'.");

        var stats = StatCatalog.Stats.Select(stat =>
        {
            var itemName = stat.ItemLabel == null ? null : ReadItemName(stat.Id, stat.ItemLabel);
            string name;
            if (stat.SiteName != null)
                name = stat.SiteName;
            else if (stat.NameKey == null)
                name = itemName ?? throw new InvalidOperationException($"Stat '{stat.Id}' has no name source.");
            else
            {
                name = ReadWindowName(stat.Id, stat.NameKey);
                // The character window's pool and attribute titles use capitals. Item labels supply their catalogue capitalization.
                if (stat.Id is "strength" or "constitution" or "dexterity" or "intelligence" or "wisdom" or "charisma" or "mana" or "rage")
                    name = itemName ?? throw new InvalidOperationException($"Stat '{stat.Id}' has no capitalization label.");
            }
            return new StatData
            {
                id = stat.Id,
                name = name,
                name_key = stat.NameKey,
                item_name = itemName,
                item_label = stat.ItemLabel,
                // Source: server-scripts/EquipmentItem.cs:ToolTip — Weapons call Attack Power Base Damage in item comparisons.
                weapon_item_name = stat.Id == "attack_power" ? ReadItemName(stat.Id, "Base Damage") : null,
                override_reason = stat.OverrideReason,
                format = stat.Format,
                min_value = stat.Min,
                max_value = stat.Max,
                pool_id = stat.PoolId,
                per_point_of = stat.PerPointOf ?? Array.Empty<StatPerPointData>(),
                fields = stat.Fields,
            };
        }).ToArray();
        WriteJson(new StatVocabularyData(stats, StatCatalog.NonStatFields), "stats.json");
    }

    private static string ReadWindowName(string statId, string key)
    {
        RequireEntry(statId, key);
        // Source: server-scripts/UICharacterInfo.cs:Update — Character window titles read Localization_String_Table.
        var value = LocalizationSettings.StringDatabase.GetLocalizedString(
            "Localization_String_Table", key, null, FallbackBehavior.DontUseFallback);
        if (string.IsNullOrWhiteSpace(value))
            throw new InvalidOperationException($"Stat '{statId}' localization key '{key}' returned empty text.");
        return value;
    }

    private static string ReadItemName(string statId, string label)
    {
        // Source: server-scripts/ScriptableItem.cs:LocalizedStatLabel — These item label inputs resolve to item.stat localization entries.
        var key = label switch
        {
            "Base Damage" => "base_damage", "Attack Power" => "attack_power", "Spell Power" => "spell_power", "AC" => "armor",
            "Strength" => "strength", "Constitution" => "constitution", "Dexterity" => "dexterity", "Intelligence" => "intelligence",
            "Wisdom" => "wisdom", "Charisma" => "charisma", "Hit Points" => "health", "Mana" => "mana", "Rage" => "rage",
            "Health Regen" => "health_regen", "Mana Regen" => "mana_regen", "Magic Resist" => "magic_resist", "Poison Resist" => "poison_resist",
            "Fire Resist" => "fire_resist", "Cold Resist" => "cold_resist", "Disease Resist" => "disease_resist", "Block Chance" => "block_chance",
            "Accuracy" => "accuracy", "Critical Chance" => "critical_chance", "Critical Resist" => "critical_resist", "Haste" => "haste",
            "Spell Casting Haste" => "spell_haste", "Fear Resist" => "fear_resist",
            _ => throw new InvalidOperationException($"Stat '{statId}' has unknown item label '{label}'."),
        };
        RequireEntry(statId, "item.stat." + key);
        var value = Il2Cpp.ScriptableItem.LocalizedStatLabel(label);
        if (string.IsNullOrWhiteSpace(value))
            throw new InvalidOperationException($"Stat '{statId}' item label '{label}' returned empty text.");
        return value;
    }

    private static void RequireEntry(string statId, string key)
    {
        var entry = LocalizationSettings.StringDatabase.GetTableEntry(
            "Localization_String_Table", key, null, FallbackBehavior.DontUseFallback).Entry;
        if (entry == null || string.IsNullOrWhiteSpace(entry.LocalizedValue))
            throw new InvalidOperationException($"Stat '{statId}' localization key '{key}' is missing or empty in Localization_String_Table.");
    }
}
