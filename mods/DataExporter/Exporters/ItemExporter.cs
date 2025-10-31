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
                item_type = DetermineItemType(scriptableItem),
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

            // Populate item type-specific fields
            PopulateEquipmentFields(scriptableItem, itemData);
            PopulatePotionFields(scriptableItem, itemData);
            PopulateFoodFields(scriptableItem, itemData);
            PopulateBookFields(scriptableItem, itemData);
            PopulateScrollFields(scriptableItem, itemData);
            PopulateMountFields(scriptableItem, itemData);
            PopulateBackpackFields(scriptableItem, itemData);
            PopulateTravelFields(scriptableItem, itemData);
            PopulatePackFields(scriptableItem, itemData);
            PopulateRandomFields(scriptableItem, itemData);
            PopulateChestFields(scriptableItem, itemData);
            PopulateRelicFields(scriptableItem, itemData);
            PopulateMonsterScrollFields(scriptableItem, itemData);
            PopulateStructureFields(scriptableItem, itemData);

            itemList.Add(itemData);
        }

        WriteJson(itemList, "items.json");
        Logger.Msg($"✓ Exported {itemList.Count} items");
    }

    private string DetermineItemType(Il2Cpp.ScriptableItem item)
    {
        if (item.TryCast<Il2Cpp.CustomStructureItem>() != null) return "structure";
        if (item.TryCast<Il2Cpp.MonsterScrollItem>() != null) return "monster_scroll";
        if (item.TryCast<Il2Cpp.RelicItem>() != null) return "relic";
        if (item.TryCast<Il2Cpp.ChestItem>() != null) return "chest";
        if (item.TryCast<Il2Cpp.RandomItem>() != null) return "random";
        if (item.TryCast<Il2Cpp.PackItem>() != null) return "pack";
        if (item.TryCast<Il2Cpp.TravelItem>() != null) return "travel";
        if (item.TryCast<Il2Cpp.BackpackItem>() != null) return "backpack";
        if (item.TryCast<Il2Cpp.MountItem>() != null) return "mount";
        if (item.TryCast<Il2Cpp.ScrollItem>() != null) return "scroll";
        if (item.TryCast<Il2Cpp.BookItem>() != null) return "book";
        if (item.TryCast<Il2Cpp.FoodItem>() != null) return "food";
        if (item.TryCast<Il2Cpp.PotionItem>() != null) return "potion";
        if (item.TryCast<Il2Cpp.EquipmentItem>() != null) return "equipment";
        return "general";
    }

    private void PopulateEquipmentFields(Il2Cpp.ScriptableItem item, ItemData itemData)
    {
        var equipItem = item.TryCast<Il2Cpp.EquipmentItem>();
        if (equipItem == null) return;

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
            strength = equipItem.strengthBonus,
            constitution = equipItem.constitutionBonus,
            dexterity = equipItem.dexterityBonus,
            charisma = equipItem.charismaBonus,
            intelligence = equipItem.intelligenceBonus,
            wisdom = equipItem.wisdomBonus,
            health_bonus = equipItem.healthBonus,
            hp_regen_bonus = equipItem.hpRegenBonus,
            mana_bonus = equipItem.manaBonus,
            mana_regen_bonus = equipItem.manaRegenBonus,
            energy_bonus = equipItem.energyBonus,
            damage = equipItem.damageBonus,
            magic_damage = equipItem.magicDamageBonus,
            defense = equipItem.defenseBonus,
            magic_resist = equipItem.magicResistBonus,
            poison_resist = equipItem.poisonResistBonus,
            fire_resist = equipItem.fireResistBonus,
            cold_resist = equipItem.coldResistBonus,
            disease_resist = equipItem.diseaseResistBonus,
            block_chance = equipItem.blockChanceBonus,
            accuracy = equipItem.accuracyBonus,
            critical_chance = equipItem.criticalChanceBonus,
            haste = equipItem.hasteBonus,
            spell_haste = equipItem.spellHasteBonus,
            max_durability = equipItem.maxDurability,
            augment_bonus_set = equipItem.augmentArmorBonusSet != null ? equipItem.augmentArmorBonusSet.name : "",
            has_serenity = equipItem.hasSerenity,
            is_costume = equipItem.isCostume
        };
    }

    private void PopulatePotionFields(Il2Cpp.ScriptableItem item, ItemData itemData)
    {
        var potionItem = item.TryCast<Il2Cpp.PotionItem>();
        if (potionItem == null) return;

        itemData.usage_health = potionItem.usageHealth;
        itemData.usage_mana = potionItem.usageMana;
        itemData.usage_energy = potionItem.usageEnergy;
        itemData.usage_experience = potionItem.usageExperience;
        itemData.usage_pet_health = potionItem.usagePetHealth;
        itemData.potion_buff_level = potionItem.buffLevel;
        if (potionItem.buffEffect != null)
        {
            itemData.potion_buff_id = potionItem.buffEffect.name.ToLowerInvariant().Replace(" ", "_");
        }
    }

    private void PopulateFoodFields(Il2Cpp.ScriptableItem item, ItemData itemData)
    {
        var foodItem = item.TryCast<Il2Cpp.FoodItem>();
        if (foodItem == null) return;

        itemData.food_type = foodItem.typeFood ?? "unknown";
        itemData.food_buff_level = foodItem.buffLevel;
        if (foodItem.buffEffect != null)
        {
            itemData.food_buff_id = foodItem.buffEffect.name.ToLowerInvariant().Replace(" ", "_");
        }
    }

    private void PopulateBookFields(Il2Cpp.ScriptableItem item, ItemData itemData)
    {
        var bookItem = item.TryCast<Il2Cpp.BookItem>();
        if (bookItem == null) return;

        itemData.book_text = bookItem.bookText ?? "";
        itemData.book_strength_gain = bookItem.strengthGain;
        itemData.book_dexterity_gain = bookItem.dexterityGain;
        itemData.book_constitution_gain = bookItem.constitutionGain;
        itemData.book_intelligence_gain = bookItem.intelligenceGain;
        itemData.book_wisdom_gain = bookItem.wisdomGain;
        itemData.book_charisma_gain = bookItem.charismaGain;
    }

    private void PopulateScrollFields(Il2Cpp.ScriptableItem item, ItemData itemData)
    {
        var scrollItem = item.TryCast<Il2Cpp.ScrollItem>();
        if (scrollItem == null) return;

        itemData.is_repair_kit = scrollItem.isRepairKit;
        if (scrollItem.skillEffect != null)
        {
            itemData.scroll_skill_id = scrollItem.skillEffect.name.ToLowerInvariant().Replace(" ", "_");
        }
    }

    private void PopulateMountFields(Il2Cpp.ScriptableItem item, ItemData itemData)
    {
        var mountItem = item.TryCast<Il2Cpp.MountItem>();
        if (mountItem == null) return;

        itemData.mount_speed = mountItem.speedMount;
    }

    private void PopulateBackpackFields(Il2Cpp.ScriptableItem item, ItemData itemData)
    {
        var backpackItem = item.TryCast<Il2Cpp.BackpackItem>();
        if (backpackItem == null) return;

        itemData.backpack_slots = backpackItem.numSlots;
    }

    private void PopulateTravelFields(Il2Cpp.ScriptableItem item, ItemData itemData)
    {
        var travelItem = item.TryCast<Il2Cpp.TravelItem>();
        if (travelItem == null) return;

        itemData.travel_zone_id = travelItem.idZone;
        itemData.travel_destination_name = travelItem.nameDestination ?? "";
        itemData.travel_destination = new Position(
            travelItem.destination.x,
            travelItem.destination.y,
            0
        );
    }

    private void PopulatePackFields(Il2Cpp.ScriptableItem item, ItemData itemData)
    {
        var packItem = item.TryCast<Il2Cpp.PackItem>();
        if (packItem == null) return;

        if (packItem.finalItemReceived != null)
        {
            itemData.pack_final_item_id = packItem.finalItemReceived.name.ToLowerInvariant().Replace(" ", "_");
        }
        itemData.pack_final_amount = packItem.finalAmountReceived;
    }

    private void PopulateRandomFields(Il2Cpp.ScriptableItem item, ItemData itemData)
    {
        var randomItem = item.TryCast<Il2Cpp.RandomItem>();
        if (randomItem == null) return;

        if (randomItem.items != null)
        {
            itemData.random_items = new List<string>();
            foreach (var randItem in randomItem.items)
            {
                if (randItem != null)
                {
                    itemData.random_items.Add(randItem.name.ToLowerInvariant().Replace(" ", "_"));
                }
            }
        }
    }

    private void PopulateChestFields(Il2Cpp.ScriptableItem item, ItemData itemData)
    {
        var chestItem = item.TryCast<Il2Cpp.ChestItem>();
        if (chestItem == null) return;

        itemData.chest_num_items = chestItem.numItemsPerChest;
        if (chestItem.rewards != null)
        {
            itemData.chest_rewards = new List<ItemDropChance>();
            foreach (var reward in chestItem.rewards)
            {
                if (reward.item != null)
                {
                    itemData.chest_rewards.Add(new ItemDropChance
                    {
                        item_id = reward.item.name.ToLowerInvariant().Replace(" ", "_"),
                        probability = reward.probability
                    });
                }
            }
        }
    }

    private void PopulateRelicFields(Il2Cpp.ScriptableItem item, ItemData itemData)
    {
        var relicItem = item.TryCast<Il2Cpp.RelicItem>();
        if (relicItem == null) return;

        itemData.relic_buff_level = relicItem.buffLevel;
        if (relicItem.buffEffect != null)
        {
            itemData.relic_buff_id = relicItem.buffEffect.name.ToLowerInvariant().Replace(" ", "_");
        }
    }

    private void PopulateMonsterScrollFields(Il2Cpp.ScriptableItem item, ItemData itemData)
    {
        var monsterScrollItem = item.TryCast<Il2Cpp.MonsterScrollItem>();
        if (monsterScrollItem == null) return;

        if (monsterScrollItem.spawns != null && monsterScrollItem.spawns.Length > 0)
        {
            itemData.spawned_monsters = new List<SpawnedMonster>();
            foreach (var spawn in monsterScrollItem.spawns)
            {
                if (spawn.monster != null)
                {
                    itemData.spawned_monsters.Add(new SpawnedMonster
                    {
                        monster_id = spawn.monster.name.ToLowerInvariant().Replace(" ", "_"),
                        amount = spawn.amount,
                        distance_multiplier = spawn.distanceMultiplier
                    });
                }
            }
        }
    }

    private void PopulateStructureFields(Il2Cpp.ScriptableItem item, ItemData itemData)
    {
        var structureItem = item.TryCast<Il2Cpp.CustomStructureItem>();
        if (structureItem == null) return;

        itemData.structure_price = structureItem.price;
        if (structureItem.availableRotations != null)
        {
            itemData.structure_available_rotations = new List<Position>();
            foreach (var rotation in structureItem.availableRotations)
            {
                itemData.structure_available_rotations.Add(new Position(rotation.x, rotation.y, rotation.z));
            }
        }
    }
}
