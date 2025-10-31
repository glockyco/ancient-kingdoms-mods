using System;
using System.IO;
using DataExporter.Exporters;
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

        private void ExportAllData()
        {
            LoggerInstance.Msg("========================================");
            LoggerInstance.Msg("Starting data export...");
            LoggerInstance.Msg("========================================");

            var startTime = DateTime.Now;

            try
            {
                // Export monsters
                var monsterExporter = new MonsterExporter(LoggerInstance, ExportPath);
                monsterExporter.Export();

                // Export NPCs
                var npcExporter = new NpcExporter(LoggerInstance, ExportPath);
                npcExporter.Export();

                // Export items
                var itemExporter = new ItemExporter(LoggerInstance, ExportPath);
                itemExporter.Export();

                // Export quests
                var questExporter = new QuestExporter(LoggerInstance, ExportPath);
                questExporter.Export();

                // Export skills
                var skillExporter = new SkillExporter(LoggerInstance, ExportPath);
                skillExporter.Export();

                // Export portals
                var portalExporter = new PortalExporter(LoggerInstance, ExportPath);
                portalExporter.Export();

                // Export zones
                var zoneExporter = new ZoneExporter(LoggerInstance, ExportPath);
                zoneExporter.Export();

                // Export zone triggers
                var zoneTriggerExporter = new ZoneTriggerExporter(LoggerInstance, ExportPath);
                zoneTriggerExporter.Export();

                var elapsed = DateTime.Now - startTime;

                LoggerInstance.Msg("========================================");
                LoggerInstance.Msg($"✓ Export completed in {elapsed.TotalSeconds:F2} seconds");
                LoggerInstance.Msg($"✓ Output saved to: {ExportPath}");
                LoggerInstance.Msg("========================================");
            }
            catch (Exception ex)
            {
                LoggerInstance.Error("========================================");
                LoggerInstance.Error($"Export failed: {ex.Message}");
                LoggerInstance.Error($"Stack trace: {ex.StackTrace}");
                LoggerInstance.Error("========================================");
            }
        }
    }
}
