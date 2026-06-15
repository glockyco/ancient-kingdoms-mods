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
    }
}
