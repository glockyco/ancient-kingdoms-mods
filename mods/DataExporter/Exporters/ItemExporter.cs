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

                // Economy
                max_stack = scriptableItem.maxStack,
                buy_price = scriptableItem.buyPrice,
                sell_price = scriptableItem.sellPrice,
                buy_token_id = scriptableItem.buyToken != null ? scriptableItem.buyToken.name.ToLowerInvariant().Replace(" ", "_") : null,
                sellable = scriptableItem.sellable,
                tradable = scriptableItem.tradable,
                destroyable = scriptableItem.destroyable,
                is_quest_item = scriptableItem.isOnlyQuestItem,

                icon_path = scriptableItem.image_name ?? "",
                tooltip = scriptableItem.ToolTip(false, false) ?? ""
            };

            // Try to cast to UsableItem for level requirement and cooldown fields
            var usableItem = obj.TryCast<Il2Cpp.UsableItem>();
            if (usableItem != null)
            {
                itemData.level_required = usableItem.minLevel;
                itemData.infinite_charges = usableItem.infiniteCharges;
                itemData.cooldown = usableItem.cooldown;
                itemData.cooldown_category = usableItem.cooldownCategory ?? "";
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
            PopulateWeaponFields(scriptableItem, itemData);
            PopulateAugmentFields(scriptableItem, itemData);
            PopulateTreasureMapFields(scriptableItem, itemData);
            PopulateFragmentFields(scriptableItem, itemData);
            PopulateMergeFields(scriptableItem, itemData);
            PopulateRecipeFields(scriptableItem, itemData);

            itemList.Add(itemData);
        }

        WriteJson(itemList, "items.json");
        Logger.Msg($"✓ Exported {itemList.Count} items");
    }

    private string DetermineItemType(Il2Cpp.ScriptableItem item)
    {
        // Check most specific types first (order matters for inheritance)
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

        // UsableItem subtypes (check before base EquipmentItem)
        if (item.TryCast<Il2CppuMMORPG.Scripts.ScriptableItems.RecipeItem>() != null) return "recipe";
        if (item.TryCast<Il2CppuMMORPG.Scripts.ScriptableItems.MergeItem>() != null) return "merge";
        if (item.TryCast<Il2CppuMMORPG.Scripts.ScriptableItems.FragmentItem>() != null) return "fragment";
        if (item.TryCast<Il2CppuMMORPG.Scripts.ScriptableItems.TreasureMapItem>() != null) return "treasure_map";

        // EquipmentItem subtypes (check before base EquipmentItem)
        if (item.TryCast<Il2Cpp.WeaponItem>() != null) return "weapon";
        if (item.TryCast<Il2Cpp.AugmentItem>() != null) return "augment";
        if (item.TryCast<Il2Cpp.AmmoItem>() != null) return "ammo";

        // Base types
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

    private void PopulateWeaponFields(Il2Cpp.ScriptableItem item, ItemData itemData)
    {
        var weaponItem = item.TryCast<Il2Cpp.WeaponItem>();
        if (weaponItem == null) return;

        if (weaponItem.requiredAmmo != null)
        {
            itemData.weapon_required_ammo_id = weaponItem.requiredAmmo.name.ToLowerInvariant().Replace(" ", "_");
        }
        if (weaponItem.procEffect != null)
        {
            itemData.weapon_proc_effect_id = weaponItem.procEffect.name.ToLowerInvariant().Replace(" ", "_");
        }
        itemData.weapon_proc_effect_probability = weaponItem.procEffectProbability;
        itemData.weapon_delay = weaponItem.delay;
    }

    private void PopulateAugmentFields(Il2Cpp.ScriptableItem item, ItemData itemData)
    {
        var augmentItem = item.TryCast<Il2Cpp.AugmentItem>();
        if (augmentItem == null) return;

        itemData.augment_armor_set_name = augmentItem.nameArmorSet ?? "";

        if (augmentItem.armorSet != null)
        {
            itemData.augment_armor_set_item_ids = new List<string>();
            foreach (var armorPiece in augmentItem.armorSet)
            {
                if (armorPiece != null)
                {
                    itemData.augment_armor_set_item_ids.Add(armorPiece.name.ToLowerInvariant().Replace(" ", "_"));
                }
            }
        }

        if (augmentItem.skillsBonusArmorSet != null)
        {
            itemData.augment_skill_bonuses = new List<AugmentSkillBonus>();
            foreach (var skillBonus in augmentItem.skillsBonusArmorSet)
            {
                if (skillBonus?.skill != null)
                {
                    itemData.augment_skill_bonuses.Add(new AugmentSkillBonus
                    {
                        skill_id = skillBonus.skill.name.ToLowerInvariant().Replace(" ", "_"),
                        level_bonus = skillBonus.levelBonus
                    });
                }
            }
        }
    }

    private void PopulateTreasureMapFields(Il2Cpp.ScriptableItem item, ItemData itemData)
    {
        var treasureMapItem = item.TryCast<Il2CppuMMORPG.Scripts.ScriptableItems.TreasureMapItem>();
        if (treasureMapItem == null) return;

        if (treasureMapItem.reward != null)
        {
            itemData.treasure_map_reward_id = treasureMapItem.reward.name.ToLowerInvariant().Replace(" ", "_");
        }
        if (treasureMapItem.imageLocation != null)
        {
            itemData.treasure_map_image_location = treasureMapItem.imageLocation.name ?? "";
        }
    }

    private void PopulateFragmentFields(Il2Cpp.ScriptableItem item, ItemData itemData)
    {
        var fragmentItem = item.TryCast<Il2CppuMMORPG.Scripts.ScriptableItems.FragmentItem>();
        if (fragmentItem == null) return;

        itemData.fragment_amount_needed = fragmentItem.amountNeeded;
        if (fragmentItem.resultItem != null)
        {
            itemData.fragment_result_item_id = fragmentItem.resultItem.name.ToLowerInvariant().Replace(" ", "_");
        }
    }

    private void PopulateMergeFields(Il2Cpp.ScriptableItem item, ItemData itemData)
    {
        var mergeItem = item.TryCast<Il2CppuMMORPG.Scripts.ScriptableItems.MergeItem>();
        if (mergeItem == null) return;

        if (mergeItem.itemsNeeded != null)
        {
            itemData.merge_items_needed_ids = new List<string>();
            foreach (var neededItem in mergeItem.itemsNeeded)
            {
                if (neededItem != null)
                {
                    itemData.merge_items_needed_ids.Add(neededItem.name.ToLowerInvariant().Replace(" ", "_"));
                }
            }
        }
        if (mergeItem.resultItem != null)
        {
            itemData.merge_result_item_id = mergeItem.resultItem.name.ToLowerInvariant().Replace(" ", "_");
        }
    }

    private void PopulateRecipeFields(Il2Cpp.ScriptableItem item, ItemData itemData)
    {
        var recipeItem = item.TryCast<Il2CppuMMORPG.Scripts.ScriptableItems.RecipeItem>();
        if (recipeItem == null) return;

        if (recipeItem.potionLearned != null)
        {
            itemData.recipe_potion_learned_id = recipeItem.potionLearned.name.ToLowerInvariant().Replace(" ", "_");
        }
    }
}
