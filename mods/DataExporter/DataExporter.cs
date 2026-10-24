using System;
using System.IO;
using System.Collections.Generic;
using DataExporter.Exporters;
using DataExporter.Models;
using DataExporter.Sessions;
using MelonLoader;
using UnityEngine.InputSystem;

[assembly: MelonInfo(typeof(DataExporter.DataExporter), "DataExporter", "1.0.0", "WoW_Much")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace DataExporter
{
    public class DataExporter : MelonMod
    {
        private static readonly string ExportPath = OperatingSystem.IsWindows() && ExportConfig.ExportPath.StartsWith("/")
            ? "Z:" + ExportConfig.ExportPath
            : ExportConfig.ExportPath;
        private ConfiguredWorldSnapshot _worldSnapshot;
        private string _worldCaptureError;

        public override void OnSceneWasLoaded(int buildIndex, string sceneName)
        {
            if (sceneName != "World") return;
            _worldSnapshot?.Invalidate();
            _worldSnapshot = null;
            _worldCaptureError = null;
            try
            {
                _worldSnapshot = ConfiguredWorldSnapshot.Capture(LoggerInstance);
            }
            catch (Exception error)
            {
                _worldCaptureError = error.Message;
                LoggerInstance.Error($"Configured World capture failed: {error}. Reload World before exporting.");
            }
        }

        public override void OnSceneWasUnloaded(int buildIndex, string sceneName)
        {
            if (sceneName != "World") return;
            _worldSnapshot?.Invalidate();
            _worldSnapshot = null;
            _worldCaptureError = "World was unloaded";
            BaseExporter.ResetZoneTriggers();
        }

        public override void OnInitializeMelon()
        {
            LoggerInstance.Msg("DataExporter initialized!");
            LoggerInstance.Msg($"Export path: {ExportPath}");
            LoggerInstance.Msg("Press Shift+F9 to export all game data");

            if (!Directory.Exists(ExportPath))
            {
                Directory.CreateDirectory(ExportPath);
                LoggerInstance.Msg($"Created export directory: {ExportPath}");
            }
        }

        public override void OnUpdate()
        {
            // Check for Shift+F9 keybind
            var keyboard = Keyboard.current;
            if (keyboard == null) return;

            if ((keyboard.leftShiftKey.isPressed || keyboard.rightShiftKey.isPressed) &&
                keyboard.f9Key.wasPressedThisFrame)
            {
                ExportAllData();
            }
        }

        public ExportRunResult ExportAllData()
        {
            LoggerInstance.Msg("========================================");
            LoggerInstance.Msg("Starting data export...");
            LoggerInstance.Msg("========================================");

            var result = ExportSession.Run(ExportPath, Path.GetDirectoryName(UnityEngine.Application.dataPath)!,
                staging =>
                {
                    var visualAssets = new VisualAssetRegistry(LoggerInstance, staging);
                    return CreateCatalog(staging, visualAssets);
                });
            foreach (var error in result.Errors)
                LoggerInstance.Error(error);
            LoggerInstance.Msg("========================================");
            LoggerInstance.Msg(result.Ok
                ? $"✓ Export completed in {result.DurationMs / 1000.0:F2} seconds"
                : $"✗ Export completed with failures in {result.DurationMs / 1000.0:F2} seconds");
            LoggerInstance.Msg($"Output directory: {result.SessionPath}");
            LoggerInstance.Msg("========================================");

            return result;
        }

        private IReadOnlyList<ExporterDescriptor> CreateCatalog(string path, VisualAssetRegistry visuals)
        {
            var snapshot = _worldSnapshot ?? throw new InvalidOperationException(
                $"Configured World snapshot is unavailable ({_worldCaptureError ?? "World has not loaded"}). Reload World before exporting.");
            return new ExporterDescriptor[]
            {
                new("monsters", new[] { "monsters.json", "monster_spawns.json" }, () => new MonsterExporter(LoggerInstance, path, visuals, snapshot).Export()),
                new("npcs", new[] { "npcs.json", "npc_spawns.json" }, () => new NpcExporter(LoggerInstance, path, visuals, snapshot).Export()),
                new("items", new[] { "items.json" }, () => new ItemExporter(LoggerInstance, path, visuals).Export()),
                new("fish", new[] { "fish.json" }, () => new FishExporter(LoggerInstance, path).Export()),
                new("quests", new[] { "quests.json" }, () => new QuestExporter(LoggerInstance, path).Export()),
                new("skills", new[] { "skills.json" }, () => new SkillExporter(LoggerInstance, path, visuals).Export()),
                new("stats", new[] { "stats.json" }, () => new StatExporter(LoggerInstance, path).Export()),
                new("portals", new[] { "portals.json" }, () => new PortalExporter(LoggerInstance, path, snapshot).Export()),
                new("zoneInfo", new[] { "zone_info.json" }, () => new ZoneInfoExporter(LoggerInstance, path).Export()),
                new("zoneTriggers", new[] { "zone_triggers.json" }, () => new ZoneTriggerExporter(LoggerInstance, path).Export()),
                new("houses", new[] { "houses.json" }, () => new HouseExporter(LoggerInstance, path).Export()),
                new("gatherItems", new[] { "gather_items.json" }, () => new GatherItemExporter(LoggerInstance, path, visuals).Export()),
                new("craftingRecipes", new[] { "crafting_recipes.json" }, () => new CraftingRecipeExporter(LoggerInstance, path, snapshot).Export()),
                new("alchemyRecipes", new[] { "alchemy_recipes.json" }, () => new AlchemyRecipeExporter(LoggerInstance, path, snapshot).Export()),
                new("scribingRecipes", new[] { "scribing_recipes.json" }, () => new ScribingRecipeExporter(LoggerInstance, path, snapshot).Export()),
                new("summonTriggers", new[] { "summon_triggers.json" }, () => new SummonTriggerExporter(LoggerInstance, path, snapshot).Export()),
                new("luckTokens", new[] { "luck_tokens.json" }, () => new LuckTokenExporter(LoggerInstance, path).Export()),
                new("regionalEvents", new[] { "regional_events.json" }, () => new RegionalEventExporter(LoggerInstance, path).Export()),
                new("altars", new[] { "altars.json" }, () => new AltarExporter(LoggerInstance, path).Export()),
                new("treasureLocations", new[] { "treasure_locations.json" }, () => new TreasureLocationExporter(LoggerInstance, path).Export()),
                new("pets", new[] { "pets.json" }, () => new PetExporter(LoggerInstance, path, visuals).Export()),
                new("achievements", new[] { "achievements.json" }, () => new AchievementExporter(LoggerInstance, path).Export(), true,
                    new ImageReferences("achievements.json", "achievements",
                        json => ImageReferences.ReadFields(json, "unlocked_icon_path", "locked_icon_path"))),
                new("professions", new[] { "professions.json" }, () => new ProfessionExporter(LoggerInstance, path, visuals).Export()),
                new("craftingStations", new[] { "crafting_stations.json" }, () => new CraftingStationExporter(LoggerInstance, path, snapshot).Export()),
                new("alchemyTables", new[] { "alchemy_tables.json" }, () => new AlchemyTableExporter(LoggerInstance, path, snapshot).Export()),
                new("scribingTables", new[] { "scribing_tables.json" }, () => new ScribingTableExporter(LoggerInstance, path, snapshot).Export()),
                new("traps", new[] { "traps.json" }, () => new TrapExporter(LoggerInstance, path).Export()),
                new("gameConfig", new[] { "game_config.json" }, () => new GameConfigExporter(LoggerInstance, path, snapshot).Export()),
                new("classes", new[] { "classes_combat.json" }, () => new ClassExporter(LoggerInstance, path, visuals).Export()),
                new("equipmentSlots", new[] { "equipment_slots.json" }, () => new EquipmentSlotExporter(LoggerInstance, path).Export()),
                new("progression", new[] { "progression.json" }, () => new ProgressionExporter(LoggerInstance, path).Export()),
                new("gameGuide", new[] { "game_guide.json" }, () => new GameGuideExporter(LoggerInstance, path).Export()),
                new("worldMap", Array.Empty<string>(), () => new WorldMapExporter(LoggerInstance, path, visuals).Export()),
                new("visualAssets.manifest", new[] { "visual_assets.json" }, visuals.WriteManifest, true,
                    new ImageReferences("visual_assets.json", "visualAssets",
                        json => ImageReferences.ReadFields(json, "export_path"))),
            };
        }
    }
}
