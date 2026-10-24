using System;
using System.Collections.Generic;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;
using UnityEngine.UI;

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
                description = "Cook food at Cooking Ovens.",
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
                description = "Complete Adventurer quests.",
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
                // Source: server-scripts/Player.cs:12589-12591 — Lorekeeping progress is books.Count / 17
                tracking_denominator = 17
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
                // Source: server-scripts/ZoneTrigger.cs:188 — Exploring progress is zonesDiscovered.Count / 46
                tracking_denominator = 46
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
                description = "Dig up buried treasure with maps.",
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
                description = "Collect scattered Radiant Sparks.",
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
                description = "Craft scrolls and cast their skills.",
                category = "crafting",
                icon_path = null, // resolved from the authoritative UI slot below
                achievement_id = "SCROLL_MASTERY_MASTER",
                max_level = 100,
                tracking_type = "float_level",
                tracking_denominator = null
            }
        };

        UpdateIconsFromUI(professions);

        WriteJson(professions, "professions.json");
        Logger.Msg($"✓ Exported {professions.Count} professions");
    }

    private void UpdateIconsFromUI(List<ProfessionData> professions)
    {
        Il2Cpp.UIProfessions uiProfessions = null;
        foreach (var obj in Resources.FindObjectsOfTypeAll(Il2CppType.Of<Il2Cpp.UIProfessions>()))
        {
            var candidate = obj.TryCast<Il2Cpp.UIProfessions>();
            if (candidate == null || candidate.gameObject == null || !candidate.gameObject.scene.IsValid())
                continue;

            if (uiProfessions != null)
                throw new InvalidOperationException("Multiple live UIProfessions scene instances are available.");
            uiProfessions = candidate;
        }

        if (uiProfessions == null)
            throw new InvalidOperationException("A live UIProfessions scene instance is unavailable.");
        if (VisualAssets == null)
            throw new InvalidOperationException("The profession visual asset registry is unavailable.");

        foreach (var profession in professions)
        {
            var slot = GetSlotForProfession(uiProfessions, profession.id);
            if (slot == null)
                throw new InvalidOperationException($"The live UIProfessions slot for '{profession.id}' is unavailable.");

            var image = GetIconImage(slot, profession.id);
            var sprite = image.sprite;
            profession.icon_path = sprite.name;
            VisualAssets.ExportSprite(
                "profession",
                profession.id,
                "icon",
                $"{GetHierarchyPath(image.transform)}.Image.sprite",
                sprite.GetType().FullName,
                sprite.name,
                sprite);
        }
        Logger.Msg($"Exported {professions.Count} profession icons from live UIProfessions slots");
    }

    private static Image GetIconImage(Il2Cpp.UIProfessionSlot slot, string professionId)
    {
        // All 13 live slots author their icon here; the slot's other Images are UI frames/labels.
        var icon = slot.transform.Find("0/icon")?.GetComponent<Image>();
        if (icon == null || icon.sprite == null)
            throw new InvalidOperationException(
                $"Profession '{professionId}' is missing {GetHierarchyPath(slot.transform)}/0/icon.Image.sprite.");
        return icon;
    }

    private static string GetHierarchyPath(Transform transform)
    {
        var names = new List<string>();
        while (transform != null)
        {
            names.Add($"{transform.name}[{transform.GetSiblingIndex()}]");
            transform = transform.parent;
        }
        names.Reverse();
        return string.Join("/", names);
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
