using System;
using CombatVerification.Materialization;
using Xunit;

namespace CombatVerification.Tests
{
    /// <summary>
    /// Names of the creator methods a materialization step calls.
    /// </summary>
    /// <remarks>
    /// The names are derived rather than tabulated, so a race the game adds needs no change here.
    /// A derived name that does not exist fails at the call site and names the method it wanted.
    /// </remarks>
    public class CreatorMethodsTests
    {
        [Theory]
        [InlineData("Human", "changeRaceHuman")]
        [InlineData("Fire Goblin", "changeRaceFireGoblin")]
        [InlineData("Dark Elf", "changeRaceDarkElf")]
        public void ARaceNameGivesTheCreatorMethodForThatRace(string race, string expected)
            => Assert.Equal(expected, CreatorMethods.RaceMethod(race));

        [Theory]
        [InlineData("fire_goblin", "changeRaceFireGoblin")]
        [InlineData("dark_elf", "changeRaceDarkElf")]
        public void AnIdentifierGivesTheSameMethodAsTheDisplayName(string race, string expected)
            => Assert.Equal(expected, CreatorMethods.RaceMethod(race));

        [Theory]
        [InlineData("Warrior", "changeClassWarrior")]
        [InlineData("druid", "changeClassDruid")]
        public void AClassNameGivesTheCreatorMethodForThatClass(string className, string expected)
            => Assert.Equal(expected, CreatorMethods.ClassMethod(className));

        [Theory]
        [InlineData("Druid", "DruidButton")]
        [InlineData("wizard", "WizardButton")]
        public void AClassNameGivesTheButtonTheCreatorEnables(string className, string expected)
            => Assert.Equal(expected, CreatorMethods.ClassButtonField(className));

        [Fact]
        public void MixedCaseIsNormalisedRatherThanPassedThrough()
        {
            // The creator's method names are Pascal case. A caller that supplies FIRE GOBLIN or
            // fireGoblin must reach the same method, otherwise the call fails for a reason that
            // has nothing to do with the game.
            Assert.Equal("changeRaceFireGoblin", CreatorMethods.RaceMethod("FIRE GOBLIN"));
            Assert.Equal("changeRaceFireGoblin", CreatorMethods.RaceMethod("fire goblin"));
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData("_")]
        public void AnEmptyNameIsRefusedRatherThanBuildingAMethodNameWithNoSubject(string? value)
            => Assert.Throws<ArgumentException>(() => CreatorMethods.RaceMethod(value));
    }
}
