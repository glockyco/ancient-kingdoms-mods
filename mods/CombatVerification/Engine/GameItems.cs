#nullable disable
using System.Collections.Generic;
using DataExporter;
using Il2Cpp;
using UnityEngine;

namespace CombatVerification.Engine
{
    /// <summary>
    /// Resolves the identifier a fixture uses to the item asset the game holds.
    /// </summary>
    /// <remarks>
    /// One owner, because a fixture is checked against the rules read from these assets and then
    /// materialized from the same assets. Two resolutions that disagreed would accept a fixture and
    /// then fail to grant the item it named, and the failure would look like a defect in the engine.
    /// <para>
    /// The identifier is derived the way the export derives it, so a fixture names an item the same
    /// way the compendium does.
    /// </para>
    /// </remarks>
    internal static class GameItems
    {
        /// <summary>
        /// Every item asset the game defines, keyed by the identifier a fixture uses. The first
        /// asset wins where two share an identifier, matching what the rules read.
        /// </summary>
        public static IEnumerable<KeyValuePair<string, ScriptableItem>> Enumerate()
        {
            var seen = new HashSet<string>();

            foreach (var asset in Resources.LoadAll<ScriptableItem>("Items"))
            {
                if (asset == null)
                    continue;

                var id = GameIds.Sanitize(asset.name);
                if (!seen.Add(id))
                    continue;

                yield return new KeyValuePair<string, ScriptableItem>(id, asset);
            }
        }

        /// <summary>The asset a fixture's identifier names, or null when the game defines none.</summary>
        public static ScriptableItem Find(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
                return null;

            var wanted = GameIds.Sanitize(id);
            foreach (var pair in Enumerate())
                if (pair.Key == wanted)
                    return pair.Value;

            return null;
        }
    }
}
