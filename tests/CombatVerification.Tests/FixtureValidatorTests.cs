using System.Collections.Generic;
using System.Linq;
using CombatVerification.Builds;
using CombatVerification.Fixtures;
using Xunit;

namespace CombatVerification.Tests
{
    /// <summary>
    /// Each test fails exactly one rule, so a failure names the rule that broke rather
    /// than a fixture that is wrong in several ways at once. A clamped fixture would be
    /// measured as something other than what was asked for, so every case refuses.
    /// </summary>
    public class FixtureValidatorTests
    {
        private static SyntheticRules Rules() => new SyntheticRules()
            .WithSkill("Melee Attack", classes: new[] { "Warrior" })
            .WithSkill("Rupture", classes: new[] { "Warrior" }, requiredSpentPoints: 0)
            .WithSkill("Runebound Aegis", veteran: true, classes: new[] { "Warrior" })
            .WithSkill("Gated Skill", classes: new[] { "Warrior" }, requiredSpentPoints: 10)
            .WithSkill("Follow Up", classes: new[] { "Warrior" },
                       prerequisite: "Melee Attack", prerequisiteLevel: 2)
            .WithItem("Rusty Sword", slot: 12)
            .WithItem("Rusty Shield", slot: 13)
            .WithItem("Great Axe", slot: 12, twoHanded: true)
            .WithItem("Wizard Hat", slot: 0, classes: new[] { "Wizard" })
            .WithItem("Epic Blade", slot: 12, levelRequired: 45)
            .WithItem("forgotten_tome", slot: 0, isBook: true);

        /// <summary>A fixture that passes, which every test below mutates in one way.</summary>
        private static FixtureDescriptor Valid() => new FixtureDescriptor
        {
            SchemaVersion = FixtureShapeValidator.SupportedFixtureSchemaVersion,
            Build = BuildEnvelopeTestData.Create("1.0.0"),
            Name = "warrior-cap",
            BuildData = new LogicalBuildData
            {
                SchemaVersion = LogicalBuildAdapter.SchemaVersion,
                Player = new PlayerBuild
                {
                    EntityId = "player",
                    ClassId = "warrior",
                    RaceId = "human",
                    Level = 50,
                    VeteranPoints = 200,
                    Attributes = BuildEnvelopeTestData.Attributes(
                        new Dictionary<string, int> { ["strength"] = 40 }),
                    Skills = new List<AllocatedSkill>
                    {
                        new() { SkillId = "melee_attack", Level = 3, Pool = "normal" },
                    },
                    Equipment = new List<EquippedItem>
                    {
                        new() { Slot = 12, ItemId = "rusty_sword", Durability = 10, Amount = 1 },
                    },
                },
                Companions = new List<CompanionBuild>(),
                Consumables = new List<ItemQuantity>
                {
                    new() { ItemId = "roast_boar", Quantity = 1 },
                },
                Ammunition = new List<ItemQuantity>(),
                LearnedBookIds = new List<string>(),
                Provenance = new BuildProvenance { Kind = "authored", Source = "test" },
            },
            Execution = new FixtureExecution { Seed = 7 },
        };

        private static IReadOnlyList<FixtureProblem> Check(FixtureDescriptor f, IFixtureRules? r = null)
            => FixtureValidator.Validate(f, r ?? Rules()).Problems;

        private static void AssertRefused(FixtureDescriptor f, string field, IFixtureRules? r = null)
        {
            var problems = Check(f, r);
            Assert.True(problems.Count > 0, "expected the fixture to be refused");
            Assert.Contains(field, problems.Select(p => p.Field));
        }

        // --- the fixture that must pass ---

        [Fact]
        public void AValidFixtureIsAccepted()
            => Assert.Empty(Check(Valid()));

        [Fact]
        public void AFixtureThatDeclaresEmptySectionsIsAccepted()
        {
            var f = Valid();
            f.BuildData.Player.Skills = new List<AllocatedSkill>();
            f.BuildData.Player.Equipment = new List<EquippedItem>();
            f.BuildData.Player.Attributes = BuildEnvelopeTestData.Attributes();
            f.BuildData.Consumables = new List<ItemQuantity>();
            f.BuildData.Ammunition = new List<ItemQuantity>();
            f.Execution.Actions = null;      // no actions: a stat-sheet fixture
            f.BuildData.Companions = new List<CompanionBuild>();

            Assert.Empty(Check(f));
        }

        [Theory]
        [InlineData("buildData.player.attributes.allocated")]
        [InlineData("buildData.player.skills")]
        [InlineData("buildData.player.equipment")]
        [InlineData("buildData.companions")]
        [InlineData("buildData.consumables")]
        [InlineData("buildData.ammunition")]
        [InlineData("buildData.learnedBookIds")]
        public void AnAbsentStatBearingSectionIsRefused(string field)
        {
            var f = Valid();
            switch (field)
            {
                case "buildData.player.attributes.allocated": f.BuildData.Player.Attributes.Allocated = null!; break;
                case "buildData.player.skills": f.BuildData.Player.Skills = null!; break;
                case "buildData.player.equipment": f.BuildData.Player.Equipment = null!; break;
                case "buildData.companions": f.BuildData.Companions = null!; break;
                case "buildData.consumables": f.BuildData.Consumables = null!; break;
                case "buildData.ammunition": f.BuildData.Ammunition = null!; break;
                case "buildData.learnedBookIds": f.BuildData.LearnedBookIds = null!; break;
            }

            // Absent is not empty: it means nobody read the section.
            AssertRefused(f, field);
        }

        // --- descriptor level ---

        [Fact]
        public void NoDescriptorIsRefused()
            => AssertRefused(null!, "fixture");

        [Fact]
        public void AnUnsupportedSerializedSchemaVersionIsRefused()
        {
            var f = Valid(); f.Build.SerializedSchemaVersion = 99;
            AssertRefused(f, "build.serializedSchemaVersion");
        }

        [Fact]
        public void AMissingNameIsRefused()
        {
            var f = Valid(); f.Name = null;
            AssertRefused(f, "name");
        }

        [Fact]
        public void AMissingGameVersionIsRefused()
        {
            var f = Valid(); f.Build.GameData.GameVersion = "  ";
            AssertRefused(f, "build.gameData.gameVersion");
        }

        [Fact]
        public void AMissingSeedIsRefused()
        {
            var f = Valid(); f.Execution.Seed = null;
            AssertRefused(f, "execution.seed");
        }

        [Fact]
        public void AMissingCharacterIsRefused()
        {
            var f = Valid(); f.BuildData.Player = null;
            AssertRefused(f, "buildData.player");
        }

        [Fact]
        public void DuplicateLearnedBookIdsAreRefusedWithoutDeduplication()
        {
            var f = Valid();
            f.BuildData.LearnedBookIds = new List<string> { "forgotten_tome", "forgotten_tome" };

            AssertRefused(f, "buildData.learnedBookIds[1]");
        }

        [Fact]
        public void UnknownLearnedBookIdsAreRefused()
        {
            var f = Valid();
            f.BuildData.LearnedBookIds = new List<string> { "missing_tome" };

            AssertRefused(f, "buildData.learnedBookIds[0]");
        }

        [Fact]
        public void NonBookItemsCannotBeDeclaredAsLearnedBooks()
        {
            var f = Valid();
            f.BuildData.LearnedBookIds = new List<string> { "Rusty Sword" };

            AssertRefused(f, "buildData.learnedBookIds[0]");
        }

        [Fact]
        public void CataloguedLearnedBooksAreAccepted()
        {
            var f = Valid();
            f.BuildData.LearnedBookIds = new List<string> { "forgotten_tome" };

            Assert.Empty(Check(f));
        }

        // --- class, race, level ---

        [Fact]
        public void AMissingClassIsRefused()
        {
            var f = Valid(); f.BuildData.Player.ClassId = null;
            AssertRefused(f, "buildData.player.classId");
        }

        [Fact]
        public void AMissingRaceIsRefused()
        {
            var f = Valid(); f.BuildData.Player.RaceId = null;
            AssertRefused(f, "buildData.player.raceId");
        }

        [Fact]
        public void AnUnknownClassIsRefused()
        {
            var f = Valid(); f.BuildData.Player.ClassId = "necromancer";
            AssertRefused(f, "buildData.player.classId");
        }

        [Fact]
        public void AStablePrerequisiteIdIsAccepted()
        {
            var rules = Rules()
                .WithSkill("Charge", maxLevel: 1, classes: new[] { "Warrior" })
                .WithSkill("Vindication", maxLevel: 8, classes: new[] { "Warrior" },
                    prerequisite: "charge", prerequisiteLevel: 1);

            var f = Valid();
            f.BuildData.Player.Skills = new List<AllocatedSkill>
            {
                new() { SkillId = "charge", Level = 1, Pool = "normal" },
                new() { SkillId = "vindication", Level = 1, Pool = "normal" },
            };

            Assert.Empty(FixtureValidator.Validate(f, rules).Problems);
        }

        [Fact]
        public void ARaceTheValidatorCannotCheckIsNotRefusedHere()
        {
            // Whether a class accepts a race is held by the character creator, which is gone by
            // the time these rules are readable. Refusing here would need a second copy of that
            // table. Creation checks it against the creator instead, so a race that names
            // something is accepted at this stage.
            var f = Valid(); f.BuildData.Player.RaceId = "elf";
            Assert.Empty(FixtureValidator.Validate(f, Rules()).Problems);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(51)]
        public void ALevelOutsideTheReachableRangeIsRefused(int level)
        {
            var f = Valid();
            f.BuildData.Player.Level = level;
            f.BuildData.Player.VeteranPoints = 0;
            f.BuildData.Player.Skills = new List<AllocatedSkill>();
            f.BuildData.Player.Attributes = BuildEnvelopeTestData.Attributes();
            f.BuildData.Player.Equipment = new List<EquippedItem>();
            AssertRefused(f, "buildData.player.level");
        }

        // --- veteran progression ---

        [Fact]
        public void VeteranPointsBelowTheLevelCapAreRefused()
        {
            var f = Valid();
            f.BuildData.Player.Level = 40;
            f.BuildData.Player.Skills = new List<AllocatedSkill>();
            f.BuildData.Player.Attributes = BuildEnvelopeTestData.Attributes();
            f.BuildData.Player.Equipment = new List<EquippedItem>();
            AssertRefused(f, "buildData.player.veteranPoints");
        }

        [Fact]
        public void VeteranPointsAboveTheObtainableTotalAreRefused()
        {
            var f = Valid(); f.BuildData.Player.VeteranPoints = 201;
            AssertRefused(f, "buildData.player.veteranPoints");
        }

        // --- attributes ---

        [Fact]
        public void ANegativeAttributeAllocationIsRefused()
        {
            var f = Valid();
            f.BuildData.Player.Attributes = BuildEnvelopeTestData.Attributes(new Dictionary<string, int> { ["strength"] = -1 });
            AssertRefused(f, "buildData.player.attributes.allocated.strength");
        }

        [Fact]
        public void SpendingMoreAttributePointsThanAvailableIsRefused()
        {
            var f = Valid();
            // 49 from levels + 200 veteran = 249 allocatable
            f.BuildData.Player.Attributes = BuildEnvelopeTestData.Attributes(new Dictionary<string, int> { ["strength"] = 250 });
            AssertRefused(f, "buildData.player.attributes.allocated");
        }

        [Fact]
        public void SpendingExactlyTheAttributeBudgetIsAccepted()
        {
            var f = Valid();
            f.BuildData.Player.Attributes = BuildEnvelopeTestData.Attributes(new Dictionary<string, int> { ["strength"] = 249 });
            Assert.Empty(Check(f));
        }

        // --- skills ---

        [Fact]
        public void ASkillNamedTwiceIsRefused()
        {
            var f = Valid();
            f.BuildData.Player.Skills = new List<AllocatedSkill>
            {
                new AllocatedSkill { SkillId = "melee_attack", Level = 1, Pool = "normal" },
                new AllocatedSkill { SkillId = "melee_attack", Level = 2, Pool = "normal" },
            };
            AssertRefused(f, "buildData.player.skills[1].skillId");
        }

        [Fact]
        public void AnUnnamedSkillIsRefused()
        {
            var f = Valid();
            f.BuildData.Player.Skills = new List<AllocatedSkill> { new AllocatedSkill { SkillId = null, Level = 1, Pool = "normal" } };
            AssertRefused(f, "buildData.player.skills[0].skillId");
        }

        [Fact]
        public void AnUnknownSkillIsRefused()
        {
            var f = Valid();
            f.BuildData.Player.Skills = new List<AllocatedSkill> { new AllocatedSkill { SkillId = "fireball", Level = 1, Pool = "normal" } };
            AssertRefused(f, "buildData.player.skills.fireball");
        }

        [Fact]
        public void ASkillAboveItsMaximumLevelIsRefused()
        {
            var f = Valid();
            f.BuildData.Player.Skills = new List<AllocatedSkill>
                { new AllocatedSkill { SkillId = "melee_attack", Level = 6, Pool = "normal" } };
            AssertRefused(f, "buildData.player.skills.melee_attack");
        }

        [Fact]
        public void ASkillTheClassCannotLearnIsRefused()
        {
            var f = Valid();
            f.BuildData.Player.ClassId = "wizard";
            f.BuildData.Player.RaceId = "human";
            f.BuildData.Player.Equipment = new List<EquippedItem>();
            AssertRefused(f, "buildData.player.skills.melee_attack");
        }

        [Fact]
        public void AVeteranSkillBelowTheLevelCapIsRefused()
        {
            var f = Valid();
            f.BuildData.Player.Level = 40;
            f.BuildData.Player.VeteranPoints = 0;
            f.BuildData.Player.Attributes = BuildEnvelopeTestData.Attributes();
            f.BuildData.Player.Equipment = new List<EquippedItem>();
            f.BuildData.Player.Skills = new List<AllocatedSkill>
                { new AllocatedSkill { SkillId = "runebound_aegis", Level = 1, Pool = "veteran" } };
            AssertRefused(f, "buildData.player.skills.runebound_aegis");
        }

        [Fact]
        public void AnUnmetPrerequisiteIsRefused()
        {
            var f = Valid();
            f.BuildData.Player.Skills = new List<AllocatedSkill>
            {
                new AllocatedSkill { SkillId = "melee_attack", Level = 1, Pool = "normal" },   // needs 2
                new AllocatedSkill { SkillId = "follow_up", Level = 1, Pool = "normal" },
            };
            AssertRefused(f, "buildData.player.skills.follow_up");
        }

        [Fact]
        public void AMetPrerequisiteIsAccepted()
        {
            var f = Valid();
            f.BuildData.Player.Skills = new List<AllocatedSkill>
            {
                new AllocatedSkill { SkillId = "melee_attack", Level = 2, Pool = "normal" },
                new AllocatedSkill { SkillId = "follow_up", Level = 1, Pool = "normal" },
            };
            Assert.Empty(Check(f));
        }

        [Fact]
        public void ExceedingTheNormalSkillPoolIsRefused()
        {
            var f = Valid();
            f.BuildData.Player.Level = 2;              // 1 point available
            f.BuildData.Player.VeteranPoints = 0;
            f.BuildData.Player.Attributes = BuildEnvelopeTestData.Attributes();
            f.BuildData.Player.Equipment = new List<EquippedItem>();
            f.BuildData.Player.Skills = new List<AllocatedSkill>
                { new AllocatedSkill { SkillId = "melee_attack", Level = 5, Pool = "normal" } };  // costs 5
            AssertRefused(f, "buildData.player.skills");
        }

        [Fact]
        public void ExceedingTheVeteranSkillPoolIsRefused()
        {
            var f = Valid();
            f.BuildData.Player.VeteranPoints = 1;
            f.BuildData.Player.Attributes = BuildEnvelopeTestData.Attributes();
            f.BuildData.Player.Skills = new List<AllocatedSkill>
                { new AllocatedSkill { SkillId = "runebound_aegis", Level = 5, Pool = "veteran" } };  // costs 5
            AssertRefused(f, "buildData.player.skills");
        }

        [Fact]
        public void AnUnmetSpentPointGateIsRefused()
        {
            var f = Valid();
            f.BuildData.Player.Skills = new List<AllocatedSkill>
                { new AllocatedSkill { SkillId = "gated_skill", Level = 1, Pool = "normal" } };   // needs 10 spent elsewhere
            AssertRefused(f, "buildData.player.skills.gated_skill");
        }

        [Fact]
        public void AMetSpentPointGateIsAccepted()
        {
            var f = Valid();
            f.BuildData.Player.Skills = new List<AllocatedSkill>
            {
                new AllocatedSkill { SkillId = "melee_attack", Level = 5, Pool = "normal" },   // 5
                new AllocatedSkill { SkillId = "rupture", Level = 5, Pool = "normal" },        // 5  -> 10 spent
                new AllocatedSkill { SkillId = "gated_skill", Level = 1, Pool = "normal" },
            };
            Assert.Empty(Check(f));
        }

        // --- equipment ---

        [Theory]
        [InlineData(-1)]
        [InlineData(16)]
        public void ASlotOutsideTheRangeIsRefused(int slot)
        {
            var f = Valid();
            f.BuildData.Player.Equipment = new List<EquippedItem>
                { new EquippedItem { Slot = slot, ItemId = "rusty_sword", Durability = 10, Amount = 1 } };
            AssertRefused(f, slot < 0 ? "buildData.player.equipment[0].slot" : $"buildData.player.equipment[{slot}]");
        }

        [Fact]
        public void ASlotFilledTwiceIsRefused()
        {
            var f = Valid();
            f.BuildData.Player.Equipment = new List<EquippedItem>
            {
                new EquippedItem { Slot = 12, ItemId = "rusty_sword", Durability = 10, Amount = 1 },
                new EquippedItem { Slot = 12, ItemId = "great_axe", Durability = 10, Amount = 1 },
            };
            AssertRefused(f, "buildData.player.equipment[1].slot");
        }

        [Fact]
        public void AMissingItemNameIsRefused()
        {
            var f = Valid();
            f.BuildData.Player.Equipment = new List<EquippedItem> { new EquippedItem { Slot = 12, ItemId = null, Durability = 10, Amount = 1 } };
            AssertRefused(f, "buildData.player.equipment[0].itemId");
        }

        [Fact]
        public void AnUnknownItemIsRefused()
        {
            var f = Valid();
            f.BuildData.Player.Equipment = new List<EquippedItem>
                { new EquippedItem { Slot = 12, ItemId = "sword_of_nothing", Durability = 10, Amount = 1 } };
            AssertRefused(f, "buildData.player.equipment[12].itemId");
        }

        [Fact]
        public void AnItemFittingSeveralSlotsIsAcceptedInEither()
        {
            // The game gives a character two ring slots, so an item is not tied to one index.
            var rules = Rules().WithItem("Signet", slot: 4);

            foreach (var slot in new[] { 4, 10 })
            {
                var f = Valid();
                f.BuildData.Player.Equipment = new List<EquippedItem>
                    { new EquippedItem { Slot = slot, ItemId = "signet", Durability = 10, Amount = 1 } };

                Assert.Empty(Check(f, rules));
            }
        }

        [Fact]
        public void AnItemInASlotItDoesNotFitIsRefused()
        {
            var f = Valid();
            f.BuildData.Player.Equipment = new List<EquippedItem>
                { new EquippedItem { Slot = 5, ItemId = "rusty_sword", Durability = 10, Amount = 1 } };   // fits 12 only
            AssertRefused(f, "buildData.player.equipment[5]");
        }

        [Fact]
        public void AnItemAboveTheCharacterLevelIsRefused()
        {
            var f = Valid();
            f.BuildData.Player.Level = 40;
            f.BuildData.Player.VeteranPoints = 0;
            f.BuildData.Player.Attributes = BuildEnvelopeTestData.Attributes();
            f.BuildData.Player.Skills = new List<AllocatedSkill>();
            f.BuildData.Player.Equipment = new List<EquippedItem>
                { new EquippedItem { Slot = 12, ItemId = "epic_blade", Durability = 10, Amount = 1 } };   // needs 45
            AssertRefused(f, "buildData.player.equipment[12].itemId");
        }

        [Fact]
        public void AnItemTheClassCannotEquipIsRefused()
        {
            var f = Valid();
            f.BuildData.Player.Equipment = new List<EquippedItem>
                { new EquippedItem { Slot = 0, ItemId = "wizard_hat", Durability = 10, Amount = 1 } };
            AssertRefused(f, "buildData.player.equipment[0].itemId");
        }

        [Fact]
        public void AnUnknownAugmentIsRefused()
        {
            var f = Valid();
            f.BuildData.Player.Equipment = new List<EquippedItem>
                { new EquippedItem { Slot = 12, ItemId = "rusty_sword", AugmentId = "gem_of_lies", Durability = 10, Amount = 1 } };
            AssertRefused(f, "buildData.player.equipment[12].augmentId");
        }

        [Fact]
        public void ZeroDurabilityIsRefused()
        {
            var f = Valid();
            f.BuildData.Player.Equipment = new List<EquippedItem>
                { new EquippedItem { Slot = 12, ItemId = "rusty_sword", Durability = 0, Amount = 1 } };
            AssertRefused(f, "buildData.player.equipment[0].durability");
        }

        [Fact]
        public void ATwoHandedWeaponWithAFilledOffhandIsRefused()
        {
            var f = Valid();
            f.BuildData.Player.Equipment = new List<EquippedItem>
            {
                new EquippedItem { Slot = 12, ItemId = "great_axe", Durability = 10, Amount = 1 },
                new EquippedItem { Slot = 13, ItemId = "rusty_shield", Durability = 10, Amount = 1 },
            };
            AssertRefused(f, "buildData.player.equipment[13]");
        }

        [Fact]
        public void ATwoHandedWeaponWithAnEmptyOffhandIsAccepted()
        {
            var f = Valid();
            f.BuildData.Player.Equipment = new List<EquippedItem>
                { new EquippedItem { Slot = 12, ItemId = "great_axe", Durability = 10, Amount = 1 } };
            Assert.Empty(Check(f));
        }

        [Fact]
        public void AOneHandedWeaponWithAShieldIsAccepted()
        {
            var f = Valid();
            f.BuildData.Player.Equipment = new List<EquippedItem>
            {
                new EquippedItem { Slot = 12, ItemId = "rusty_sword", Durability = 10, Amount = 1 },
                new EquippedItem { Slot = 13, ItemId = "rusty_shield", Durability = 10, Amount = 1 },
            };
            Assert.Empty(Check(f));
        }

        // --- consumables and actions ---

        [Fact]
        public void ABlankConsumableIsRefused()
        {
            var f = Valid(); f.BuildData.Consumables = new List<ItemQuantity> { new() { ItemId = " ", Quantity = 1 } };
            AssertRefused(f, "buildData.consumables[0].itemId");
        }

        [Fact]
        public void AnUnknownConsumableIsRefused()
        {
            var f = Valid(); f.BuildData.Consumables = new List<ItemQuantity> { new() { ItemId = "elixir_of_fiction", Quantity = 1 } };
            AssertRefused(f, "buildData.consumables.elixir_of_fiction");
        }

        [Fact]
        public void AnActionWithoutASkillIsRefused()
        {
            var f = Valid();
            f.Execution.Actions = new List<ActionSpec> { new ActionSpec { Facing = "front" } };
            AssertRefused(f, "execution.actions[0].skill");
        }

        [Fact]
        public void AnActionWithoutAFacingIsRefused()
        {
            var f = Valid();
            f.Execution.Actions = new List<ActionSpec> { new ActionSpec { Skill = "Melee Attack" } };
            AssertRefused(f, "execution.actions[0].facing");
        }

        [Fact]
        public void AnActionWithASkillAndAFacingIsAccepted()
        {
            var f = Valid();
            f.Execution.Actions = new List<ActionSpec>
                { new ActionSpec { Skill = "Melee Attack", Facing = "front" } };
            Assert.Empty(Check(f));
        }

        // --- reporting ---

        [Fact]
        public void AProblemNamesTheFieldAndThePermittedRange()
        {
            var f = Valid(); f.BuildData.Player.Level = 99;

            var problem = Check(f).First(p => p.Field == "buildData.player.level");

            Assert.Contains("99", problem.Message);
            Assert.Contains("50", problem.Message);
        }

        [Fact]
        public void SeveralFaultsAreAllReported()
        {
            var f = Valid();
            f.Name = null;
            f.Execution.Seed = null;
            f.BuildData.Player.Level = 99;

            var fields = Check(f).Select(p => p.Field).ToList();

            Assert.Contains("name", fields);
            Assert.Contains("execution.seed", fields);
            Assert.Contains("buildData.player.level", fields);
        }
    }
}
