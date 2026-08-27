#nullable disable
using System.Collections.Generic;

namespace CombatVerification.Materialization
{
    /// <summary>
    /// The equipment of one entity: what it holds, and the commands that change it.
    /// </summary>
    /// <remarks>
    /// A player and a companion each carry equipment, and the game gives them separate components
    /// that declare the same operations. Reading is identical because both keep their slots on one
    /// base container. Acting differs only in which component the command is sent to and which
    /// acceptance check the item applies.
    /// <para>
    /// A member that acts returns nothing, so a caller reads the slot again rather than treating a
    /// returned call as success. The engine refuses in silence.
    /// </para>
    /// </remarks>
    public interface IEquipmentSurface
    {
        /// <summary>Slots the entity has, including the empty ones.</summary>
        IReadOnlyList<EquippedSlot> Slots { get; }

        /// <summary>One slot, by the index the engine addresses it with.</summary>
        EquippedSlot At(int index);

        /// <summary>
        /// The engine's own answer to whether the item at this inventory index may occupy this
        /// slot. Asking it is not a restatement of its rules: the class, level, category,
        /// occupancy and two-handed checks stay where the game implements them.
        /// </summary>
        bool CanEquip(int inventoryIndex, int equipmentSlot);

        /// <summary>Equips from the inventory this entity's command reads from.</summary>
        void Equip(int inventoryIndex, int equipmentSlot);

        /// <summary>
        /// Empties a slot, which moves the item to the inventory and therefore needs room there.
        /// </summary>
        void Unequip(int equipmentSlot);
    }
}
