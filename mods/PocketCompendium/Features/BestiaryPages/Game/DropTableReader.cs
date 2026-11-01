using System.Collections.Generic;
using System.Text.RegularExpressions;
using Il2Cpp;
using PocketCompendium.Features.BestiaryPages.Model;

namespace PocketCompendium.Features.BestiaryPages.Game;

/// <summary>
/// Builds the drop chance calculation's inputs from a monster's own table, in the game build the
/// mod runs in, with the same rules the website's export applies.
/// </summary>
internal static class DropTableReader
{
    private static readonly Regex Unsafe = new("[^a-z0-9_\\-]", RegexOptions.Compiled);

    public static List<DropEntry> Read(Monster monster)
    {
        var entries = new List<DropEntry>();
        var table = monster != null ? monster.dropChances : null;
        if (table == null) return entries;

        foreach (var chance in table)
        {
            var item = chance != null ? chance.item : null;
            if (item == null) continue;

            // Source: Monster.cs:3136-3160. A quest item, and for a boss also an item a gather quest
            // asks for, drops only for a player who needs it.
            bool questBranch = item.isOnlyQuestItem || item.hasGatherQuest;
            var random = questBranch ? null : item.TryCast<RandomItem>();
            entries.Add(new DropEntry
            {
                ItemId = Id(item),
                ItemName = item.nameItem,
                Probability = chance.probability,
                CountsAsEquipment = CountsAsEquipment(item),
                RequiresQuest = item.isOnlyQuestItem || (monster.isBoss && item.hasGatherQuest),
                RandomItems = random != null ? Outcomes(random) : null,
            });
        }

        return entries;
    }

    // Same identifiers as the website's export (GameIds.Sanitize).
    public static string Id(ScriptableItem item) =>
        Unsafe.Replace(item.name.ToLowerInvariant().Replace(" ", "_"), string.Empty);

    // Source: Monster.cs:4321-4328, CountsAsGuaranteedBossEquipment.
    private static bool CountsAsEquipment(ScriptableItem item) =>
        item.quality > 0 && item.TryCast<EquipmentItem>() != null && item.TryCast<AugmentItem>() == null;

    private static DropOutcome[] Outcomes(RandomItem random)
    {
        var outcomes = new List<DropOutcome>();
        if (random.items != null)
        {
            foreach (var child in random.items)
            {
                if (child == null) continue;
                outcomes.Add(new DropOutcome { ItemId = Id(child), CountsAsEquipment = CountsAsEquipment(child) });
            }
        }

        return outcomes.ToArray();
    }
}
