using System.Collections.Generic;
using Il2Cpp;
using PocketCompendium.Features.BestiaryPages.Model;

namespace PocketCompendium.Features.BestiaryPages.Game;

/// <summary>
/// The game's Fatecharm rules. Source: Monster.cs:3062-3098. Killing a boss in a dungeon uses the
/// zone's Fatecharm from the first 24 inventory slots, and its corpse holds one more item.
/// </summary>
internal static class Fatecharm
{
    // The main inventory. A Fatecharm in the backpack is kept.
    private const int MainInventorySlots = 24;

    /// <summary>The Fatecharm of a dungeon zone, or null. Source: GameManager.cs:668-685.</summary>
    public static ScriptableItem ForZone(int zone)
    {
        var tokens = GameManager.singleton != null ? GameManager.singleton.luckTokensDict : null;
        return tokens != null && tokens.TryGetValue(zone, out var token) ? token : null;
    }

    public static bool Carries(Player player, ScriptableItem fatecharm)
    {
        if (player == null || player.inventory == null || fatecharm == null) return false;
        var slots = player.inventory.slots;
        for (var i = 0; i < MainInventorySlots && i < slots.Count; i++)
        {
            var slot = slots[i];
            if (slot.amount > 0 && slot.item.data != null && slot.item.data.nameItem == fatecharm.nameItem)
                return true;
        }

        return false;
    }

    /// <summary>The names of the Fatecharms in the main inventory, for a render key.</summary>
    public static string Carried(Player player)
    {
        var tokens = GameManager.singleton != null ? GameManager.singleton.luckTokensDict : null;
        if (player == null || tokens == null) return string.Empty;
        var carried = new System.Text.StringBuilder();
        foreach (var token in tokens.Values)
            if (token != null && Carries(player, token)) carried.Append(token.nameItem).Append(',');
        return carried.ToString();
    }

    /// <summary>Whether a Fatecharm raises the chance of any of this boss's drops.</summary>
    public static bool RaisesAny(Monster monster)
    {
        var table = DropTableReader.Read(monster);
        var ids = new HashSet<string>();
        foreach (var entry in monster.dropChances)
        {
            if (entry?.item == null) continue;
            var id = DropTableReader.Id(entry.item);
            if (!ids.Add(id)) continue;
            var needed = new HashSet<string> { id };
            if (DropChanceCalculator.Calculate(table, id, true, true, needed) > DropChanceCalculator.Calculate(table, id, true, false, needed) + 1e-9)
                return true;
        }

        return false;
    }
}
