#nullable disable
using System.Collections.Generic;

namespace CombatVerification.Fixtures
{
    /// <summary>
    /// Game rules a fixture is checked against. The running game implements this from
    /// its own definitions, so the rules cannot drift from the game. A test implements
    /// it with synthetic values.
    /// </summary>
    /// <remarks>
    /// This is a port, not a copy: nothing here restates a table. Every value is read
    /// from the game at the point of use.
    /// </remarks>
    public interface IFixtureRules
    {
        /// <summary>Schema versions the harness can materialize.</summary>
        IReadOnlyCollection<int> SupportedSchemaVersions { get; }

        /// <summary>Highest level a character can reach.</summary>
        int MaxLevel { get; }

        /// <summary>Veteran points obtainable in total, once the level cap is reached.</summary>
        int MaxVeteranPoints { get; }

        /// <summary>Attribute names the game defines.</summary>
        IReadOnlyCollection<string> AttributeNames { get; }

        /// <summary>Equipment slot count, so a slot index can be bounds-checked.</summary>
        int EquipmentSlotCount { get; }

        /// <summary>Offhand slot index, used to enforce that a two-handed weapon leaves it empty.</summary>
        int OffhandSlot { get; }

        bool ClassExists(string className);

        /// <summary>Attribute points allocatable at this level, from levels and veteran awards.</summary>
        int AllocatableAttributePoints(int level, int veteranPoints);

        /// <summary>Skill points granted by reaching this level.</summary>
        int SkillPointsAtLevel(int level);

        bool TryGetSkill(string skillName, out SkillRule rule);

        bool TryGetItem(string itemName, out ItemRule rule);

        bool AugmentExists(string augmentName);

        bool ConsumableExists(string consumableName);
    }

    /// <summary>What a fixture needs to know about one skill to be checked.</summary>
    public sealed class SkillRule
    {
        public string Name { get; set; }
        public int MaxLevel { get; set; }
        public bool IsVeteran { get; set; }

        /// <summary>Classes that can learn it. Empty means the game gates it another way.</summary>
        public IReadOnlyCollection<string> Classes { get; set; }

        /// <summary>Total points to reach the given level, as the game charges them.</summary>
        public IReadOnlyList<int> CumulativeCost { get; set; }

        public int Tier { get; set; }
        public int RequiredSpentPoints { get; set; }
        public string PrerequisiteSkill { get; set; }
        public int PrerequisiteLevel { get; set; }
    }

    /// <summary>What a fixture needs to know about one item to be checked.</summary>
    public sealed class ItemRule
    {
        public string Name { get; set; }

        /// <summary>
        /// Slots this item may occupy. A category can be accepted by more than one slot: the
        /// game gives a character two ring slots and two ear slots, so an item is not tied to
        /// a single index.
        /// </summary>
        public IReadOnlyCollection<int> Slots { get; set; }

        public int LevelRequired { get; set; }

        /// <summary>Classes that can equip it. Empty means every class can.</summary>
        public IReadOnlyCollection<string> Classes { get; set; }

        /// <summary>Equipment category, which is also what marks a weapon two-handed.</summary>
        public string Category { get; set; }

        /// <summary>
        /// Whether the game treats it as two-handed. The game reads this from the category
        /// rather than from a flag, so this is derived the same way.
        /// </summary>
        public bool IsTwoHanded { get; set; }
    }
}
