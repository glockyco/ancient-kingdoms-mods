using System.Linq;
using HotRepl.Control;
using HotReplCommands;
using Xunit;

namespace HotReplCommands.Tests
{
    public class CommandCatalogTests
    {
        // Named rather than counted: adding a command must state what it is,
        // because build-tool and the documented workflow both address these by
        // name. A count only records how many there were.
        [Fact]
        public void Catalog_ExposesExactlyTheDocumentedCommands()
            => Assert.Equal(
                new[]
                {
                    "compendium.export",
                    "compendium.preflight",
                    "game.quit",
                    "world.enter",
                    "world.summary",
                },
                HotReplCommandCatalog.All.Select(e => e.Name).OrderBy(n => n).ToArray());

        [Theory]
        [InlineData("compendium.preflight", 1, ControlCommandKind.Sync, false)]
        [InlineData("world.summary",        1, ControlCommandKind.Sync, false)]
        [InlineData("world.enter",          2, ControlCommandKind.Job,  true)]
        [InlineData("compendium.export",    1, ControlCommandKind.Job,         true)]
        [InlineData("game.quit",            1, ControlCommandKind.Sync, true)]
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
