#nullable disable

namespace CombatVerification.Engine
{
    /// <summary>
    /// What one slot of a container holds.
    /// </summary>
    /// <remarks>
    /// This is the shape every reader of the game's slots produces, so the questions that used to
    /// be answered separately in each of them are answered here once: whether a slot is occupied,
    /// what identifier names its item, and whether the engine counts it.
    /// <para>
    /// It carries no game type, so the rule it holds is testable without the game.
    /// </para>
    /// </remarks>
    public sealed class EquippedSlot
    {
        public int Index { get; set; }

        /// <summary>Identifier of the item in the slot, or null when the slot is empty.</summary>
        public string ItemId { get; set; }

        public string AugmentId { get; set; }

        /// <summary>Remaining durability, or zero when the slot is empty.</summary>
        public int Durability { get; set; }

        /// <summary>Whether the slot holds anything at all.</summary>
        public bool Occupied => ItemId != null;

        /// <summary>
        /// Whether the engine counts this slot when it aggregates. It counts a slot only above
        /// zero durability, so a worn-out item is worn and contributes nothing. Every reader and
        /// every step that depends on that rule reads it here.
        /// </summary>
        public bool Counts => Occupied && Durability > 0;
    }
}
