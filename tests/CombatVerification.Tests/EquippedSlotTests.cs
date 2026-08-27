using CombatVerification.Engine;
using CombatVerification.Materialization;
using Xunit;

namespace CombatVerification.Tests
{
    /// <summary>
    /// The rule that decides whether a worn item counts.
    /// </summary>
    /// <remarks>
    /// This was derived separately in the build steps and in the probe, so a change in one would
    /// have left the other reporting a contribution the engine does not apply. It lives here now,
    /// and these are the cases that distinguish it from asking whether a slot is occupied.
    /// </remarks>
    public class EquippedSlotTests
    {
        [Fact]
        public void AnEmptySlotIsNeitherOccupiedNorCounted()
        {
            var slot = new EquippedSlot { Index = 3 };

            Assert.False(slot.Occupied);
            Assert.False(slot.Counts);
        }

        [Fact]
        public void AWornItemAboveZeroDurabilityCounts()
        {
            var slot = new EquippedSlot { Index = 0, ItemId = "plate_helm", Durability = 1 };

            Assert.True(slot.Occupied);
            Assert.True(slot.Counts);
        }

        [Fact]
        public void AWornOutItemIsOccupiedAndDoesNotCount()
        {
            // The engine aggregates a slot only above zero durability, so this is worn and
            // contributes nothing. A reader that asked only whether the slot was occupied would
            // report bonuses the character does not have.
            var slot = new EquippedSlot { Index = 0, ItemId = "plate_helm", Durability = 0 };

            Assert.True(slot.Occupied);
            Assert.False(slot.Counts);
        }
    }
}
