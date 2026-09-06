#nullable disable
using System;

namespace HotReplCommands.Isolation
{
    /// <summary>
    /// Resolves a verification scratch path and checks the exact installation-owned path
    /// before the runtime opens it. The helper has no game-assembly references.
    /// </summary>
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
        /// Recognises the absolute scratch database path shape without checking ownership.
        /// The runtime must also call <see cref="ValidateOwnedPath"/> before opening it.
        /// </summary>
        public static bool IsScratch(string databasePath)
        {
            if (string.IsNullOrWhiteSpace(databasePath))
                return false;

            var normalized = Normalize(databasePath);
            var absolute = normalized.StartsWith("/", StringComparison.Ordinal)
                || (normalized.Length > 3 && char.IsLetter(normalized[0])
                    && normalized[1] == ':' && normalized[2] == '/');
            if (!absolute) return false;
            foreach (var part in normalized.Split('/'))
                if (part == "." || part == "..") return false;
            return normalized.EndsWith($"/{DirectoryName}/{FileName}", StringComparison.Ordinal);
        }

        /// <summary>Checks the exact installation-owned path before the game opens it.</summary>
        public static string ValidateOwnedPath(string dataDirectory, string databasePath)
        {
            if (!IsScratch(databasePath))
                throw new System.IO.IOException($"Database path is not an absolute scratch database path: {databasePath}");
            var data = System.IO.Path.GetFullPath(dataDirectory);
            var directory = System.IO.Path.Combine(data, DirectoryName);
            var expected = System.IO.Path.Combine(directory, FileName);
            var actual = System.IO.Path.GetFullPath(databasePath);
            var comparison = System.OperatingSystem.IsWindows()
                ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
            if (!string.Equals(expected, actual, comparison))
                throw new System.IO.IOException($"Database path '{actual}' differs from owned path '{expected}'.");

            if (!System.IO.Directory.Exists(directory))
                throw new System.IO.DirectoryNotFoundException($"Scratch parent directory is missing: {directory}");
            foreach (var path in new[] { System.IO.Path.GetDirectoryName(data), data, directory, expected })
            {
                try
                {
                    var attributes = System.IO.File.GetAttributes(path);
                    if ((attributes & System.IO.FileAttributes.ReparsePoint) != 0)
                        throw new System.IO.IOException($"Owned database path contains a link: {path}");
                }
                catch (System.IO.FileNotFoundException) when (path == expected) { }
            }
            return actual;
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
