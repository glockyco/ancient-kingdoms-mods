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

        public void ExportAllData()
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

                // Export zone info (official zone data)
                var zoneInfoExporter = new ZoneInfoExporter(LoggerInstance, ExportPath);
                zoneInfoExporter.Export();

                // Export zone triggers (zone boundaries)
                var zoneTriggerExporter = new ZoneTriggerExporter(LoggerInstance, ExportPath);
                zoneTriggerExporter.Export();

                // Export gather items (herbs, ores, etc.)
                var gatherItemExporter = new GatherItemExporter(LoggerInstance, ExportPath);
                gatherItemExporter.Export();

                // Export crafting recipes
                var craftingRecipeExporter = new CraftingRecipeExporter(LoggerInstance, ExportPath);
                craftingRecipeExporter.Export();

                // Export alchemy recipes
                var alchemyRecipeExporter = new AlchemyRecipeExporter(LoggerInstance, ExportPath);
                alchemyRecipeExporter.Export();

                // Export summon triggers
                var summonTriggerExporter = new SummonTriggerExporter(LoggerInstance, ExportPath);
                summonTriggerExporter.Export();

                // Export luck tokens (boss and fragment tokens)
                var luckTokenExporter = new LuckTokenExporter(LoggerInstance, ExportPath);
                luckTokenExporter.Export();

                // Export altars (forgotten altar events)
                var altarExporter = new AltarExporter(LoggerInstance, ExportPath);
                altarExporter.Export();

                // Export treasure locations (dig spots for treasure maps)
                var treasureLocationExporter = new TreasureLocationExporter(LoggerInstance, ExportPath);
                treasureLocationExporter.Export();

                // Export pets (mercenaries and familiars)
                var petExporter = new PetExporter(LoggerInstance, ExportPath);
                petExporter.Export();

                // Export professions
                var professionExporter = new ProfessionExporter(LoggerInstance, ExportPath);
                professionExporter.Export();

                // Export crafting stations
                var craftingStationExporter = new CraftingStationExporter(LoggerInstance, ExportPath);
                craftingStationExporter.Export();

                // Export alchemy tables
                var alchemyTableExporter = new AlchemyTableExporter(LoggerInstance, ExportPath);
                alchemyTableExporter.Export();

                // Export traps (disarmable, dangerous ground, wall traps)
                var trapExporter = new TrapExporter(LoggerInstance, ExportPath);
                trapExporter.Export();

                // Export doors
                var doorExporter = new DoorExporter(LoggerInstance, ExportPath);
                doorExporter.Export();

                // Export interactive objects
                var interactiveObjectExporter = new InteractiveObjectExporter(LoggerInstance, ExportPath);
                interactiveObjectExporter.Export();

                // Export game config (bestiary monsters, mounts, seasonal items, special items)
                var gameConfigExporter = new GameConfigExporter(LoggerInstance, ExportPath);
                gameConfigExporter.Export();

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
