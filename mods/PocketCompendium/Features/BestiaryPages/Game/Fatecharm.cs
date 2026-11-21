using System.Collections.Generic;
using Il2Cpp;
using PocketCompendium.Features.BestiaryPages.Model;

namespace PocketCompendium.Features.BestiaryPages.Game;

/// <summary>
/// A matching Fatecharm in the first 24 inventory slots raises the boss's minimum equipment drops.
/// Source: server-scripts/Monster.cs:OnDeath.
/// </summary>
internal static class Fatecharm
{
    // The main inventory. A Fatecharm in the backpack is kept.
    private const int MainInventorySlots = 24;

    /// <summary>The boss's own Fatecharm, then its loot dungeon's. Source: server-scripts/Monster.cs:TryGetBossFatecharm.</summary>
    public static ScriptableItem ForMonster(Monster monster)
    {
        if (monster == null || !monster.isBoss) return null;
        var charm = monster.bossFatecharm;
        if (charm != null) return charm;
        int zone = monster.idZone;
        if (zone <= 0 || ZoneInfo.zones == null || !ZoneInfo.zones.TryGetValue(zone, out var info) || !info.isDungeon)
            return null;

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
