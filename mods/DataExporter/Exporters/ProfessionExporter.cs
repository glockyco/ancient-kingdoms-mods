using System.Collections.Generic;
using DataExporter.Models;
using MelonLoader;

namespace DataExporter.Exporters;

public class ProfessionExporter : BaseExporter
{
    public ProfessionExporter(MelonLogger.Instance logger, string exportPath, VisualAssetRegistry visualAssets) : base(logger, exportPath, visualAssets)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting professions...");

        var professions = new List<ProfessionData>
        {
            new ProfessionData
            {
                id = "alchemy",
                name = "Alchemy",
                description = "Brew potions and elixirs.",
                category = "crafting",
                icon_path = null, // resolved from the authoritative UI slot below
                achievement_id = "ALCHEMY_MASTER",
                max_level = 100,
                tracking_type = "float_level",
                tracking_denominator = null
            },
            new ProfessionData
            {
                id = "cooking",
                name = "Cooking",
                description = "Prepare food at cooking stations.",
                category = "crafting",
                icon_path = null, // resolved from the authoritative UI slot below
                achievement_id = "COOKING_MASTER",
                max_level = 100,
                tracking_type = "float_level",
                tracking_denominator = null
            },
            new ProfessionData
            {
                id = "herbalism",
                name = "Herbalism",
                description = "Gather plants and herbs.",
                category = "gathering",
                icon_path = null, // resolved from the authoritative UI slot below
                achievement_id = "FORAGING_MASTER",
                max_level = 100,
                tracking_type = "float_level",
                tracking_denominator = null
            },
            new ProfessionData
            {
                id = "mining",
                name = "Mining",
                description = "Mine ore and minerals.",
                category = "gathering",
                icon_path = null, // resolved from the authoritative UI slot below
                achievement_id = "MINING_MASTER",
                max_level = 100,
                tracking_type = "float_level",
                tracking_denominator = null
            },
            new ProfessionData
            {
                id = "fishing",
                name = "Fishing",
                description = "Catch fish at fishing spots.",
                category = "gathering",
                icon_path = null, // resolved from the authoritative UI slot below
                achievement_id = "FISHER_MASTER",
                max_level = 100,
                tracking_type = "float_level",
                tracking_denominator = null
            },
            new ProfessionData
            {
                id = "adventuring",
                name = "Adventuring",
                description = "Complete Adventurer's Guild quests.",
                category = "combat",
                icon_path = null, // resolved from the authoritative UI slot below
                achievement_id = "ADVENTURING_MASTER",
                max_level = 100,
                tracking_type = "float_level",
                tracking_denominator = null
            },
            new ProfessionData
            {
                id = "lore_keeping",
                name = "Lore Keeping",
                description = "Collect books and uncover lore.",
                category = "exploration",
                icon_path = null, // resolved from the authoritative UI slot below
                achievement_id = "LOREKEEPING_MASTER",
                max_level = 100,
                tracking_type = "count_based",
                tracking_denominator = 13
            },
            new ProfessionData
            {
                id = "exploring",
                name = "Exploring",
                description = "Discover areas of the world.",
                category = "exploration",
                icon_path = null, // resolved from the authoritative UI slot below
                achievement_id = "EXPLORING_MASTER",
                max_level = 100,
                tracking_type = "count_based",
                tracking_denominator = 45
            },
            new ProfessionData
            {
                id = "slayer",
                name = "Slayer",
                description = "Defeat bosses and elites.",
                category = "combat",
                icon_path = null, // resolved from the authoritative UI slot below
                achievement_id = "SLAYER_MASTER",
                max_level = 100,
                tracking_type = "float_level",
                tracking_denominator = null
            },
            new ProfessionData
            {
                id = "treasure_hunter",
                name = "Treasure Hunter",
                description = "Find treasure chests.",
                category = "exploration",
                icon_path = null, // resolved from the authoritative UI slot below
                achievement_id = "TREASURE_HUNTER_MASTER",
                max_level = 100,
                tracking_type = "float_level",
                tracking_denominator = null
            },
            new ProfessionData
            {
                id = "radiant_seeker",
                name = "Radiant Seeker",
                description = "Collect scattered radiant sparks.",
                category = "gathering",
                icon_path = null, // resolved from the authoritative UI slot below
                achievement_id = "RADIANT_SEEKER_MASTER",
                max_level = 100,
                tracking_type = "float_level",
                tracking_denominator = null
            },
            new ProfessionData
            {
                id = "hunter",
                name = "Hunter",
                description = "Track and hunt creatures.",
                category = "combat",
                icon_path = null, // resolved from the authoritative UI slot below
                achievement_id = "HUNTER_MASTER",
                max_level = 100,
                tracking_type = "float_level",
                tracking_denominator = null
            },
            new ProfessionData
            {
                id = "scroll_mastery",
                name = "Scroll Mastery",
                description = "Craft and use scrolls at scribing tables.",
                category = "crafting",
                icon_path = null, // resolved from the authoritative UI slot below
                achievement_id = "SCROLL_MASTERY_MASTER",
                max_level = 100,
                tracking_type = "float_level",
                tracking_denominator = null
            }
        };

        // Try to extract icon paths from UIProfessions if available
        TryUpdateIconsFromUI(professions);

        WriteJson(professions, "professions.json");
        Logger.Msg($"✓ Exported {professions.Count} professions");
    }

    private void TryUpdateIconsFromUI(List<ProfessionData> professions)
    {
        var uiProfessions = Il2Cpp.UIProfessions.singleton;
        if (uiProfessions == null)
        {
            Logger.Msg("UIProfessions.singleton not available, profession icons unavailable");
            return;
        }

        foreach (var profession in professions)
        {
            var slot = GetSlotForProfession(uiProfessions, profession.id);
            if (slot != null)
            {
                var image = slot.GetComponent<UnityEngine.UI.Image>();
                if (image != null && image.sprite != null)
                {
                    profession.icon_path = image.sprite.name;
                    VisualAssets?.ExportSprite(
                        "profession",
                        profession.id,
                        "icon",
                        "UIProfessionSlot.Image.sprite",
                        image.sprite.GetType().FullName,
                        image.sprite.name,
                        image.sprite);
                }
            }
        }
        Logger.Msg("Updated icon paths from UIProfessions UI");
    }

    private Il2Cpp.UIProfessionSlot GetSlotForProfession(Il2Cpp.UIProfessions ui, string professionId)
    {
        return professionId switch
        {
            "alchemy" => ui.slotAlchemy,
            "cooking" => ui.slotCooking,
            "herbalism" => ui.slotHerbalism,
            "mining" => ui.slotMining,
            "fishing" => ui.slotFishing,
            "adventuring" => ui.slotAdventuring,
            "lore_keeping" => ui.slotLoreKeeping,
            "exploring" => ui.slotExploring,
            "slayer" => ui.slotSlayer,
            "treasure_hunter" => ui.slotTreasureHunter,
            "radiant_seeker" => ui.slotRadiantSeeker,
            "hunter" => ui.slotHunter,
            "scroll_mastery" => ui.slotScrollMastery,
            _ => null
        };
    }
}
