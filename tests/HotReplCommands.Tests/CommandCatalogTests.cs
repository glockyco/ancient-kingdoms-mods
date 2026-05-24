using System.Linq;
using HotRepl.Control;
using HotReplCommands;
using Xunit;

namespace HotReplCommands.Tests
{
    public class CommandCatalogTests
    {
        [Fact]
        public void Catalog_HasFourCommands()
            => Assert.Equal(4, HotReplCommandCatalog.All.Length);

        [Theory]
        [InlineData("compendium.preflight", 1, ControlCommandKind.Synchronous, false)]
        [InlineData("world.summary",        1, ControlCommandKind.Synchronous, false)]
        [InlineData("compendium.export",    1, ControlCommandKind.Job,         true)]
        [InlineData("game.quit",            1, ControlCommandKind.Synchronous, true)]
        public void Catalog_EntryHasExpectedMetadata(
            string name, int version, ControlCommandKind kind, bool mutates)
        {
            var entry = Assert.Single(HotReplCommandCatalog.All, e => e.Name == name);
            Assert.Equal(version, entry.Version);
            Assert.Equal(kind, entry.Kind);
            Assert.Equal(mutates, entry.MutatesState);
        }

        [Fact]
        public void Catalog_NamesAreUnique()
        {
            var names = HotReplCommandCatalog.All.Select(e => e.Name).ToList();
            Assert.Equal(names.Count, names.Distinct().Count());
        }
    }
}
