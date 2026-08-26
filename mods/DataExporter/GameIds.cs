using System.Text.RegularExpressions;

namespace DataExporter
{
    /// <summary>
    /// How a game asset's name becomes the identifier the compendium and its tooling use.
    /// </summary>
    /// <remarks>
    /// The identifier derives from the Unity asset name rather than the displayed name, so it
    /// survives a rename in a game update. Anything that resolves an exported identifier back
    /// to a game asset has to apply this same rule, so it lives here rather than inside one
    /// exporter.
    /// </remarks>
    public static class GameIds
    {
        /// <summary>
        /// Identifier for a player class, from the prefab that defines it. The prefabs are named
        /// "Player Cleric" and similar, so the prefix is dropped.
        /// </summary>
        public static string ClassId(string prefabName)
        {
            if (string.IsNullOrEmpty(prefabName))
                return prefabName;

            return Sanitize(prefabName.ToLowerInvariant().Replace("player ", string.Empty).Trim());
        }

        /// <summary>Identifier for an asset name, or the input when it is empty.</summary>
        public static string Sanitize(string input)
        {
            if (string.IsNullOrEmpty(input))
                return input;

            // Lower case, spaces to underscores, then drop anything not URL-safe.
            var sanitized = input.ToLowerInvariant().Replace(" ", "_");
            return Regex.Replace(sanitized, @"[^a-z0-9_\-]", "");
        }
    }
}
