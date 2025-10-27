// ============================================================================
// Ancient Kingdoms - Monster Drop Table Exporter
// ============================================================================
// This script exports all monster drop data from the game to a CSV file.
// 
// Output Format:
// - Zone: The zone/location where the monster is found
// - Monster: The monster's name
// - Item: The item that can drop
// - Probability: Drop chance (0.0 to 1.0, where 1.0 = 100%)
// - QuestOnly: If true, the item's isOnlyQuestItem flag is set
// - HasGatherQuest: If true, the item's hasGatherQuest flag is set
//
// Notes:
// - Some items appear multiple times in a monster's drop table
// - Monsters are deduplicated based on zone + name + complete drop table
// - Zone info is retrieved from monster.zoneMonster field or hierarchy
//
// Usage:
// 1. Run game with MelonLoader and Unity Explorer installed
// 2. Press F7 to open Unity Explorer
// 3. Go to C# Console tab
// 4. Paste this script and execute
// 5. Find output at E:\monster_drops.csv
// ============================================================================

var type = Il2CppType.Of<Il2Cpp.Monster>();
var monsters = Resources.FindObjectsOfTypeAll(type);

var seenMonsters = new System.Collections.Generic.HashSet<string>();
var lines = new System.Collections.Generic.List<string>();
lines.Add("Zone,Monster,Item,Probability,QuestOnly,HasGatherQuest");

foreach (var obj in monsters)
{
    var monster = obj.TryCast<Il2Cpp.Monster>();
    if (monster != null && monster.dropChances != null && monster.dropChances.Count > 0)
    {
        var zoneName = "Unknown";
        
        // Priority 1: Use zoneMonster field if populated
        if (!string.IsNullOrEmpty(monster.zoneMonster))
        {
            zoneName = monster.zoneMonster;
        }
        else
        {
            // Priority 2: Walk up GameObject hierarchy to find zone
            var transform = monster.transform;
            Transform root = transform;
            Transform potentialZone = null;
            
            while (root.parent != null)
            {
                potentialZone = root;
                root = root.parent;
            }
            
            if (potentialZone != null && potentialZone != transform)
            {
                zoneName = potentialZone.name;
            }
            else
            {
                zoneName = root.name;
            }
            
            // Clean up "Entities" suffix
            if (zoneName.EndsWith(" Entities"))
            {
                zoneName = zoneName.Substring(0, zoneName.Length - 9);
            }
        }
        
        // Create unique signature for this monster configuration
        var dropSignature = "";
        foreach (var drop in monster.dropChances)
        {
            if (drop.item != null)
            {
                dropSignature += $"{drop.item.name}:{drop.probability}:{drop.item.isOnlyQuestItem}:{drop.item.hasGatherQuest};";
            }
        }
        
        var uniqueKey = $"{zoneName}|{monster.name}|{dropSignature}";
        
        // Only export each unique monster configuration once
        if (!seenMonsters.Contains(uniqueKey))
        {
            seenMonsters.Add(uniqueKey);
            
            // Export all drops from the dropChances array
            foreach (var drop in monster.dropChances)
            {
                if (drop.item != null)
                {
                    lines.Add($"\"{zoneName}\",\"{monster.name}\",\"{drop.item.name}\",{drop.probability},{drop.item.isOnlyQuestItem},{drop.item.hasGatherQuest}");
                }
            }
        }
    }
}

// Write to CSV file
System.IO.File.WriteAllLines("E:\\monster_drops.csv", lines);
Log($"✓ Exported {lines.Count - 1} drop entries from {seenMonsters.Count} unique monster configurations");
Log($"✓ Output saved to: E:\\monster_drops.csv");