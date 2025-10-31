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

        var type = Il2CppType.Of<Il2Cpp.ScriptableItem>();
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
                quality = scriptableItem.quality,
                level_required = 0,
                faction_required_to_buy = scriptableItem.requiredFactionToBuy,
                adventuring_level_needed = scriptableItem.adventuringLevelNeeded,
                is_key = scriptableItem.isKey,
                is_chest_key = scriptableItem.isChestKey,
                has_gather_quest = scriptableItem.hasGatherQuest,
                buy_price = (int)scriptableItem.buyPrice,
                sell_price = (int)scriptableItem.sellPrice,
                tradable = scriptableItem.tradable,
                is_quest_item = scriptableItem.isOnlyQuestItem,
                icon_path = scriptableItem.image_name ?? "",
                tooltip = scriptableItem.ToolTip(false, false) ?? ""
            };

            // Try to cast to UsableItem for level requirement
            var usableItem = obj.TryCast<Il2Cpp.UsableItem>();
            if (usableItem != null)
            {
                itemData.level_required = usableItem.minLevel;
            }

            // Try to cast to EquipmentItem for stats
            var equipItem = obj.TryCast<Il2Cpp.EquipmentItem>();
            if (equipItem != null)
            {
                itemData.weapon_category = equipItem.category ?? "";
                itemData.slot = equipItem.category ?? "";

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
                    poison_resist = equipItem.poisonResistBonus,
                    disease_resist = equipItem.diseaseResistBonus
                };
            }

            // Check for specialized item types
            var mountItem = obj.TryCast<Il2Cpp.MountItem>();
            if (mountItem != null)
            {
                itemData.mount_speed = mountItem.speedMount;
            }

            var foodItem = obj.TryCast<Il2Cpp.FoodItem>();
            if (foodItem != null)
            {
                itemData.food_type = foodItem.typeFood ?? "unknown";
                itemData.food_buff_level = foodItem.buffLevel;
                if (foodItem.buffEffect != null)
                {
                    itemData.food_buff_id = foodItem.buffEffect.name.ToLowerInvariant().Replace(" ", "_");
                }
            }

            var bookItem = obj.TryCast<Il2Cpp.BookItem>();
            if (bookItem != null)
            {
                itemData.book_strength_gain = bookItem.strengthGain;
                itemData.book_dexterity_gain = bookItem.dexterityGain;
                itemData.book_constitution_gain = bookItem.constitutionGain;
                itemData.book_intelligence_gain = bookItem.intelligenceGain;
                itemData.book_wisdom_gain = bookItem.wisdomGain;
                itemData.book_charisma_gain = bookItem.charismaGain;
            }

            var scrollItem = obj.TryCast<Il2Cpp.MonsterScrollItem>();
            if (scrollItem != null && scrollItem.spawns != null && scrollItem.spawns.Length > 0)
            {
                foreach (var spawn in scrollItem.spawns)
                {
                    if (spawn.monster != null)
                    {
                        itemData.spawned_monsters.Add(new SpawnedMonster
                        {
                            monster_id = spawn.monster.name.ToLowerInvariant().Replace(" ", "_"),
                            amount = spawn.amount
                        });
                    }
                }
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
}
