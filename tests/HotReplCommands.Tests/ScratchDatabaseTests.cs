using System;
using System.IO;
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
        [InlineData("relative/verification-scratch/game.dat")]
        [InlineData("C:/game/verification-scratch/../verification-scratch/game.dat")]
        [InlineData("C:/game/verification-scratch/other.dat")]
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

        [Fact]
        public void OpeningRequiresTheExactOwnedPathAndExistingParent()
        {
            var root = Path.Combine(Path.GetTempPath(), "runtime-scratch-" + Guid.NewGuid().ToString("N"));
            var data = Path.Combine(root, "ancientkingdoms_Data");
            var expected = Path.Combine(data, ScratchDatabase.DirectoryName, "game.dat");
            Directory.CreateDirectory(data);
            try
            {
                Assert.Throws<DirectoryNotFoundException>(() => ScratchDatabase.ValidateOwnedPath(data, expected));
                Directory.CreateDirectory(Path.GetDirectoryName(expected)!);
                Assert.Equal(expected, ScratchDatabase.ValidateOwnedPath(data, expected));
                var foreign = Path.Combine(root, "other", ScratchDatabase.DirectoryName, "game.dat");
                Assert.Throws<IOException>(() => ScratchDatabase.ValidateOwnedPath(data, foreign));
                Assert.False(File.Exists(expected));
            }
            finally { Directory.Delete(root, recursive: true); }
        }

        [Fact]
        public void ALinkedScratchDirectoryCannotOpenAnExternalSave()
        {
            var root = Path.Combine(Path.GetTempPath(), "runtime-scratch-" + Guid.NewGuid().ToString("N"));
            var data = Path.Combine(root, "ancientkingdoms_Data");
            var external = Path.Combine(root, "player");
            Directory.CreateDirectory(data);
            Directory.CreateDirectory(external);
            File.WriteAllText(Path.Combine(external, "game.dat"), "player save");
            var scratch = Path.Combine(data, ScratchDatabase.DirectoryName);
            Directory.CreateSymbolicLink(scratch, external);
            try
            {
                Assert.Throws<IOException>(() => ScratchDatabase.ValidateOwnedPath(data, Path.Combine(scratch, "game.dat")));
                Assert.Equal("player save", File.ReadAllText(Path.Combine(external, "game.dat")));
            }
            finally
            {
                Directory.Delete(scratch);
                Directory.Delete(root, recursive: true);
            }
        }
    }
}
