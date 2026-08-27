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
        /// <summary>Highest level a character can reach.</summary>
        int MaxLevel { get; }

        /// <summary>Veteran points obtainable in total, once the level cap is reached.</summary>
        int MaxVeteranPoints { get; }

        /// <summary>Attribute names the game defines.</summary>
        IReadOnlyCollection<string> AttributeNames { get; }

        /// <summary>
        /// Equipment slots one archetype carries, so a slot index can be bounds-checked.
        /// </summary>
        /// <remarks>
        /// Per archetype, because the slot table is serialized on each prefab rather than shared.
        /// </remarks>
        int EquipmentSlotCount(string archetype);

        /// <summary>
        /// Slots of this archetype that accept the category, which is the test the game applies.
        /// </summary>
        /// <remarks>
        /// The same category belongs to different slots for different archetypes. Slot 13 requires
        /// "Shield" for a Warrior, "Bow" for a Ranger and "Weapon" for a Rogue, so a bow fits no
        /// slot at all when the question is asked without naming the archetype.
        /// </remarks>
        IReadOnlyCollection<int> SlotsAccepting(string archetype, string category);

        /// <summary>Offhand slot index, used to enforce that a two-handed weapon leaves it empty.</summary>
        int OffhandSlot { get; }

        bool ClassExists(string className);

        /// <summary>Attribute points allocatable at this level, from levels and veteran awards.</summary>
        int AllocatableAttributePoints(int level, int veteranPoints);

        /// <summary>Skill points granted by reaching this level.</summary>
        int SkillPointsAtLevel(int level);

        /// <summary>
        /// Finds a skill by the name the game displays or by its asset identifier.
        /// </summary>
        /// <remarks>
        /// A fixture authored by hand carries display names, and a build captured from a game
        /// carries identifiers, so both resolve. An implementation that accepts only one form
        /// makes a fixture fail for a reason that has nothing to do with the game.
        /// </remarks>
        bool TryGetSkill(string skillName, out SkillRule rule);

        /// <summary>Finds an item by display name or asset identifier, as for a skill.</summary>
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
