#nullable disable
using System.Collections.Generic;

namespace CombatVerification.Materialization
{
    /// <summary>One skill as the character currently holds it.</summary>
    public sealed class SkillState
    {
        /// <summary>Index the upgrade command takes. The engine addresses a skill by position.</summary>
        public int Index { get; set; }

        public string Name { get; set; }
        public int Level { get; set; }
        public int MaxLevel { get; set; }
        public bool IsVeteran { get; set; }
    }

    /// <summary>
    /// The character a build step acts on.
    /// </summary>
    /// <remarks>
    /// The engine reports nothing when it refuses a mutation, so every step reads a value, acts,
    /// and reads again. This port exists so that reading and acting are separable and the build
    /// algorithm can be tested against an implementation that refuses the way the engine does.
    /// <para>
    /// A member that acts returns nothing. A caller must not treat a returned call as success.
    /// </para>
    /// </remarks>
    public interface ICharacterUnderConstruction
    {
        // --- progression ---

        int Level { get; }
        int MaxLevel { get; }

        /// <summary>Veteran points earned in total, spent and unspent.</summary>
        int TotalVeteranPoints { get; }

        int MaxVeteranPoints { get; }

        /// <summary>
        /// Experience still required for the next level or veteran point. Awarding exactly this
        /// much advances one step, because the engine's own loop subtracts this value once.
        /// </summary>
        long ExperienceForNextStep { get; }

        /// <summary>Awards experience. The engine grants the level and its points itself.</summary>
        void AwardExperience(long amount);

        // --- attributes ---

        int UnspentAttributePoints { get; }

        int AttributeValue(string attribute);

        /// <summary>Spends one point on an attribute through the engine's own command.</summary>
        void SpendAttributePoint(string attribute);

        // --- skills ---

        int UnspentSkillPoints { get; }
        int UnspentVeteranPoints { get; }

        /// <summary>Every skill the character holds, in the order the engine addresses them.</summary>
        IReadOnlyList<SkillState> Skills { get; }

        /// <summary>Spends one point on a skill through the engine's own command.</summary>
        void UpgradeSkill(int index, bool veteran);
    }
}
