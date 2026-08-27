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
    /// A companion the owner has hired.
    /// </summary>
    /// <remarks>
    /// The three values a hire rolls are assigned rather than obtained by hiring repeatedly. The
    /// engine draws them from a range it holds as literals inside the hire itself, so nothing can
    /// ask it for the range, and a fixture that waited for a matching roll would not terminate.
    /// <para>
    /// A declared multiplier is the value the companion ends with, not the value the roll produced.
    /// The engine adds the owner's veteran accumulation on top of the roll at hire, so the two
    /// differ for any owner that holds veteran points.
    /// </para>
    /// </remarks>
    public interface ICompanionUnderConstruction
    {
        /// <summary>The archetype the engine reports, which is what decides its resource.</summary>
        string Archetype { get; }

        /// <summary>The name the engine gave it, which is how a dismissal addresses it.</summary>
        string Name { get; }

        /// <summary>
        /// The race the engine rolled. A companion's race is drawn from a list its archetype
        /// allows, so it is neither a value a hire can request nor one worth assigning: assigning
        /// it would produce a companion the game never offers. A fixture that names a race is
        /// reproducible through the seed that governs the draw.
        /// </summary>
        string Race { get; }
        int Level { get; }
        float HealthMultiplier { get; }

        /// <summary>Energy for a Warrior or a Rogue, mana for every other archetype.</summary>
        float ResourceMultiplier { get; }

        int BaseCombat { get; }

        IReadOnlyList<EquipmentSlotState> Equipment { get; }

        void SetHealthMultiplier(float value);
        void SetResourceMultiplier(float value);
        void SetBaseCombat(int value);

        /// <summary>The engine's own answer for this companion's slot.</summary>
        bool CanEquip(int ownerInventoryIndex, int equipmentSlot);

        /// <summary>Equips from the owner's inventory through the companion's own command.</summary>
        void Equip(int ownerInventoryIndex, int equipmentSlot);

        void Unequip(int equipmentSlot);
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

        // --- companions ---

        /// <summary>Companions the owner currently holds, in the order the engine keeps them.</summary>
        IReadOnlyList<ICompanionUnderConstruction> Companions { get; }

        /// <summary>Whether the game offers this companion archetype for hire.</summary>
        bool ArchetypeExists(string archetype);

        long Gold { get; }

        /// <summary>Adds gold through the game's own command, so a hire can meet its price.</summary>
        void AddGold(long amount);

        /// <summary>The price the game itself asks for this archetype at the owner's standing.</summary>
        long HirePrice(string archetype);

        /// <summary>
        /// Hires through the same command the interface sends, including the gender roll and the
        /// generated name the interface supplies. The engine caps how many companions an owner may
        /// hold and reports nothing when the cap is reached, so the caller counts.
        /// </summary>
        void Hire(string archetype, long price);
    }
}
