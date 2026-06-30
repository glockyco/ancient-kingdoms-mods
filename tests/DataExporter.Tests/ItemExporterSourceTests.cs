using System;
using System.IO;
using Xunit;

namespace DataExporter.Tests
{
    public class ItemExporterSourceTests
    {
        [Fact]
        public void ExportedSellPrice_UsesGameGoldSellPriceSemantics()
        {
            var source = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "mods", "DataExporter", "Exporters", "ItemExporter.cs"));

            Assert.Contains("sell_price = CalculateSellPriceInGold(scriptableItem)", source);
            Assert.Contains("scriptableItem.buyToken.sellPrice * scriptableItem.sellPrice", source);
            Assert.DoesNotContain("sell_price = scriptableItem.sellPrice", source);
            Assert.DoesNotContain("scriptableItem.SellPriceInGold()", source);
        }

        [Fact]
        public void PatchContracts_ExportCriticalResistAndUpdatedConstants()
        {
            var repoRoot = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..");
            var itemDataSource = File.ReadAllText(Path.Combine(repoRoot, "mods", "DataExporter", "Models", "ItemData.cs"));
            var itemExporterSource = File.ReadAllText(Path.Combine(repoRoot, "mods", "DataExporter", "Exporters", "ItemExporter.cs"));
            var skillDataSource = File.ReadAllText(Path.Combine(repoRoot, "mods", "DataExporter", "Models", "SkillData.cs"));
            var skillExporterSource = File.ReadAllText(Path.Combine(repoRoot, "mods", "DataExporter", "Exporters", "SkillExporter.cs"));
            var luckTokenExporterSource = File.ReadAllText(Path.Combine(repoRoot, "mods", "DataExporter", "Exporters", "LuckTokenExporter.cs"));
            var npcExporterSource = File.ReadAllText(Path.Combine(repoRoot, "mods", "DataExporter", "Exporters", "NpcExporter.cs"));

            Assert.Contains("public float critical_resist { get; set; }", itemDataSource);
            Assert.Contains("critical_resist = equipItem.criticalResistBonus", itemExporterSource);
            Assert.Contains("critical_resist = augmentItem.criticalResistBonus", itemExporterSource);
            Assert.Contains("public LinearStatBonusFloat critical_resist_bonus { get; set; }", skillDataSource);
            Assert.Contains("critical_resist_bonus = new LinearStatBonusFloat { base_value = bonusSkill.criticalResistBonus.baseValue, bonus_per_level = bonusSkill.criticalResistBonus.bonusPerLevel }", skillExporterSource);
            Assert.Contains("fragment_drop_chance = 0.05f", luckTokenExporterSource);
            Assert.Contains("saleItems.Any(item => item != null)", npcExporterSource);
        }
    }
}
