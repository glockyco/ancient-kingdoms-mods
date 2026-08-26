using HotReplCommands.World;
using Xunit;

namespace HotReplCommands.Tests
{
    public class CharacterSelectorTests
    {
        // The game lists characters with an unordered query, so a caller that takes
        // whatever came first gets an arbitrary subject. These tests pin the two
        // properties that make a measurement attributable: a stable default, and an
        // honoured request.

        [Fact]
        public void Default_IgnoresListedOrder()
        {
            var one = CharacterSelector.Select(new[] { "FxWarrior", "FxCleric", "FxRogue" }, null);
            var two = CharacterSelector.Select(new[] { "FxRogue", "FxWarrior", "FxCleric" }, null);

            Assert.True(one.Ok);
            Assert.Equal(one.Name, two.Name);
            Assert.Equal("FxCleric", one.Name);
        }

        [Fact]
        public void Default_FollowsTheNameSet()
        {
            var before = CharacterSelector.Select(new[] { "FxCleric", "FxRogue" }, null);
            var after = CharacterSelector.Select(new[] { "FxCleric", "FxRogue", "FxArcher" }, null);

            Assert.Equal("FxCleric", before.Name);
            Assert.Equal("FxArcher", after.Name);
        }

        [Fact]
        public void Default_TreatsBlankRequestAsAbsent()
        {
            var result = CharacterSelector.Select(new[] { "FxRogue", "FxCleric" }, "   ");

            Assert.True(result.Ok);
            Assert.Equal("FxCleric", result.Name);
        }

        [Fact]
        public void Requested_IsReturnedWhenPresent()
        {
            var result = CharacterSelector.Select(new[] { "FxCleric", "FxWarrior" }, "FxWarrior");

            Assert.True(result.Ok);
            Assert.Equal("FxWarrior", result.Name);
        }

        [Fact]
        public void Requested_MatchesIgnoringCaseAndReturnsTheHeldSpelling()
        {
            // The characters table keys the name with a case-insensitive collation,
            // so the game treats these as one character.
            var result = CharacterSelector.Select(new[] { "FxCleric", "FxWarrior" }, "fxwarrior");

            Assert.True(result.Ok);
            Assert.Equal("FxWarrior", result.Name);
        }

        [Fact]
        public void Requested_AbsentFailsAndNamesWhatIsAvailable()
        {
            var result = CharacterSelector.Select(new[] { "FxRogue", "FxCleric" }, "Aenwyn");

            Assert.False(result.Ok);
            Assert.Equal(CharacterSelector.NotFoundCode, result.Code);
            Assert.Contains("FxCleric", result.Message);
            Assert.Contains("FxRogue", result.Message);
            Assert.Null(result.Name);
        }

        [Fact]
        public void EmptySetFails()
        {
            var empty = CharacterSelector.Select(new string[0], null);
            var nothing = CharacterSelector.Select(null, "FxCleric");

            Assert.False(empty.Ok);
            Assert.Equal(CharacterSelector.NoCharactersCode, empty.Code);
            Assert.False(nothing.Ok);
            Assert.Equal(CharacterSelector.NoCharactersCode, nothing.Code);
        }
    }
}
