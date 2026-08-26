using System.Collections.Generic;
using System.Linq;
using CombatVerification.Fixtures;
using CombatVerification.Materialization;
using Xunit;

namespace CombatVerification.Tests
{
    /// <summary>
    /// The build algorithm, against a character that refuses the way the engine refuses.
    /// </summary>
    public class CharacterBuilderTests
    {
        private static CharacterSpec Spec(
            int level = 1,
            int veteranPoints = 0,
            Dictionary<string, int>? attributes = null,
            List<SkillSpec>? skills = null)
            => new()
            {
                Class = "Warrior",
                Race = "Human",
                Level = level,
                VeteranPoints = veteranPoints,
                AllocatedAttributes = attributes ?? new Dictionary<string, int>(),
                Skills = skills ?? new List<SkillSpec>(),
                Equipment = new List<EquipmentSpec>(),
            };

        private static BuildStep StepNamed(BuildOutcome outcome, string name)
            => outcome.Steps.Single(step => step.Name == name);

        // --- preconditions ---

        [Fact]
        public void ACharacterAlreadyBuiltOnIsRefusedBeforeAnythingIsSpent()
        {
            // A fixture declares what it allocates, so a second run would spend it again and
            // produce a character no fixture describes.
            var character = new FakeCharacter().AtLevel(30);
            var outcome = CharacterBuilder.Run(character, Spec(
                level: 50,
                attributes: new Dictionary<string, int> { ["strength"] = 3 }));

            Assert.False(outcome.Ok);
            Assert.Single(outcome.Steps);
            Assert.Equal("untouched", outcome.Steps[0].Name);
            Assert.Equal(1, character.AttributeValue("strength"));
            Assert.Equal(0, character.AwardCalls);
        }

        // --- progression ---

        [Fact]
        public void LevelIsReachedByOneAwardPerLevel()
        {
            var character = new FakeCharacter();
            var outcome = CharacterBuilder.Run(character, Spec(level: 10));

            Assert.True(outcome.Ok, outcome.Failure?.ToString());
            Assert.Equal(10, character.Level);

            // Nine levels, nine awards. Awarding a large amount at once would spin the engine's
            // own loop, so the count is part of the contract rather than an implementation detail.
            Assert.Equal(9, character.AwardCalls);
        }

        [Fact]
        public void ALevelAlreadyPassedIsRefusedRatherThanIgnored()
        {
            var character = new FakeCharacter().AtLevel(20);
            var outcome = CharacterBuilder.Run(character, Spec(level: 10));

            Assert.False(outcome.Ok);
            Assert.Equal("untouched", outcome.Steps[0].Name);
        }

        [Fact]
        public void VeteranPointsAreAwardedOnlyAtTheLevelCap()
        {
            var character = new FakeCharacter();
            var outcome = CharacterBuilder.Run(character, Spec(level: 10, veteranPoints: 5));

            Assert.False(outcome.Ok);
            Assert.Contains("only at level 50", StepNamed(outcome, "veteran").Detail);
        }

        [Fact]
        public void VeteranPointsAreReachedAtTheCap()
        {
            var character = new FakeCharacter();
            var outcome = CharacterBuilder.Run(character, Spec(level: 50, veteranPoints: 7));

            Assert.True(outcome.Ok, outcome.Failure?.ToString());
            Assert.Equal(7, character.TotalVeteranPoints);

            // Forty-nine levels then seven veteran points, one award each.
            Assert.Equal(56, character.AwardCalls);
        }

        [Fact]
        public void AVeteranTotalBeyondTheCapStopsAndReportsTheCap()
        {
            var character = new FakeCharacter { MaxVeteranPoints = 3 };
            var outcome = CharacterBuilder.Run(character, Spec(level: 50, veteranPoints: 10));

            Assert.False(outcome.Ok);
            Assert.Contains("cap is 3", StepNamed(outcome, "veteran").Detail);
        }

        // --- attributes ---

        [Fact]
        public void AttributePointsAreSpentThroughTheEngine()
        {
            var character = new FakeCharacter();
            var outcome = CharacterBuilder.Run(character, Spec(
                level: 10,
                attributes: new Dictionary<string, int> { ["strength"] = 4, ["wisdom"] = 2 }));

            Assert.True(outcome.Ok, outcome.Failure?.ToString());
            Assert.Equal(5, character.AttributeValue("strength"));
            Assert.Equal(3, character.AttributeValue("wisdom"));
            Assert.Equal(3, character.UnspentAttributePoints);
        }

        [Fact]
        public void SpendingMoreThanTheBudgetStopsAndNamesTheAttribute()
        {
            var character = new FakeCharacter();
            var outcome = CharacterBuilder.Run(character, Spec(
                level: 3,
                attributes: new Dictionary<string, int> { ["strength"] = 9 }));

            Assert.False(outcome.Ok);
            var detail = StepNamed(outcome, "attributes").Detail;
            Assert.Contains("strength", detail);
            Assert.Contains("No unspent point", detail);
        }

        [Fact]
        public void AnAttributeTheEngineDoesNotAcceptIsReportedRatherThanCountedAsSpent()
        {
            // The engine has one command per attribute. A name with no command changes nothing
            // and says nothing, which is exactly the failure a returned call would hide.
            var character = new FakeCharacter();
            var outcome = CharacterBuilder.Run(character, Spec(
                level: 10,
                attributes: new Dictionary<string, int> { ["luck"] = 1 }));

            Assert.False(outcome.Ok);
            Assert.Contains("did not accept", StepNamed(outcome, "attributes").Detail);
        }

        // --- skills ---

        [Fact]
        public void SkillLevelsAreBoughtThroughTheEngine()
        {
            var character = new FakeCharacter().WithSkill("Melee Attack", maxLevel: 5);
            var outcome = CharacterBuilder.Run(character, Spec(
                level: 10,
                skills: new List<SkillSpec> { new() { Name = "Melee Attack", Level = 3 } }));

            Assert.True(outcome.Ok, outcome.Failure?.ToString());
            Assert.Equal(3, character.Skills.Single().Level);
        }

        [Fact]
        public void ASkillGatedOnSpentPointsIsBoughtAfterTheGateOpens()
        {
            // Listed before its gate is satisfied. A single pass in list order would refuse it,
            // and the engine would report nothing, so the fixture would silently come out wrong.
            var character = new FakeCharacter()
                .WithSkill("Cleave", maxLevel: 5, requiredSpent: 3)
                .WithSkill("Melee Attack", maxLevel: 5);

            var outcome = CharacterBuilder.Run(character, Spec(
                level: 20,
                skills: new List<SkillSpec>
                {
                    new() { Name = "Cleave", Level = 2 },
                    new() { Name = "Melee Attack", Level = 3 },
                }));

            Assert.True(outcome.Ok, outcome.Failure?.ToString());
            Assert.Equal(2, character.Skills.Single(s => s.Name == "Cleave").Level);
            Assert.Equal(3, character.Skills.Single(s => s.Name == "Melee Attack").Level);
        }

        [Fact]
        public void ASkillWhoseGateNeverOpensIsNamedRatherThanLeftShort()
        {
            var character = new FakeCharacter()
                .WithSkill("Cleave", maxLevel: 5, requiredSpent: 9);

            var outcome = CharacterBuilder.Run(character, Spec(
                level: 20,
                skills: new List<SkillSpec> { new() { Name = "Cleave", Level = 2 } }));

            Assert.False(outcome.Ok);
            var detail = StepNamed(outcome, "skills").Detail;
            Assert.Contains("Cleave at 0 of 2", detail);
            Assert.Contains("points already spent", detail);
        }

        [Fact]
        public void ASkillTheCharacterDoesNotHoldIsNamed()
        {
            var character = new FakeCharacter().WithSkill("Melee Attack");
            var outcome = CharacterBuilder.Run(character, Spec(
                level: 20,
                skills: new List<SkillSpec> { new() { Name = "Whirlwind", Level = 1 } }));

            Assert.False(outcome.Ok);
            Assert.Contains("does not hold it", StepNamed(outcome, "skills").Detail);
        }

        [Fact]
        public void ARefusedUpgradeStopsInsteadOfLooping()
        {
            var character = new FakeCharacter().WithSkill("Cleave", maxLevel: 5);
            character.Refuse.Add("Cleave");

            var outcome = CharacterBuilder.Run(character, Spec(
                level: 20,
                skills: new List<SkillSpec> { new() { Name = "Cleave", Level = 3 } }));

            Assert.False(outcome.Ok);
            Assert.Contains("Cleave at 0 of 3", StepNamed(outcome, "skills").Detail);
        }

        [Fact]
        public void VeteranSkillsSpendTheVeteranPoolAndNotTheNormalOne()
        {
            var character = new FakeCharacter()
                .WithSkill("Veteran Awareness", maxLevel: 10, veteran: true);

            var outcome = CharacterBuilder.Run(character, Spec(
                level: 50,
                veteranPoints: 4,
                skills: new List<SkillSpec> { new() { Name = "Veteran Awareness", Level = 3 } }));

            Assert.True(outcome.Ok, outcome.Failure?.ToString());
            Assert.Equal(3, character.Skills.Single().Level);
            Assert.Equal(1, character.UnspentVeteranPoints);
            Assert.Equal(49, character.UnspentSkillPoints);
        }

        // --- ordering ---

        [Fact]
        public void ProgressionRunsBeforeAllocationSoThePointsExist()
        {
            var character = new FakeCharacter().WithSkill("Melee Attack", maxLevel: 5);
            var outcome = CharacterBuilder.Run(character, Spec(
                level: 6,
                attributes: new Dictionary<string, int> { ["strength"] = 2 },
                skills: new List<SkillSpec> { new() { Name = "Melee Attack", Level = 2 } }));

            Assert.True(outcome.Ok, outcome.Failure?.ToString());
            Assert.Equal(new[] { "level", "veteran", "attributes", "skills" },
                outcome.Steps.Select(step => step.Name).ToArray());
        }

        [Fact]
        public void AFailedStepStopsTheRunSoNoLaterStepActsOnAWrongCharacter()
        {
            // Two attribute points exist at level three, and the fixture asks for nine, so
            // allocation fails and skill spending must not run on a half-allocated character.
            var character = new FakeCharacter().WithSkill("Melee Attack", maxLevel: 5);
            var outcome = CharacterBuilder.Run(character, Spec(
                level: 3,
                attributes: new Dictionary<string, int> { ["strength"] = 9 },
                skills: new List<SkillSpec> { new() { Name = "Melee Attack", Level = 2 } }));

            Assert.False(outcome.Ok);
            Assert.Equal(new[] { "level", "veteran", "attributes" },
                outcome.Steps.Select(step => step.Name).ToArray());
            Assert.Equal(0, character.Skills.Single().Level);
        }
    }
}
