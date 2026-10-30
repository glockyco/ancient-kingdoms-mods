using System.Collections.Generic;
using AncientKingdomsMods.Shared;
using Il2Cpp;
using UnityEngine;
using UnityEngine.UI;

namespace BetterBestiary.Ui;

internal static class BestiaryLootRenderer
{
    private const string DurabilityToken = "{DURABILITY}";

    // Slots added beyond the page's twelve, for monsters with larger loot tables.
    private static readonly List<UIBestiaryLoot> ExtraSlots = new();
    private static readonly List<UIBestiaryLoot> Shown = new();

    private static Monster _renderedMonster;
    private static string _renderedFor;
    private static float _appliedCell = LootGridLayout.VanillaCell;

    /// <summary>The loot slots on the current page, in drop order, for gamepad navigation.</summary>
    internal static IReadOnlyList<UIBestiaryLoot> ShownSlots => Shown;

    internal static void Reveal(UIBestiaryDetail detail, Monster monster)
    {
        // Item tooltips depend on the monster, the language, and the player's level and class
        // (requirement colors), so the slots are rebuilt only when one of those changes.
        var player = Player.localPlayer;
        var key = EntityNameLocalization.LocaleCode + "|" +
                  (player != null ? player.level.current + "|" + player.className : "-");
        if (monster == _renderedMonster && key == _renderedFor)
            return;

        var items = BuildDisplayItems(monster);
        var slots = SlotsFor(detail, items.Count);
        var capacity = ApplyLayout(detail, items.Count);

        Shown.Clear();
        var rendered = 0;
        foreach (var item in items)
        {
            if (rendered >= capacity || rendered >= slots.Count)
                break;
            RenderSlot(slots[rendered], item);
            Shown.Add(slots[rendered]);
            rendered++;
        }

        for (var i = rendered; i < slots.Count; i++)
            SetSlotActive(slots[i], false);

        _renderedMonster = monster;
        _renderedFor = key;
    }

    /// <summary>Returns the page to the game's twelve-slot layout before the game draws it.</summary>
    internal static void RestoreGameLayout(UIBestiaryDetail detail)
    {
        foreach (var slot in ExtraSlots)
            SetSlotActive(slot, false);
        if (detail != null)
            ApplyCell(detail, LootGridLayout.VanillaCell, VanillaColumns(detail));
        Shown.Clear();
        _renderedMonster = null;
        _renderedFor = null;
    }

    private static List<Item> BuildDisplayItems(Monster monster)
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

        var visible = new List<Item>();
        foreach (var scriptableItem in items)
        {
            if (TryBuildVisibleItem(scriptableItem, out var item))
                visible.Add(item);
        }

        return visible;
    }

    // Same variants as UIBestiaryDetail.Show adds for Forgotten Altar elites.
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

    // Same filter as the game's page: no potions, quest-only items, or plain junk.
    private static bool TryBuildVisibleItem(ScriptableItem scriptableItem, out Item item)
    {
        item = default;
        if (scriptableItem == null)
            return false;

        item = new Item(scriptableItem);
        var itemData = item.data;
        if (itemData == null)
            return false;
        if (itemData.TryCast<PotionItem>() != null || itemData.isOnlyQuestItem)
            return false;
        if (itemData.quality <= 0 && !itemData.isKey && itemData.TryCast<EquipmentItem>() == null && itemData.TryCast<ScrollItem>() == null)
            return false;

        return true;
    }

    private static List<UIBestiaryLoot> SlotsFor(UIBestiaryDetail detail, int count)
    {
        var slots = new List<UIBestiaryLoot>(BestiaryLootSlots.From(detail));
        var template = slots[slots.Count - 1];
        while (slots.Count + ExtraSlots.Count < count && template != null)
        {
            var clone = Object.Instantiate(template.gameObject, template.transform.parent);
            clone.name = "BetterBestiary_LootSlot" + (slots.Count + ExtraSlots.Count);
            ExtraSlots.Add(clone.GetComponent<UIBestiaryLoot>());
        }

        slots.AddRange(ExtraSlots);
        foreach (var slot in slots)
            GamepadLootNavigation.EnsureSelectable(slot);
        return slots;
    }

    private static int ApplyLayout(UIBestiaryDetail detail, int count)
    {
        var grid = Grid(detail);
        if (grid == null)
            return BestiaryLootSlots.From(detail).Length;

        var area = grid.GetComponent<RectTransform>().rect;
        var layout = LootGridLayout.For(count, area.width, area.height, grid.spacing.x, grid.spacing.y);
        ApplyCell(detail, layout.Cell, layout.Columns);
        return layout.Capacity;
    }

    private static void ApplyCell(UIBestiaryDetail detail, float cell, int columns)
    {
        var grid = Grid(detail);
        if (grid == null || (Mathf.Approximately(cell, _appliedCell) && grid.constraintCount == columns))
            return;

        grid.cellSize = new Vector2(cell, cell);
        grid.constraintCount = columns;

        // A slot's art has fixed sizes for 56 px, so it scales with the cell.
        var scale = new Vector3(cell / LootGridLayout.VanillaCell, cell / LootGridLayout.VanillaCell, 1f);
        var slots = new List<UIBestiaryLoot>(BestiaryLootSlots.From(detail));
        slots.AddRange(ExtraSlots);
        foreach (var slot in slots)
        {
            if (slot == null)
                continue;
            for (var i = 0; i < slot.transform.childCount; i++)
                slot.transform.GetChild(i).localScale = scale;
        }

        _appliedCell = cell;
    }

    private static int VanillaColumns(UIBestiaryDetail detail)
    {
        var grid = Grid(detail);
        if (grid == null)
            return 6;
        var area = grid.GetComponent<RectTransform>().rect;
        return LootGridLayout.For(0, area.width, area.height, grid.spacing.x, grid.spacing.y).Columns;
    }

    private static GridLayoutGroup Grid(UIBestiaryDetail detail) =>
        detail?.loot0 != null ? detail.loot0.transform.parent.GetComponent<GridLayoutGroup>() : null;

    private static void RenderSlot(UIBestiaryLoot slot, Item item)
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
            slot.background.sprite = BackgroundForQuality(item.data.quality);

        if (slot.tooltip != null)
        {
            slot.tooltip.enabled = true;
            // Same text as the game's page shows for a discovered drop.
            var durability = "<color=#DA4ADC>" + GameText.FullDurability() + "</color>";
            slot.tooltip.text = (item.ToolTip(false, true) ?? string.Empty).Replace(DurabilityToken, durability);
        }
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

    private static void SetSlotActive(UIBestiaryLoot slot, bool active)
    {
        if (slot?.gameObject != null && slot.gameObject.activeSelf != active)
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
