#nullable disable
using System;
using System.Collections.Generic;

namespace HotReplCommands.World
{
    /// <summary>
    /// Outcome of <see cref="CharacterSelector.Select"/>: either the name to enter
    /// as, or a failure with a stable precondition code and a readable message.
    /// </summary>
    public sealed class CharacterSelection
    {
        public bool Ok { get; private set; }
        public string Name { get; private set; }
        public string Code { get; private set; }
        public string Message { get; private set; }

        public static CharacterSelection Selected(string name)
            => new CharacterSelection { Ok = true, Name = name };

        public static CharacterSelection Failed(string code, string message)
            => new CharacterSelection { Ok = false, Code = code, Message = message };
    }

    /// <summary>
    /// Chooses which character to enter the world as. No game-assembly references,
    /// so the test project compiles this directly.
    /// </summary>
    /// <remarks>
    /// The game lists characters with an unordered query, so the listed order is not
    /// a usable contract. Ordering here is ordinal: a total, culture-independent order
    /// over distinct names. Matching a requested name ignores letter case, because the
    /// game stores the name as a primary key that collates without case, and so treats
    /// two spellings as one character.
    /// </remarks>
    public static class CharacterSelector
    {
        /// <summary>Matches the code world entry already reported for an empty account.</summary>
        public const string NoCharactersCode = "characterMissing";
        public const string NotFoundCode = "characterNotFound";

        public static CharacterSelection Select(IReadOnlyList<string> available, string requested)
        {
            if (available == null || available.Count == 0)
                return CharacterSelection.Failed(
                    NoCharactersCode,
                    "The account holds no characters.");

            if (string.IsNullOrWhiteSpace(requested))
                return CharacterSelection.Selected(Lowest(available));

            for (var i = 0; i < available.Count; i++)
            {
                if (string.Equals(available[i], requested, StringComparison.OrdinalIgnoreCase))
                    return CharacterSelection.Selected(available[i]);
            }

            return CharacterSelection.Failed(
                NotFoundCode,
                $"No character named '{requested}'. Available: {string.Join(", ", Ordered(available))}.");
        }

        private static string Lowest(IReadOnlyList<string> available)
        {
            var lowest = available[0];
            for (var i = 1; i < available.Count; i++)
            {
                if (string.CompareOrdinal(available[i], lowest) < 0)
                    lowest = available[i];
            }

            return lowest;
        }

        private static string[] Ordered(IReadOnlyList<string> available)
        {
            var names = new string[available.Count];
            for (var i = 0; i < available.Count; i++)
                names[i] = available[i];
            Array.Sort(names, StringComparer.Ordinal);
            return names;
        }
    }
}
