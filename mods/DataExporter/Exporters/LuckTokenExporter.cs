using System.Collections.Generic;
using DataExporter.Models;
using MelonLoader;

namespace DataExporter.Exporters;

public class LuckTokenExporter : BaseExporter
{
    public LuckTokenExporter(MelonLogger.Instance logger, string exportPath)
        : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting luck tokens...");

        var luckTokenList = new List<LuckTokenData>();

        // Access GameManager singleton
        var gameManager = Il2Cpp.GameManager.singleton;
        if (gameManager == null)
        {
            Logger.Warning("GameManager.singleton is null, skipping luck token export");
            WriteJson(luckTokenList, "luck_tokens.json");
            return;
        }

        // Get boss luck tokens dictionary
        var bossTokensDict = gameManager.luckTokensDict;
        var fragmentTokensDict = gameManager.fragmentsLuckTokensDict;

        if (bossTokensDict == null || bossTokensDict.Count == 0)
        {
            Logger.Msg("No boss luck tokens found");
            WriteJson(luckTokenList, "luck_tokens.json");
            return;
        }

        Logger.Msg($"Found {bossTokensDict.Count} zones with luck tokens");

        // Process each zone with luck tokens
        foreach (var kvp in bossTokensDict)
        {
            var zoneId = kvp.Key;
            var bossToken = kvp.Value;

            if (bossToken == null)
                continue;

            var luckTokenData = new LuckTokenData
            {
                zone_id = GetZoneIdFromByte(zoneId),
                zone_name = GetZoneNameFromByte(zoneId),
                boss_luck_token_id = SanitizeId(bossToken.name),
                boss_luck_bonus = 0.05f,  // Hardcoded +5% in Monster.cs
                fragment_drop_chance = 0.02f  // Hardcoded 2% in Monster.cs
            };

            // Check if this zone has a fragment token
            if (fragmentTokensDict != null && fragmentTokensDict.TryGetValue(zoneId, out var fragmentToken))
            {
                if (fragmentToken != null)
                {
                    luckTokenData.fragment_token_id = SanitizeId(fragmentToken.name);
                }
            }

            luckTokenList.Add(luckTokenData);
        }

        WriteJson(luckTokenList, "luck_tokens.json");
        Logger.Msg($"✓ Exported {luckTokenList.Count} luck token configurations");
    }

    private string GetZoneIdFromByte(int zoneId)
    {
        if (Il2Cpp.ZoneInfo.zones != null && Il2Cpp.ZoneInfo.zones.ContainsKey((byte)zoneId))
        {
            var zone = Il2Cpp.ZoneInfo.zones[(byte)zoneId];
            if (zone != null && !string.IsNullOrEmpty(zone.name))
            {
                return SanitizeId(zone.name);
            }
        }

        return "unknown";
    }

    private string GetZoneNameFromByte(int zoneId)
    {
        if (Il2Cpp.ZoneInfo.zones != null && Il2Cpp.ZoneInfo.zones.ContainsKey((byte)zoneId))
        {
            var zone = Il2Cpp.ZoneInfo.zones[(byte)zoneId];
            if (zone != null && !string.IsNullOrEmpty(zone.name))
            {
                return zone.name;
            }
        }

        return "Unknown";
    }
}
