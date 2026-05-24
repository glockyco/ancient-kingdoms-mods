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

            // Ensure export directory exists
            try
            {
                if (!Directory.Exists(ExportPath))
                {
                    Directory.CreateDirectory(ExportPath);
                    LoggerInstance.Msg($"Created export directory: {ExportPath}");
                }
            }
            catch (Exception ex)
            {
                LoggerInstance.Error($"Failed to create export directory: {ex.Message}");
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

            result.Exporters.Add(RunExporter("monsters", required: true, () =>
            {
                var exporter = new MonsterExporter(LoggerInstance, ExportPath, visualAssets);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("npcs", required: true, () =>
            {
                var exporter = new NpcExporter(LoggerInstance, ExportPath, visualAssets);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("items", required: true, () =>
            {
                var exporter = new ItemExporter(LoggerInstance, ExportPath, visualAssets);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("quests", required: true, () =>
            {
                var exporter = new QuestExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("skills", required: true, () =>
            {
                var exporter = new SkillExporter(LoggerInstance, ExportPath, visualAssets);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("portals", required: true, () =>
            {
                var exporter = new PortalExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("zoneInfo", required: true, () =>
            {
                var exporter = new ZoneInfoExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("zoneTriggers", required: true, () =>
            {
                var exporter = new ZoneTriggerExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("houses", required: true, () =>
            {
                var exporter = new HouseExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("gatherItems", required: true, () =>
            {
                var exporter = new GatherItemExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("craftingRecipes", required: true, () =>
            {
                var exporter = new CraftingRecipeExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("alchemyRecipes", required: true, () =>
            {
                var exporter = new AlchemyRecipeExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("scribingRecipes", required: true, () =>
            {
                var exporter = new ScribingRecipeExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("summonTriggers", required: true, () =>
            {
                var exporter = new SummonTriggerExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("luckTokens", required: true, () =>
            {
                var exporter = new LuckTokenExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("altars", required: true, () =>
            {
                var exporter = new AltarExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("treasureLocations", required: true, () =>
            {
                var exporter = new TreasureLocationExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("pets", required: true, () =>
            {
                var exporter = new PetExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("professions", required: true, () =>
            {
                var exporter = new ProfessionExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("craftingStations", required: true, () =>
            {
                var exporter = new CraftingStationExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("alchemyTables", required: true, () =>
            {
                var exporter = new AlchemyTableExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("scribingTables", required: true, () =>
            {
                var exporter = new ScribingTableExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("traps", required: true, () =>
            {
                var exporter = new TrapExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("doors", required: true, () =>
            {
                var exporter = new DoorExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("interactiveObjects", required: true, () =>
            {
                var exporter = new InteractiveObjectExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("gameConfig", required: true, () =>
            {
                var exporter = new GameConfigExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("classes", required: true, () =>
            {
                var exporter = new ClassExporter(LoggerInstance, ExportPath);
                exporter.Export();
            }));
            result.Exporters.Add(RunExporter("visualAssets.manifest", required: true, visualAssets.WriteManifest));

            result.Ok = result.Exporters.TrueForAll(exporter => !exporter.Required || exporter.Ok);
            foreach (var exporter in result.Exporters)
            {
                if (exporter.Required && !exporter.Ok && exporter.Error != null)
                    result.Errors.Add($"{exporter.Name}: {exporter.Error.Message}");
            }

            var completedAt = DateTime.UtcNow;
            result.CompletedAt = completedAt;
            result.DurationMs = (long)(completedAt - startedAt).TotalMilliseconds;
            LoggerInstance.Msg("========================================");
            LoggerInstance.Msg(result.Ok
                ? $"✓ Export completed in {result.DurationMs / 1000.0:F2} seconds"
                : $"✗ Export completed with failures in {result.DurationMs / 1000.0:F2} seconds");
            LoggerInstance.Msg($"✓ Output saved to: {ExportPath}");
            LoggerInstance.Msg("========================================");

            return result;
        }

        private ExporterRunResult RunExporter(string name, bool required, Action body)
        {
            try
            {
                body();
                return new ExporterRunResult { Name = name, Ok = true, Required = required };
            }
            catch (Exception ex)
            {
                LoggerInstance.Error($"[{name}] export failed: {ex.Message}");
                LoggerInstance.Error(ex.StackTrace);
                return new ExporterRunResult
                {
                    Name = name,
                    Ok = false,
                    Required = required,
                    Error = new ExporterRunError { Kind = "exporter_failed", Message = ex.Message },
                };
            }
        }
    }
}
