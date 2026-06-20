using System.Collections.Generic;
using Il2Cpp;
using Il2CppInterop.Runtime;
using UnityEngine;
using UnityEngine.UI;

namespace BestiaryRevealer.Ui;

internal static class BestiaryLootRenderer
{
    private const string DurabilityToken = "{DURABILITY}";
    private const string FullDurabilityText = "<color=#DA4ADC>Durability: 100%</color>";

    internal static void Reveal(UIBestiaryDetail detail, Monster monster)
    {
        var slots = BestiaryLootSlots.From(detail);
        var displayItems = BuildDisplayItems(monster);
        var rendered = 0;

        foreach (var scriptableItem in displayItems)
        {
            if (rendered >= slots.Length)
                break;

            if (!TryBuildVisibleItem(scriptableItem, out var item, out var itemData))
                continue;

            RenderSlot(slots[rendered], item, itemData);
            rendered++;
        }

        for (var i = rendered; i < slots.Length; i++)
        {
            SetSlotActive(slots[i], false);
        }
    }

    private static List<ScriptableItem> BuildDisplayItems(Monster monster)
    {
        var items = new List<ScriptableItem>();
        if (monster.dropChances != null && monster.dropChances.Count > 0)
        {
            foreach (var drop in monster.dropChances)
            {
                if (drop?.item != null)
                    items.Add(drop.item);
            }
        }

        AddForgottenAltarVariants(monster, items);
        return items;
    }

    private static void AddForgottenAltarVariants(Monster monster, List<ScriptableItem> items)
    {
        if (!monster.isElite || !monster.isForgotttenAltarEvent || GameManager.cacheItems == null)
            return;

        ScriptableItem baseEquipment = null;
        foreach (var item in items)
        {
            if (item != null && item.quality == 1 && item.TryCast<EquipmentItem>() != null)
            {
                baseEquipment = item;
                break;
            }
        }

        if (baseEquipment == null)
            return;

        AddCachedVariant(items, "Magic " + baseEquipment.nameItem);
        AddCachedVariant(items, "Epic " + baseEquipment.nameItem);
        AddCachedVariant(items, "Legendary " + baseEquipment.nameItem);
        AddCachedVariant(items, "Mythic " + baseEquipment.nameItem);
    }

    private static void AddCachedVariant(List<ScriptableItem> items, string itemName)
    {
        if (GameManager.cacheItems.TryGetValue(StableHash(itemName), out var variant) && variant != null)
            items.Add(variant);
    }

    private static bool TryBuildVisibleItem(ScriptableItem scriptableItem, out Item item, out ScriptableItem itemData)
    {
        item = default;
        itemData = null;

        if (scriptableItem == null)
            return false;

        item = new Item(scriptableItem);
        itemData = item.data;
        if (itemData == null)
            return false;

        if (itemData.TryCast<PotionItem>() != null || itemData.isOnlyQuestItem)
            return false;

        if (itemData.quality <= 0 && !itemData.isKey && itemData.TryCast<EquipmentItem>() == null && itemData.TryCast<ScrollItem>() == null)
            return false;

        return true;
    }

    private static void RenderSlot(UIBestiaryLoot slot, Item item, ScriptableItem itemData)
    {
        if (slot == null)
            return;

        SetSlotActive(slot, true);

        if (slot.imageItem != null)
        {
            slot.imageItem.sprite = item.image;
            slot.imageItem.color = Color.white;
        }

        if (slot.background != null)
            slot.background.sprite = BackgroundForQuality(itemData.quality);

        ConfigureTooltip(slot.tooltip, item);
    }

    private static Sprite BackgroundForQuality(byte quality)
    {
        var inventory = UIInventory.singleton;
        if (inventory == null)
            return null;

        return quality switch
        {
            1 => inventory.backgroundUncommon,
            2 => inventory.backgroundMagic,
            3 => inventory.backgroundEpic,
            4 => inventory.backgroundLegendary,
            5 => inventory.backgroundMythic,
            _ => inventory.backgroundNormal,
        };
    }

    private static void ConfigureTooltip(UIShowToolTip tooltip, Item item)
    {
        if (tooltip == null)
            return;

        tooltip.enabled = true;
        tooltip.text = (item.ToolTip(false, true) ?? string.Empty).Replace(DurabilityToken, FullDurabilityText);
    }

    private static void SetSlotActive(UIBestiaryLoot slot, bool active)
    {
        if (slot?.gameObject != null)
            slot.gameObject.SetActive(active);
    }

    private static int StableHash(string text)
    {
        var hash = 23;
        foreach (var c in text)
        {
            hash = hash * 31 + c;
        }

        return hash;
    }
}
