using HotReplCommands.Isolation;
using Xunit;

namespace HotReplCommands.Tests
{
    public class ScratchDatabaseTests
    {
        // Redirecting the database is a global mutation that could reach a player's
        // save if the path were wrong, so the resolution and the guard are pinned here
        // rather than left to a live run to discover.

        private const string WindowsPath = @"C:\Program Files (x86)\Steam\ancientkingdoms_Data\game.dat";

        [Fact]
        public void ResolvesBesideTheGameDatabase()
        {
            var resolved = ScratchDatabase.ResolveFrom(WindowsPath);

            Assert.Equal(
                "C:/Program Files (x86)/Steam/ancientkingdoms_Data/verification-scratch/game.dat",
                resolved);
        }

        [Fact]
        public void ResolvesFromEitherSeparator()
        {
            var fromBackslash = ScratchDatabase.ResolveFrom(WindowsPath);
            var fromForwardSlash = ScratchDatabase.ResolveFrom(WindowsPath.Replace('\\', '/'));

            Assert.Equal(fromBackslash, fromForwardSlash);
        }

        [Fact]
        public void ResolvedPathIsRecognisedAsScratch()
            => Assert.True(ScratchDatabase.IsScratch(ScratchDatabase.ResolveFrom(WindowsPath)));

        [Theory]
        [InlineData(@"C:\Steam\ancientkingdoms_Data\game.dat")]
        [InlineData("/Users/someone/ancientkingdoms_Data/game.dat")]
        [InlineData("game.dat")]
        [InlineData("")]
        [InlineData(null)]
        public void PlayerAndUnqualifiedPathsAreNotScratch(string? path)
            => Assert.False(ScratchDatabase.IsScratch(path));

        [Fact]
        public void ADirectoryWithoutAFileIsNotScratch()
        {
            // Guards against accepting the directory itself as a database path.
            Assert.False(ScratchDatabase.IsScratch(
                "C:/Steam/ancientkingdoms_Data/verification-scratch/"));
        }

        [Theory]
        [InlineData("game.dat")]
        [InlineData("")]
        [InlineData(null)]
        public void UnresolvablePathsYieldNothing(string? path)
            => Assert.Null(ScratchDatabase.ResolveFrom(path));

        [Fact]
        public void ResolutionIsIdempotent()
        {
            // A second call against an already-redirected path must not nest a
            // scratch directory inside a scratch directory.
            var once = ScratchDatabase.ResolveFrom(WindowsPath);
            var twice = ScratchDatabase.ResolveFrom(once);

            Assert.Equal(once, twice);
        }
    }
}
