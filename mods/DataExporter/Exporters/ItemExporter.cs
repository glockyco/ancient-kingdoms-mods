using System.Collections.Generic;
using System.Linq;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class ItemExporter : BaseExporter
{
    public ItemExporter(MelonLogger.Instance logger, string exportPath) : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting items...");

        var type = IL2CPPType.Of<Il2Cpp.ScriptableItem>();
        var items = Resources.FindObjectsOfTypeAll(type);

        var itemList = new List<ItemData>();

        foreach (var obj in items)
        {
            var scriptableItem = obj.TryCast<Il2Cpp.ScriptableItem>();
            if (scriptableItem == null || string.IsNullOrEmpty(scriptableItem.name))
                continue;

            var itemData = new ItemData
            {
                id = scriptableItem.name.ToLowerInvariant().Replace(" ", "_"),
                name = scriptableItem.nameItem ?? scriptableItem.name,
                type = DetermineItemType(scriptableItem),
                quality = GetQualityName(scriptableItem.quality),
                level_required = 0, // ScriptableItem doesn't have level requirement directly
                buy_price = (int)scriptableItem.buyPrice,
                sell_price = (int)scriptableItem.sellPrice,
                tradable = scriptableItem.tradable,
                is_quest_item = scriptableItem.isOnlyQuestItem,
                icon_path = scriptableItem.image_name ?? "",
                tooltip = scriptableItem.ToolTip(false, false) ?? ""
            };

            // Try to cast to EquipmentItem for stats
            var equipItem = obj.TryCast<Il2Cpp.EquipmentItem>();
            if (equipItem != null)
            {
                itemData.weapon_category = equipItem.category ?? "";
                itemData.slot = equipItem.category ?? ""; // Slot is same as category in this game
                itemData.level_required = equipItem.requiredLevel.Get(1); // Get level requirement at skill level 1

                // Parse required class
                if (!string.IsNullOrEmpty(equipItem.requiredClass))
                {
                    var classes = equipItem.requiredClass.Split(',');
                    foreach (var cls in classes)
                    {
                        var trimmed = cls.Trim();
                        if (!string.IsNullOrEmpty(trimmed))
                        {
                            itemData.class_required.Add(trimmed);
                        }
                    }
                }

                // Export stats
                itemData.stats = new ItemStats
                {
                    damage = equipItem.damageBonus,
                    magic_damage = equipItem.magicDamageBonus,
                    defense = equipItem.defenseBonus,
                    magic_resist = equipItem.magicResistBonus,
                    strength = equipItem.strengthBonus,
                    dexterity = equipItem.dexterityBonus,
                    constitution = equipItem.constitutionBonus,
                    intelligence = equipItem.intelligenceBonus,
                    wisdom = equipItem.wisdomBonus,
                    charisma = equipItem.charismaBonus,
                    health_bonus = equipItem.healthBonus,
                    mana_bonus = equipItem.manaBonus,
                    critical_chance = equipItem.criticalChanceBonus,
                    block_chance = equipItem.blockChanceBonus,
                    haste = equipItem.hasteBonus,
                    fire_resist = equipItem.fireResistBonus,
                    ice_resist = equipItem.coldResistBonus,
                    poison_resist = equipItem.poisonResistBonus
                };
            }

            itemList.Add(itemData);
        }

        WriteJson(itemList, "items.json");
        Logger.Msg($"✓ Exported {itemList.Count} items");
    }

    private string DetermineItemType(Il2Cpp.ScriptableItem item)
    {
        var equipItem = item.TryCast<Il2Cpp.EquipmentItem>();
        if (equipItem != null)
        {
            return "equipment";
        }

        var usableItem = item.TryCast<Il2Cpp.UsableItem>();
        if (usableItem != null)
        {
            return "usable";
        }

        return "general";
    }

    private string GetQualityName(byte quality)
    {
        return quality switch
        {
            0 => "common",
            1 => "uncommon",
            2 => "rare",
            3 => "epic",
            4 => "legendary",
            _ => "common"
        };
    }
}
