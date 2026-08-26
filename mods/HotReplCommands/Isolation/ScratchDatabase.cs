#nullable disable
using System;

namespace HotReplCommands.Isolation
{
    /// <summary>
    /// Resolves the scratch database path a verification run uses, and recognises
    /// whether a path lies inside it. No game-assembly references, so the test
    /// project compiles this directly.
    /// </summary>
    /// <remarks>
    /// The game runs under Wine and reports a Windows-style path, so both separators
    /// occur. Every comparison here normalises to forward slashes rather than relying
    /// on the host's separator.
    /// </remarks>
    public static class ScratchDatabase
    {
        /// <summary>Directory, beside the game's own database, that a run owns.</summary>
        public const string DirectoryName = "verification-scratch";

        private const string FileName = "game.dat";

        /// <summary>
        /// Scratch path beside <paramref name="currentDatabasePath"/>. Returns null when
        /// the input names no directory, because a run must not guess a location.
        /// </summary>
        public static string ResolveFrom(string currentDatabasePath)
        {
            // Resolving from an already-redirected path returns it unchanged, so a
            // repeated call cannot nest one scratch directory inside another.
            if (IsScratch(currentDatabasePath))
                return Normalize(currentDatabasePath);

            var directory = DirectoryOf(currentDatabasePath);
            return directory == null ? null : $"{directory}/{DirectoryName}/{FileName}";
        }

        /// <summary>
        /// True when <paramref name="databasePath"/> lies inside a scratch directory.
        /// A run refuses to start when this is false.
        /// </summary>
        public static bool IsScratch(string databasePath)
        {
            if (string.IsNullOrWhiteSpace(databasePath))
                return false;

            var normalized = Normalize(databasePath);
            var segment = $"/{DirectoryName}/";

            // A trailing directory name is not a database file, so require a following segment.
            return normalized.IndexOf(segment, StringComparison.Ordinal) >= 0
                   && !normalized.EndsWith(segment, StringComparison.Ordinal);
        }

        private static string DirectoryOf(string path)
        {
            if (string.IsNullOrWhiteSpace(path))
                return null;

            var normalized = Normalize(path).TrimEnd('/');
            var cut = normalized.LastIndexOf('/');
            return cut <= 0 ? null : normalized.Substring(0, cut);
        }

        private static string Normalize(string path) => path.Replace('\\', '/');
    }
}
