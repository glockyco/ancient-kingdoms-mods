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
            List<SkillSpec>? skills = null,
            List<EquipmentSpec>? equipment = null)
            => new()
            {
                Class = "Warrior",
                Race = "Human",
                Level = level,
                VeteranPoints = veteranPoints,
                AllocatedAttributes = attributes ?? new Dictionary<string, int>(),
                Skills = skills ?? new List<SkillSpec>(),
                Equipment = equipment ?? new List<EquipmentSpec>(),
            };

        private static BuildStep Step(BuildOutcome outcome, string name)
            => outcome.Steps.Single(step => step.Name == name);

        /// <summary>A character that can equip, so an equipment test states only its own subject.</summary>
        private static FakeCharacter Equipper()
            => new FakeCharacter()
                .WithItem("plate_helm", maxDurability: 80, 0)
                .WithItem("plate_chest", maxDurability: 80, 2)
                .WithItem("iron_ring", maxDurability: 50, 4, 10);

        private static EquipmentSpec Entry(
            int slot, string itemId, string? augmentId = null, int? durability = null)
            => new() { Slot = slot, ItemId = itemId, AugmentId = augmentId, Durability = durability };

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
            Assert.Equal(
                new[] { "level", "veteran", "attributes", "skills", "equipment", "companions" },
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

        // --- equipment ---

        [Fact]
        public void ADeclaredItemReachesItsSlotAtTheItemsOwnDurability()
        {
            var character = Equipper();
            var outcome = CharacterBuilder.Run(character, Spec(
                equipment: new List<EquipmentSpec> { Entry(0, "plate_helm") }));

            Assert.True(outcome.Ok, outcome.Failure?.ToString());
            Assert.Equal("plate_helm", character.Equipment[0].ItemId);
            Assert.Equal(80, character.Equipment[0].Durability);
        }

        [Fact]
        public void AStatedDurabilityIsCarriedIntoTheSlot()
        {
            var character = Equipper();
            var outcome = CharacterBuilder.Run(character, Spec(
                equipment: new List<EquipmentSpec> { Entry(0, "plate_helm", durability: 7) }));

            Assert.True(outcome.Ok, outcome.Failure?.ToString());
            Assert.Equal(7, character.Equipment[0].Durability);
        }

        [Fact]
        public void AnAugmentTravelsWithTheItemIntoItsSlot()
        {
            var character = Equipper().WithItem("jagged_shard");
            var outcome = CharacterBuilder.Run(character, Spec(
                equipment: new List<EquipmentSpec>
                {
                    Entry(2, "plate_chest", augmentId: "jagged_shard"),
                }));

            Assert.True(outcome.Ok, outcome.Failure?.ToString());
            Assert.Equal("jagged_shard", character.Equipment[2].AugmentId);
            Assert.Contains("1 augmented", Step(outcome, "equipment").Detail);
        }

        [Fact]
        public void AnItemTheGameDoesNotDefineIsNamedRatherThanSkipped()
        {
            var character = Equipper();
            var outcome = CharacterBuilder.Run(character, Spec(
                equipment: new List<EquipmentSpec> { Entry(0, "helm_of_nothing") }));

            Assert.False(outcome.Ok);
            Assert.Contains("helm_of_nothing", outcome.Failure!.Detail);
        }

        [Fact]
        public void AnItemTheGameRefusesInThatSlotFailsWithoutIssuingTheCommand()
        {
            // The engine's own answer is read first, so a refusal is reported rather than
            // discovered by acting and finding nothing changed.
            var character = Equipper();
            var outcome = CharacterBuilder.Run(character, Spec(
                equipment: new List<EquipmentSpec> { Entry(3, "plate_helm") }));

            Assert.False(outcome.Ok);
            Assert.Contains("refuses", outcome.Failure!.Detail);
            Assert.Equal(0, character.EquipCalls);
        }

        [Fact]
        public void AGrantTheInventoryCannotHoldIsCaughtByReadingItBack()
        {
            var character = Equipper();
            character.InventoryCapacity = 0;

            var outcome = CharacterBuilder.Run(character, Spec(
                equipment: new List<EquipmentSpec> { Entry(0, "plate_helm") }));

            Assert.False(outcome.Ok);
            Assert.Contains("did not reach the inventory", outcome.Failure!.Detail);
        }

        [Fact]
        public void AnEquipThePermittedEngineThenIgnoresIsCaughtByReadingTheSlot()
        {
            // The case a returned call cannot detect: permitted, issued, and silently dropped.
            var character = Equipper();
            character.IgnoreEquipInto.Add(0);

            var outcome = CharacterBuilder.Run(character, Spec(
                equipment: new List<EquipmentSpec> { Entry(0, "plate_helm") }));

            Assert.False(outcome.Ok);
            Assert.Equal(1, character.EquipCalls);
            Assert.Contains("holds nothing", outcome.Failure!.Detail);
            Assert.Contains("reported nothing", outcome.Failure.Detail);
        }

        [Fact]
        public void AStateThatForbidsItemOperationsIsNamed()
        {
            var character = Equipper();
            character.ItemOperationsAllowed = false;
            character.ActivityState = "DEAD";

            var outcome = CharacterBuilder.Run(character, Spec(
                equipment: new List<EquipmentSpec> { Entry(0, "plate_helm") }));

            Assert.False(outcome.Ok);
            Assert.Contains("DEAD", outcome.Failure!.Detail);
            Assert.Equal(0, character.EquipCalls);
        }

        [Fact]
        public void ASlotOutsideTheGamesRangeIsReportedWithTheCount()
        {
            var character = Equipper();
            var outcome = CharacterBuilder.Run(character, Spec(
                equipment: new List<EquipmentSpec> { Entry(99, "plate_helm") }));

            Assert.False(outcome.Ok);
            Assert.Contains("16", outcome.Failure!.Detail);
        }

        [Fact]
        public void AnItemThatCouldNotContributeIsRefusedBeforeItIsGranted()
        {
            var character = new FakeCharacter().WithItem("paper_hat", maxDurability: 0, 0);
            var outcome = CharacterBuilder.Run(character, Spec(
                equipment: new List<EquipmentSpec> { Entry(0, "paper_hat") }));

            Assert.False(outcome.Ok);
            Assert.Contains("could not", outcome.Failure!.Detail);
            Assert.Equal(0, character.EquipCalls);
        }

        [Fact]
        public void EquipmentRunsOnlyAfterTheAllocationStepsSucceed()
        {
            var character = Equipper().WithSkill("Melee Attack", maxLevel: 5);
            var outcome = CharacterBuilder.Run(character, Spec(
                level: 3,
                attributes: new Dictionary<string, int> { ["strength"] = 9 },
                equipment: new List<EquipmentSpec> { Entry(0, "plate_helm") }));

            Assert.False(outcome.Ok);
            Assert.DoesNotContain("equipment", outcome.Steps.Select(step => step.Name));
            Assert.Equal(0, character.EquipCalls);
        }

        [Fact]
        public void ASlotTheFixtureDoesNotDeclareIsEmptied()
        {
            // A created character wears starter equipment. Left on, it would contribute to every
            // measurement while no fixture mentioned it.
            var character = Equipper().Wearing(2, "starter_shirt").Wearing(9, "starter_shoes");
            var outcome = CharacterBuilder.Run(character, Spec(
                equipment: new List<EquipmentSpec> { Entry(0, "plate_helm") }));

            Assert.True(outcome.Ok, outcome.Failure?.ToString());
            Assert.Equal("plate_helm", character.Equipment[0].ItemId);
            Assert.Null(character.Equipment[2].ItemId);
            Assert.Null(character.Equipment[9].ItemId);
            Assert.Contains("cleared 2 slots", Step(outcome, "equipment").Detail);
        }

        [Fact]
        public void ADeclaredSlotHoldingStarterEquipmentIsSwapped()
        {
            var character = Equipper().Wearing(2, "starter_shirt");
            var outcome = CharacterBuilder.Run(character, Spec(
                equipment: new List<EquipmentSpec> { Entry(2, "plate_chest") }));

            Assert.True(outcome.Ok, outcome.Failure?.ToString());
            Assert.Equal("plate_chest", character.Equipment[2].ItemId);
        }

        [Fact]
        public void AnAbsentEquipmentSectionLeavesTheSlotsAlone()
        {
            var character = Equipper().Wearing(2, "starter_shirt");
            var spec = Spec();
            spec.Equipment = null;

            var outcome = CharacterBuilder.Run(character, spec);

            Assert.True(outcome.Ok, outcome.Failure?.ToString());
            Assert.Equal("starter_shirt", character.Equipment[2].ItemId);
            Assert.Contains("Not stated", Step(outcome, "equipment").Detail);
        }

        [Fact]
        public void AnEmptyEquipmentSectionStripsEverySlot()
        {
            var character = Equipper().Wearing(2, "starter_shirt").Wearing(9, "starter_shoes");
            var outcome = CharacterBuilder.Run(character, Spec(
                equipment: new List<EquipmentSpec>()));

            Assert.True(outcome.Ok, outcome.Failure?.ToString());
            Assert.All(character.Equipment, slot => Assert.Null(slot.ItemId));
        }

        // --- companions ---

        private static CompanionSpec Companion(
            string archetype,
            string? race = null,
            float? health = null,
            float? resource = null,
            int? baseCombat = null,
            List<EquipmentSpec>? equipment = null)
            => new()
            {
                Archetype = archetype,
                Race = race,
                HealthMultiplier = health,
                ResourceMultiplier = resource,
                BaseCombat = baseCombat,
                Equipment = equipment,
            };

        [Fact]
        public void ACompanionIsHiredAndTheValuesAFixtureStatesAreSet()
        {
            var character = Equipper();
            character.RacesByArchetype["Rogue"] = new[] { "Felarii" };

            var outcome = CharacterBuilder.Run(character, Spec(), new List<CompanionSpec>
            {
                Companion("Rogue", race: "Felarii", health: 0.93f, resource: 1.02f, baseCombat: 47),
            });

            Assert.True(outcome.Ok, outcome.Failure?.ToString());
            var companion = Assert.Single(character.Companions);
            Assert.Equal("Rogue", companion.Archetype);
            Assert.Equal("Felarii", companion.Race);
            Assert.Equal(0.93f, companion.HealthMultiplier);
            Assert.Equal(1.02f, companion.ResourceMultiplier);
            Assert.Equal(47, companion.BaseCombat);
            Assert.Equal(1, character.HireCalls);
        }

        [Fact]
        public void ARaceTheDrawDidNotProduceIsReportedAgainstTheFixture()
        {
            // The race cannot be requested and must not be assigned, so a fixture that names one
            // depends on the seed. A mismatch is reported rather than resampled, because
            // resampling would leak a companion the engine spawns into no slot.
            var character = Equipper();
            character.RacesByArchetype["Rogue"] = new[] { "Dwarf" };

            var outcome = CharacterBuilder.Run(character, Spec(), new List<CompanionSpec>
            {
                Companion("Rogue", race: "Felarii"),
            });

            Assert.False(outcome.Ok);
            Assert.Contains("rolled a Dwarf", outcome.Failure!.Detail);
            Assert.Contains("seed", outcome.Failure.Detail);
            Assert.Equal(1, character.HireCalls);
        }

        [Fact]
        public void ACompanionWithNoStatedRaceKeepsWhateverWasRolled()
        {
            var character = Equipper();
            character.RacesByArchetype["Druid"] = new[] { "Fire Goblin" };

            var outcome = CharacterBuilder.Run(character, Spec(), new List<CompanionSpec>
            {
                Companion("Druid"),
            });

            Assert.True(outcome.Ok, outcome.Failure?.ToString());
            Assert.Equal("Fire Goblin", Assert.Single(character.Companions).Race);
            Assert.Equal(1, character.HireCalls);
        }

        [Fact]
        public void CompanionsAreHiredOnlyAfterTheOwnersProgressionIsComplete()
        {
            // A companion gains base damage for every level its owner gains while present, so a
            // hire before progression would carry an increment no fixture asked for.
            var character = Equipper().WithSkill("Melee Attack", maxLevel: 5);
            var outcome = CharacterBuilder.Run(
                character,
                Spec(level: 6, skills: new List<SkillSpec>
                {
                    new() { Name = "Melee Attack", Level = 2 },
                }),
                new List<CompanionSpec> { Companion("Warrior") });

            Assert.True(outcome.Ok, outcome.Failure?.ToString());
            Assert.Equal("companions", outcome.Steps.Last().Name);
        }

        [Fact]
        public void AHireTheEngineChargesForButDoesNotProduceIsReported()
        {
            var character = Equipper();
            character.CompanionCap = 1;

            var outcome = CharacterBuilder.Run(character, Spec(), new List<CompanionSpec>
            {
                Companion("Warrior"),
                Companion("Cleric"),
            });

            Assert.False(outcome.Ok);
            Assert.Contains("caps how many", outcome.Failure!.Detail);
            Assert.Equal(2, character.HireCalls);
            Assert.Single(character.Companions);
        }

        [Fact]
        public void AnArchetypeTheGameDoesNotOfferIsNamed()
        {
            var character = Equipper();
            var outcome = CharacterBuilder.Run(character, Spec(), new List<CompanionSpec>
            {
                Companion("Necromancer"),
            });

            Assert.False(outcome.Ok);
            Assert.Contains("Necromancer", outcome.Failure!.Detail);
            Assert.Equal(0, character.HireCalls);
        }

        [Fact]
        public void AHireThatProducesAnotherArchetypeIsReported()
        {
            var character = Equipper();
            character.HiredArchetype = "Druid";

            var outcome = CharacterBuilder.Run(character, Spec(), new List<CompanionSpec>
            {
                Companion("Warrior"),
            });

            Assert.False(outcome.Ok);
            Assert.Contains("produced a Druid", outcome.Failure!.Detail);
        }

        [Fact]
        public void GoldIsAddedThroughTheGameSoAHireCanMeetItsPrice()
        {
            var character = Equipper();
            character.HirePriceEach = 1234;

            var outcome = CharacterBuilder.Run(character, Spec(), new List<CompanionSpec>
            {
                Companion("Ranger"),
            });

            Assert.True(outcome.Ok, outcome.Failure?.ToString());
            Assert.Equal(0, character.Gold);
        }

        [Fact]
        public void ACompanionIsEquippedFromTheOwnersInventory()
        {
            var character = Equipper();
            var outcome = CharacterBuilder.Run(character, Spec(), new List<CompanionSpec>
            {
                Companion("Warrior", equipment: new List<EquipmentSpec>
                {
                    Entry(2, "plate_chest"),
                }),
            });

            Assert.True(outcome.Ok, outcome.Failure?.ToString());
            var companion = Assert.Single(character.Companions);
            Assert.Equal("plate_chest", companion.Equipment[2].ItemId);
            Assert.Contains("1 equipped", Step(outcome, "companions").Detail);
        }

        [Fact]
        public void ACompanionEquipTheEngineIgnoresIsCaughtByReadingTheSlot()
        {
            var character = Equipper();
            character.CompanionIgnoresEquipInto.Add(0);

            var outcome = CharacterBuilder.Run(character, Spec(), new List<CompanionSpec>
            {
                Companion("Warrior", equipment: new List<EquipmentSpec>
                {
                    Entry(0, "plate_helm"),
                }),
            });

            Assert.False(outcome.Ok);
            Assert.Contains("holds nothing", outcome.Failure!.Detail);
            Assert.Null(character.Companions[0].Equipment[0].ItemId);
        }

        [Fact]
        public void AnAbsentCompanionSectionStatesNothing()
        {
            var character = Equipper();
            var outcome = CharacterBuilder.Run(character, Spec());

            Assert.True(outcome.Ok, outcome.Failure?.ToString());
            Assert.Contains("Not stated", Step(outcome, "companions").Detail);
            Assert.Equal(0, character.HireCalls);
        }

        [Fact]
        public void AnEmptyCompanionSectionStatesThereAreNone()
        {
            var character = Equipper();
            var outcome = CharacterBuilder.Run(character, Spec(), new List<CompanionSpec>());

            Assert.True(outcome.Ok, outcome.Failure?.ToString());
            Assert.Contains("None declared", Step(outcome, "companions").Detail);
            Assert.Equal(0, character.HireCalls);
        }

        [Fact]
        public void EveryDeclaredPieceIsEquippedSoASetThresholdCanBeReached()
        {
            var character = Equipper().WithItem("plate_legs", maxDurability: 80, 3);
            var outcome = CharacterBuilder.Run(character, Spec(
                equipment: new List<EquipmentSpec>
                {
                    Entry(0, "plate_helm"),
                    Entry(2, "plate_chest"),
                    Entry(3, "plate_legs"),
                }));

            Assert.True(outcome.Ok, outcome.Failure?.ToString());
            Assert.Equal(3, character.Equipment.Count(slot => slot.ItemId != null));
            Assert.Contains("Equipped 3 items", Step(outcome, "equipment").Detail);
        }
    }
}
