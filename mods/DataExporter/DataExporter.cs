using System;
using System.IO;
using DataExporter.Exporters;
using DataExporter.Models;
using MelonLoader;
using UnityEngine.InputSystem;

[assembly: MelonInfo(typeof(DataExporter.DataExporter), "DataExporter", "1.0.0", "WoW_Much")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace DataExporter
{
    public class DataExporter : MelonMod
    {
        private static readonly string ExportPath = ExportConfig.ExportPath;

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

            var startedAt = DateTime.UtcNow;
            var visualAssets = new VisualAssetRegistry(LoggerInstance, ExportPath);
            var result = new ExportRunResult
            {
                StartedAt = startedAt,
            };

            result.Exporters.Add(RunExporter("monsters", () =>
            {
                var exporter = new MonsterExporter(LoggerInstance, ExportPath, visualAssets);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("npcs", () =>
            {
                var exporter = new NpcExporter(LoggerInstance, ExportPath, visualAssets);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("items", () =>
            {
                var exporter = new ItemExporter(LoggerInstance, ExportPath, visualAssets);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("fish", () =>
            {
                var exporter = new FishExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("quests", () =>
            {
                var exporter = new QuestExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("skills", () =>
            {
                var exporter = new SkillExporter(LoggerInstance, ExportPath, visualAssets);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("portals", () =>
            {
                var exporter = new PortalExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("zoneInfo", () =>
            {
                var exporter = new ZoneInfoExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("zoneTriggers", () =>
            {
                var exporter = new ZoneTriggerExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("houses", () =>
            {
                var exporter = new HouseExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("gatherItems", () =>
            {
                var exporter = new GatherItemExporter(LoggerInstance, ExportPath, visualAssets);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("craftingRecipes", () =>
            {
                var exporter = new CraftingRecipeExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("alchemyRecipes", () =>
            {
                var exporter = new AlchemyRecipeExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("scribingRecipes", () =>
            {
                var exporter = new ScribingRecipeExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("summonTriggers", () =>
            {
                var exporter = new SummonTriggerExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("luckTokens", () =>
            {
                var exporter = new LuckTokenExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("altars", () =>
            {
                var exporter = new AltarExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("treasureLocations", () =>
            {
                var exporter = new TreasureLocationExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("pets", () =>
            {
                var exporter = new PetExporter(LoggerInstance, ExportPath, visualAssets);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("achievements", () =>
            {
                var exporter = new AchievementExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("professions", () =>
            {
                var exporter = new ProfessionExporter(LoggerInstance, ExportPath, visualAssets);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("craftingStations", () =>
            {
                var exporter = new CraftingStationExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("alchemyTables", () =>
            {
                var exporter = new AlchemyTableExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("scribingTables", () =>
            {
                var exporter = new ScribingTableExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("traps", () =>
            {
                var exporter = new TrapExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("gameConfig", () =>
            {
                var exporter = new GameConfigExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));

            result.Exporters.Add(RunExporter("classes", () =>
            {
                var exporter = new ClassExporter(LoggerInstance, ExportPath, visualAssets);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("equipmentSlots", () =>
            {
                var exporter = new EquipmentSlotExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("progression", () =>
            {
                var exporter = new ProgressionExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("gameGuide", () =>
            {
                var exporter = new GameGuideExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("visualAssets.manifest", visualAssets.WriteManifest));

            result.Ok = result.Exporters.TrueForAll(exporter => exporter.Ok);
            foreach (var exporter in result.Exporters)
            {
                if (!exporter.Ok && exporter.Error != null)
                    result.Errors.Add($"{exporter.Name}: {exporter.Error.Message}");
            }

            var completedAt = DateTime.UtcNow;
            result.CompletedAt = completedAt;
            result.DurationMs = (long)(completedAt - startedAt).TotalMilliseconds;
            LoggerInstance.Msg("========================================");
            LoggerInstance.Msg(result.Ok
                ? $"✓ Export completed in {result.DurationMs / 1000.0:F2} seconds"
                : $"✗ Export completed with failures in {result.DurationMs / 1000.0:F2} seconds");
            LoggerInstance.Msg($"Output directory: {ExportPath}");
            LoggerInstance.Msg("========================================");

            return result;
        }

        private ExporterRunResult RunExporter(string name, Action body)
        {
            try
            {
                body();
                return new ExporterRunResult { Name = name, Ok = true };
            }
            catch (Exception ex)
            {
                LoggerInstance.Error($"[{name}] export failed: {ex}");
                return new ExporterRunResult
                {
                    Name = name,
                    Ok = false,
                    Error = new ExporterRunError { Kind = "exporter_failed", Message = ex.Message },
                };
            }
        }
    }
}
