using System.Collections.Generic;
using Il2Cpp;
using Il2CppMirror;
using UnityEngine;

namespace PocketCompendium.Features.AugmentMarks;

// Finds the item behind each icon in the windows that draw augmentable items. Windows that name a
// slot's drag handle after an item index are read through it. The others fill their slots from a
// list the game builds anew each frame, and the feature rebuilds that list the same way.
public sealed partial class AugmentMarksFeature
{
    // Inventory with the worn equipment, combined backpack, bank and house chest.
    private void MarkStorage(Player player)
    {
        var inventory = UIInventory.singleton;
        if (Open(inventory != null ? inventory.panel : null))
        {
            var content = inventory.content;
            for (int i = 0; i < content.childCount; i++)
            {
                var slot = content.GetChild(i).GetComponent<UIInventorySlot>();
                if (slot != null) Mark(slot.image, slot.dragAndDropable, player.inventory.slots);
            }

            var equipment = UIEquipment.singleton;
            if (equipment != null)
            {
                for (int i = 0; i < player.equipment.slots.Count; i++)
                {
                    var slot = equipment.GetEquipmentSlot(i);
                    if (slot != null) Mark(slot.image, slot.dragAndDropable, player.equipment.slots);
                }
            }
        }

        // The backpack's own slots hold backpacks, which take no augment, so only its content counts.
        var backpack = UIBigBackpack.singleton;
        if (Open(backpack != null ? backpack.panel : null))
        {
            var content = backpack.content;
            for (int i = 0; i < content.childCount; i++)
            {
                var slot = content.GetChild(i).GetComponent<UIInventorySlot>();
                if (slot != null) Mark(slot.image, slot.dragAndDropable, player.inventory.slots);
            }
        }

        var bank = UIBank.singleton;
        if (Open(bank != null ? bank.panel : null))
        {
            var content = bank.content;
            for (int i = 0; i < content.childCount; i++)
            {
                var slot = content.GetChild(i).GetComponent<UIBankSlot>();
                if (slot != null) Mark(slot.image, slot.dragAndDropable, player.bank.slots);
            }
        }

        var chest = UIChest.singleton;
        if (Open(chest != null ? chest.panel : null))
        {
            var content = chest.content;
            for (int i = 0; i < content.childCount; i++)
            {
                var slot = content.GetChild(i).GetComponent<UIChestSlot>();
                if (slot != null) Mark(slot.image, slot.dragAndDropable, player.chestHouse.slots);
            }
        }
    }

    // One window shows a mercenary's equipment or, while inspecting, another player's.
    // Source: UIEquipmentMercenary.cs:RefreshInspectedPlayerEquipment.
    private void MarkCharacterSheet()
    {
        var window = UIEquipmentMercenary.singleton;
        if (!Open(window != null ? window.panel : null)) return;

        var equipment = window.inspectedPlayer != null
            ? window.inspectedPlayer.equipment
            : window.mercenary != null ? window.mercenary.equipment : null;
        if (equipment == null) return;

        for (int i = 0; i < equipment.slots.Count; i++)
        {
            var slot = window.GetEquipmentSlot(i);
            if (slot != null) Mark(slot.image, slot.dragAndDropable, equipment.slots);
        }
    }

    // Each side lists inventory indices in its offer.
    // Source: UIPlayerTrading.cs:Update.
    private void MarkPlayerTrade(Player player)
    {
        var window = UIPlayerTrading.singleton;
        if (!Open(window != null ? window.panel : null)) return;

        MarkOffer(window.myContent, player);
        var other = player.Networktarget != null ? player.Networktarget.TryCast<Player>() : null;
        if (other != null) MarkOffer(window.otherContent, other);
    }

    private void MarkOffer(Transform content, Player trader)
    {
        var offer = trader.trading.offerItems;
        for (int i = 0; i < content.childCount && i < offer.Count; i++)
        {
            var slot = content.GetChild(i).GetComponent<UIPlayerTradingSlot>();
            if (slot != null) Mark(slot.image, At(trader.inventory.slots, offer[i]));
        }
    }

    // Each mode lists items in its own order, which this rebuilds.
    // Source: UINpcTrading.cs:Update.
    private void MarkNpcTrade(Player player)
    {
        var window = UINpcTrading.singleton;
        if (!Open(window != null ? window.panel : null) || window.tradingMode == null) return;
        var npc = player.Networktarget != null ? player.Networktarget.TryCast<Npc>() : null;
        if (npc == null) return;

        var listed = NpcTradeItems(window.tradingMode, npc, player);
        var content = window.content;
        for (int i = 0; i < content.childCount; i++)
        {
            var slot = content.GetChild(i).GetComponent<UINpcTradingSlot>();
            if (slot != null) Mark(slot.image, i < listed.Count ? listed[i] : null);
        }
    }

    private static List<ItemSlot> NpcTradeItems(string mode, Npc npc, Player player)
    {
        var listed = new List<ItemSlot>();
        switch (mode)
        {
            case "purchase" when npc.isAugmenter:
                foreach (var slots in new[] { player.equipment.slots, player.inventory.slots })
                    for (int i = 0; i < slots.Count; i++)
                    {
                        var slot = slots[i];
                        if (slot.amount > 0 && slot.item.data != null && slot.item.data.TryCast<EquipmentItem>() != null
                            && !string.IsNullOrEmpty(slot.augmentName)
                            && GameManager.cacheItems.ContainsKey(Il2CppMirror.Extensions.GetStableHashCode(slot.augmentName)))
                            listed.Add(slot);
                    }
                break;

            // The shop's own goods come first and carry no augment. Items sold back follow them.
            case "purchase":
                var goods = NpcTrading.VisibleSaleItemsFor(npc);
                for (int i = 0; i < goods.Length; i++) listed.Add(null);
                var buyback = player.npcTrading.buybackItems;
                for (int i = 0; i < buyback.Count; i++)
                {
                    var bought = buyback[i];
                    if (bought.expirationTime > NetworkTime.time && bought.itemSlot.amount > 0 && bought.itemSlot.item.data != null)
                        listed.Add(bought.itemSlot);
                }
                break;

            case "sell":
                foreach (var index in PreferredSlots(player.inventory))
                {
                    var slot = player.inventory.slots[index];
                    if (slot.amount <= 0 || slot.item.data == null) continue;
                    var shown = npc.isEssenceTrader
                        ? slot.durability > 0 && Il2Cpp.Utils.isTradeableForPrimalEssence(slot.item)
                        : slot.item.sellable;
                    if (shown) listed.Add(slot);
                }
                break;

            case "repair":
                AddRepairable(listed, player.equipment.slots, excludeInventoryOnlyItems: false);
                AddRepairable(listed, player.inventory.slots, excludeInventoryOnlyItems: true);
                var mercenaries = UINpcTrading.GetActiveMercenaries(player);
                for (int i = 0; i < mercenaries.Count; i++)
                {
                    var mercenary = mercenaries[i];
                    if (mercenary != null && mercenary.equipment != null)
                        AddRepairable(listed, mercenary.equipment.slots, excludeInventoryOnlyItems: false);
                }
                break;
        }
        return listed;
    }

    private static void AddRepairable(List<ItemSlot> listed, SyncList<ItemSlot> slots, bool excludeInventoryOnlyItems)
    {
        for (int i = 0; i < slots.Count; i++)
        {
            var slot = slots[i];
            if (UINpcTrading.IsRepairableEquipmentSlot(slot, excludeInventoryOnlyItems) && slot.item.data.TryCast<EquipmentItem>() != null)
                listed.Add(slot);
        }
    }

    // The sell lists follow the inventory's preferred order: bags first, then backpack slots.
    private static List<int> PreferredSlots(PlayerInventory inventory)
    {
        var indices = new List<int>();
        var enumerator = inventory.EnumeratePreferredSlotsOrdered().GetEnumerator();
        var plain = enumerator.Cast<Il2CppSystem.Collections.IEnumerator>();
        while (plain.MoveNext()) indices.Add(enumerator.Current);
        return indices;
    }

    // The shrine lists four inventory items a page and three offerings. Its icons sit on rows
    // and frames that are not slot-sized, so the marks go on the icons.
    // Source: UIVirtueShrine.cs:RefreshItems, UIVirtueShrine.cs:RefreshOfferingSlots.
    private void MarkVirtueShrine()
    {
        if (!UIVirtueShrine.IsVisible) return;
        var shrine = UIVirtueShrine.instance;
        if (shrine == null) return;

        var snapshot = shrine.inventorySnapshot;
        for (int i = 0; i < shrine.itemImages.Length; i++)
        {
            var index = shrine.displayedIndices[i];
            Mark(shrine.itemImages[i], index >= 0 && index < snapshot.Count ? snapshot[index] : null, onIcon: true);
        }

        for (int i = 0; i < shrine.offeringImages.Length; i++)
            Mark(shrine.offeringImages[i], shrine.offeringIndices[i] >= 0 ? shrine.offeringSlots[i] : null, onIcon: true);
    }

    // A skillbar entry names a skill or an item. An item resolves to the first inventory slot that
    // holds it, else the first equipment slot, as the skillbar does.
    // Source: UISkillbar.cs:RefreshSkillbarSlot.
    private void MarkSkillbar(Player player)
    {
        var skillbar = UISkillbar.singleton;
        if (skillbar == null) return;
        MarkSkillbarSlots(skillbar.slots, player);
        MarkSkillbarSlots(skillbar.extraSlots, player);
    }

    private void MarkSkillbarSlots(Il2CppInterop.Runtime.InteropTypes.Arrays.Il2CppReferenceArray<UISkillbarSlot> slots, Player player)
    {
        if (slots == null) return;
        var entries = PlayerSkillbar.slots;
        for (int i = 0; i < slots.Length; i++)
        {
            var slot = slots[i];
            if (slot == null || !slot.gameObject.activeInHierarchy) continue;
            Mark(slot.image, SkillbarItem(slot, entries, player));
        }
    }

    private static ItemSlot SkillbarItem(UISkillbarSlot slot, Il2CppInterop.Runtime.InteropTypes.Arrays.Il2CppReferenceArray<SkillbarEntry> entries, Player player)
    {
        if (slot.dragAndDropable == null || !int.TryParse(slot.dragAndDropable.name, out var index) || index < 0 || index >= entries.Length)
            return null;
        var reference = entries[index].reference;
        if (string.IsNullOrEmpty(reference) || SkillbarMacro.IsReference(reference) || player.skills.GetSkillIndexByName(reference) != -1)
            return null;
        var inInventory = player.inventory.GetItemIndexByName(reference);
        return inInventory != -1
            ? At(player.inventory.slots, inInventory)
            : At(player.equipment.slots, player.equipment.GetItemIndexByName(reference));
    }
}
