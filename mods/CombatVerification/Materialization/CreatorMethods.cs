#nullable disable
using System;
using System.Text;

namespace CombatVerification.Materialization
{
    /// <summary>
    /// Names of the character creator's own race and class methods.
    /// </summary>
    /// <remarks>
    /// The creator exposes one method for each race and one for each class, and their names
    /// carry the race or class in Pascal case. Deriving the name from the requested value
    /// keeps the harness from holding a table that could silently omit a race. A derived name
    /// that does not exist fails loudly and names the method it looked for, which a table
    /// would not.
    /// </remarks>
    public static class CreatorMethods
    {
        /// <summary>Method that selects a race, for example <c>changeRaceFireGoblin</c>.</summary>
        public static string RaceMethod(string race) => "changeRace" + PascalCase(race);

        /// <summary>Method that selects a class, for example <c>changeClassWarrior</c>.</summary>
        public static string ClassMethod(string className) => "changeClass" + PascalCase(className);

        /// <summary>
        /// Field holding the button for a class, for example <c>DruidButton</c>. The creator
        /// enables the button for a class the selected race allows.
        /// </summary>
        public static string ClassButtonField(string className) => PascalCase(className) + "Button";

        /// <summary>
        /// Pascal case with separators removed. <c>Fire Goblin</c> and <c>fire_goblin</c> both
        /// give <c>FireGoblin</c>, so a caller may use the name the game displays or the
        /// identifier the compendium publishes.
        /// </summary>
        public static string PascalCase(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
                throw new ArgumentException("A race or class name is required.", nameof(value));

            var builder = new StringBuilder(value.Length);
            var startOfWord = true;
            foreach (var character in value)
            {
                if (character == ' ' || character == '_' || character == '-')
                {
                    startOfWord = true;
                    continue;
                }

                builder.Append(startOfWord ? char.ToUpperInvariant(character) : char.ToLowerInvariant(character));
                startOfWord = false;
            }

            if (builder.Length == 0)
                throw new ArgumentException("A race or class name is required.", nameof(value));

            return builder.ToString();
        }
    }
}
