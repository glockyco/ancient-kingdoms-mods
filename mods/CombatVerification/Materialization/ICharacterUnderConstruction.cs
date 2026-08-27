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

    /// <summary>What one equipment slot holds.</summary>
    public sealed class EquipmentSlotState
    {
        public int Index { get; set; }

        /// <summary>Identifier of the item in the slot, or null when the slot is empty.</summary>
        public string ItemId { get; set; }

        public string AugmentId { get; set; }

        /// <summary>
        /// Remaining durability. The engine counts a slot's bonuses only while this is above
        /// zero, so a slot holding a worn-out item contributes nothing.
        /// </summary>
        public int Durability { get; set; }
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

        // --- equipment ---

        /// <summary>
        /// Whether the engine currently permits an item operation. It refuses outside a small set
        /// of activity states, and it refuses silently.
        /// </summary>
        bool ItemOperationsAllowed { get; }

        /// <summary>The activity state the engine reports, so a refusal can name it.</summary>
        string ActivityState { get; }

        /// <summary>Every equipment slot, in the order the engine addresses them.</summary>
        IReadOnlyList<EquipmentSlotState> Equipment { get; }

        /// <summary>Whether the game defines an item under this identifier.</summary>
        bool ItemExists(string itemId);

        /// <summary>
        /// The durability a new instance of this item carries. A fixture that states no
        /// durability gets an undamaged item, which is the only value a player can obtain.
        /// </summary>
        int MaxDurability(string itemId);

        /// <summary>Puts an item into the character's inventory, carrying its augment.</summary>
        void GrantItem(string itemId, int durability, string augmentId);

        /// <summary>
        /// Where the inventory holds this item, or -1 when it holds none. The grant reports
        /// nothing about where it landed, so the position is read back.
        /// </summary>
        int FindInInventory(string itemId, string augmentId);

        /// <summary>
        /// The engine's own answer to whether this item may occupy this slot. Asking it is not a
        /// restatement of its rules: the class, level, category, occupancy and two-handed checks
        /// stay where the game implements them.
        /// </summary>
        bool CanEquip(int inventoryIndex, int equipmentSlot);

        /// <summary>Equips through the same command the interface sends.</summary>
        void Equip(int inventoryIndex, int equipmentSlot);

        /// <summary>
        /// Empties a slot through the game's own command, which moves the item to the inventory
        /// and therefore needs room there.
        /// </summary>
        void Unequip(int equipmentSlot);
    }
}
