using System.Collections.Generic;
using System.Linq;
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
            .WithItem("Epic Blade", slot: 12, levelRequired: 45);

        /// <summary>A fixture that passes, which every test below mutates in one way.</summary>
        private static FixtureDescriptor Valid() => new FixtureDescriptor
        {
            SchemaVersion = 1,
            GameVersion = "1.0.0",
            Name = "warrior-cap",
            Seed = 7,
            Character = new CharacterSpec
            {
                Class = "Warrior",
                Race = "Human",
                Level = 50,
                VeteranPoints = 200,
                AllocatedAttributes = new Dictionary<string, int> { ["strength"] = 40 },
                Skills = new List<SkillSpec> { new SkillSpec { Name = "Melee Attack", Level = 3 } },
                Equipment = new List<EquipmentSpec>
                {
                    new EquipmentSpec { Slot = 12, ItemId = "Rusty Sword", Durability = 10 },
                },
            },
            Consumables = new List<string> { "Roast Boar" },
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
            f.Character.Skills = new List<SkillSpec>();
            f.Character.Equipment = new List<EquipmentSpec>();
            f.Character.AllocatedAttributes = new Dictionary<string, int>();
            f.Consumables = new List<string>();
            f.Actions = null;      // no actions: a stat-sheet fixture
            f.Companions = null;   // no companions

            Assert.Empty(Check(f));
        }

        [Theory]
        [InlineData("character.allocatedAttributes")]
        [InlineData("character.skills")]
        [InlineData("character.equipment")]
        [InlineData("consumables")]
        public void AnAbsentStatBearingSectionIsRefused(string field)
        {
            var f = Valid();
            switch (field)
            {
                case "character.allocatedAttributes": f.Character.AllocatedAttributes = null; break;
                case "character.skills": f.Character.Skills = null; break;
                case "character.equipment": f.Character.Equipment = null; break;
                case "consumables": f.Consumables = null; break;
            }

            // Absent is not empty: it means nobody read the section.
            AssertRefused(f, field);
        }

        // --- descriptor level ---

        [Fact]
        public void NoDescriptorIsRefused()
            => AssertRefused(null!, "fixture");

        [Fact]
        public void AnUnsupportedSchemaVersionIsRefused()
        {
            var f = Valid(); f.SchemaVersion = 99;
            AssertRefused(f, "schemaVersion");
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
            var f = Valid(); f.GameVersion = "  ";
            AssertRefused(f, "gameVersion");
        }

        [Fact]
        public void AMissingSeedIsRefused()
        {
            var f = Valid(); f.Seed = null;
            AssertRefused(f, "seed");
        }

        [Fact]
        public void AMissingCharacterIsRefused()
        {
            var f = Valid(); f.Character = null;
            AssertRefused(f, "character");
        }

        // --- class, race, level ---

        [Fact]
        public void AMissingClassIsRefused()
        {
            var f = Valid(); f.Character.Class = null;
            AssertRefused(f, "character.class");
        }

        [Fact]
        public void AMissingRaceIsRefused()
        {
            var f = Valid(); f.Character.Race = null;
            AssertRefused(f, "character.race");
        }

        [Fact]
        public void AnUnknownClassIsRefused()
        {
            var f = Valid(); f.Character.Class = "Necromancer";
            AssertRefused(f, "character.class");
        }

        [Fact]
        public void APrerequisiteNamedInEitherFormIsAccepted()
        {
            // The game names a skill for display and identifies an asset by a slug. A fixture may
            // carry either, so a prerequisite must resolve rather than string-match.
            var rules = Rules()
                .WithSkill("Charge", maxLevel: 1, classes: new[] { "Warrior" })
                .WithSkill("Vindication", maxLevel: 8, classes: new[] { "Warrior" },
                    prerequisite: "charge", prerequisiteLevel: 1);

            var f = Valid();
            f.Character.Skills = new System.Collections.Generic.List<SkillSpec>
            {
                new() { Name = "Charge", Level = 1 },
                new() { Name = "Vindication", Level = 1 },
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
            var f = Valid(); f.Character.Race = "Elf";
            Assert.Empty(FixtureValidator.Validate(f, Rules()).Problems);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(51)]
        public void ALevelOutsideTheReachableRangeIsRefused(int level)
        {
            var f = Valid();
            f.Character.Level = level;
            f.Character.VeteranPoints = 0;
            f.Character.Skills = new List<SkillSpec>();
            f.Character.AllocatedAttributes = new Dictionary<string, int>();
            f.Character.Equipment = new List<EquipmentSpec>();
            AssertRefused(f, "character.level");
        }

        // --- veteran progression ---

        [Fact]
        public void VeteranPointsBelowTheLevelCapAreRefused()
        {
            var f = Valid();
            f.Character.Level = 40;
            f.Character.Skills = new List<SkillSpec>();
            f.Character.AllocatedAttributes = new Dictionary<string, int>();
            f.Character.Equipment = new List<EquipmentSpec>();
            AssertRefused(f, "character.veteranPoints");
        }

        [Fact]
        public void VeteranPointsAboveTheObtainableTotalAreRefused()
        {
            var f = Valid(); f.Character.VeteranPoints = 201;
            AssertRefused(f, "character.veteranPoints");
        }

        // --- attributes ---

        [Fact]
        public void AnUnknownAttributeIsRefused()
        {
            var f = Valid();
            f.Character.AllocatedAttributes = new Dictionary<string, int> { ["luck"] = 1 };
            AssertRefused(f, "character.allocatedAttributes.luck");
        }

        [Fact]
        public void ANegativeAttributeAllocationIsRefused()
        {
            var f = Valid();
            f.Character.AllocatedAttributes = new Dictionary<string, int> { ["strength"] = -1 };
            AssertRefused(f, "character.allocatedAttributes.strength");
        }

        [Fact]
        public void SpendingMoreAttributePointsThanAvailableIsRefused()
        {
            var f = Valid();
            // 49 from levels + 200 veteran = 249 allocatable
            f.Character.AllocatedAttributes = new Dictionary<string, int> { ["strength"] = 250 };
            AssertRefused(f, "character.allocatedAttributes");
        }

        [Fact]
        public void SpendingExactlyTheAttributeBudgetIsAccepted()
        {
            var f = Valid();
            f.Character.AllocatedAttributes = new Dictionary<string, int> { ["strength"] = 249 };
            Assert.Empty(Check(f));
        }

        // --- skills ---

        [Fact]
        public void ASkillNamedTwiceIsRefused()
        {
            var f = Valid();
            f.Character.Skills = new List<SkillSpec>
            {
                new SkillSpec { Name = "Melee Attack", Level = 1 },
                new SkillSpec { Name = "Melee Attack", Level = 2 },
            };
            AssertRefused(f, "character.skills.Melee Attack");
        }

        [Fact]
        public void AnUnnamedSkillIsRefused()
        {
            var f = Valid();
            f.Character.Skills = new List<SkillSpec> { new SkillSpec { Name = null, Level = 1 } };
            AssertRefused(f, "character.skills.<unnamed>");
        }

        [Fact]
        public void AnUnknownSkillIsRefused()
        {
            var f = Valid();
            f.Character.Skills = new List<SkillSpec> { new SkillSpec { Name = "Fireball", Level = 1 } };
            AssertRefused(f, "character.skills.Fireball");
        }

        [Fact]
        public void ASkillAboveItsMaximumLevelIsRefused()
        {
            var f = Valid();
            f.Character.Skills = new List<SkillSpec>
                { new SkillSpec { Name = "Melee Attack", Level = 6 } };
            AssertRefused(f, "character.skills.Melee Attack");
        }

        [Fact]
        public void ASkillTheClassCannotLearnIsRefused()
        {
            var f = Valid();
            f.Character.Class = "Wizard";
            f.Character.Race = "Human";
            f.Character.Equipment = new List<EquipmentSpec>();
            AssertRefused(f, "character.skills.Melee Attack");
        }

        [Fact]
        public void AVeteranSkillBelowTheLevelCapIsRefused()
        {
            var f = Valid();
            f.Character.Level = 40;
            f.Character.VeteranPoints = 0;
            f.Character.AllocatedAttributes = new Dictionary<string, int>();
            f.Character.Equipment = new List<EquipmentSpec>();
            f.Character.Skills = new List<SkillSpec>
                { new SkillSpec { Name = "Runebound Aegis", Level = 1 } };
            AssertRefused(f, "character.skills.Runebound Aegis");
        }

        [Fact]
        public void AnUnmetPrerequisiteIsRefused()
        {
            var f = Valid();
            f.Character.Skills = new List<SkillSpec>
            {
                new SkillSpec { Name = "Melee Attack", Level = 1 },   // needs 2
                new SkillSpec { Name = "Follow Up", Level = 1 },
            };
            AssertRefused(f, "character.skills.Follow Up");
        }

        [Fact]
        public void AMetPrerequisiteIsAccepted()
        {
            var f = Valid();
            f.Character.Skills = new List<SkillSpec>
            {
                new SkillSpec { Name = "Melee Attack", Level = 2 },
                new SkillSpec { Name = "Follow Up", Level = 1 },
            };
            Assert.Empty(Check(f));
        }

        [Fact]
        public void ExceedingTheNormalSkillPoolIsRefused()
        {
            var f = Valid();
            f.Character.Level = 2;              // 1 point available
            f.Character.VeteranPoints = 0;
            f.Character.AllocatedAttributes = new Dictionary<string, int>();
            f.Character.Equipment = new List<EquipmentSpec>();
            f.Character.Skills = new List<SkillSpec>
                { new SkillSpec { Name = "Melee Attack", Level = 5 } };  // costs 5
            AssertRefused(f, "character.skills");
        }

        [Fact]
        public void ExceedingTheVeteranSkillPoolIsRefused()
        {
            var f = Valid();
            f.Character.VeteranPoints = 1;
            f.Character.AllocatedAttributes = new Dictionary<string, int>();
            f.Character.Skills = new List<SkillSpec>
                { new SkillSpec { Name = "Runebound Aegis", Level = 5 } };  // costs 5
            AssertRefused(f, "character.skills");
        }

        [Fact]
        public void AnUnmetSpentPointGateIsRefused()
        {
            var f = Valid();
            f.Character.Skills = new List<SkillSpec>
                { new SkillSpec { Name = "Gated Skill", Level = 1 } };   // needs 10 spent elsewhere
            AssertRefused(f, "character.skills.Gated Skill");
        }

        [Fact]
        public void AMetSpentPointGateIsAccepted()
        {
            var f = Valid();
            f.Character.Skills = new List<SkillSpec>
            {
                new SkillSpec { Name = "Melee Attack", Level = 5 },   // 5
                new SkillSpec { Name = "Rupture", Level = 5 },        // 5  -> 10 spent
                new SkillSpec { Name = "Gated Skill", Level = 1 },
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
            f.Character.Equipment = new List<EquipmentSpec>
                { new EquipmentSpec { Slot = slot, ItemId = "Rusty Sword" } };
            AssertRefused(f, $"character.equipment[{slot}]");
        }

        [Fact]
        public void ASlotFilledTwiceIsRefused()
        {
            var f = Valid();
            f.Character.Equipment = new List<EquipmentSpec>
            {
                new EquipmentSpec { Slot = 12, ItemId = "Rusty Sword" },
                new EquipmentSpec { Slot = 12, ItemId = "Great Axe" },
            };
            AssertRefused(f, "character.equipment[12]");
        }

        [Fact]
        public void AMissingItemNameIsRefused()
        {
            var f = Valid();
            f.Character.Equipment = new List<EquipmentSpec> { new EquipmentSpec { Slot = 12 } };
            AssertRefused(f, "character.equipment[12].itemId");
        }

        [Fact]
        public void AnUnknownItemIsRefused()
        {
            var f = Valid();
            f.Character.Equipment = new List<EquipmentSpec>
                { new EquipmentSpec { Slot = 12, ItemId = "Sword of Nothing" } };
            AssertRefused(f, "character.equipment[12].itemId");
        }

        [Fact]
        public void AnItemFittingSeveralSlotsIsAcceptedInEither()
        {
            // The game gives a character two ring slots, so an item is not tied to one index.
            var rules = Rules().WithItem("Signet", slot: 4);

            foreach (var slot in new[] { 4, 10 })
            {
                var f = Valid();
                f.Character.Equipment = new List<EquipmentSpec>
                    { new EquipmentSpec { Slot = slot, ItemId = "Signet" } };

                Assert.Empty(Check(f, rules));
            }
        }

        [Fact]
        public void AnItemInASlotItDoesNotFitIsRefused()
        {
            var f = Valid();
            f.Character.Equipment = new List<EquipmentSpec>
                { new EquipmentSpec { Slot = 5, ItemId = "Rusty Sword" } };   // fits 12 only
            AssertRefused(f, "character.equipment[5]");
        }

        [Fact]
        public void AnItemAboveTheCharacterLevelIsRefused()
        {
            var f = Valid();
            f.Character.Level = 40;
            f.Character.VeteranPoints = 0;
            f.Character.AllocatedAttributes = new Dictionary<string, int>();
            f.Character.Skills = new List<SkillSpec>();
            f.Character.Equipment = new List<EquipmentSpec>
                { new EquipmentSpec { Slot = 12, ItemId = "Epic Blade" } };   // needs 45
            AssertRefused(f, "character.equipment[12].itemId");
        }

        [Fact]
        public void AnItemTheClassCannotEquipIsRefused()
        {
            var f = Valid();
            f.Character.Equipment = new List<EquipmentSpec>
                { new EquipmentSpec { Slot = 0, ItemId = "Wizard Hat" } };
            AssertRefused(f, "character.equipment[0].itemId");
        }

        [Fact]
        public void AnUnknownAugmentIsRefused()
        {
            var f = Valid();
            f.Character.Equipment = new List<EquipmentSpec>
                { new EquipmentSpec { Slot = 12, ItemId = "Rusty Sword", AugmentId = "Gem of Lies" } };
            AssertRefused(f, "character.equipment[12].augmentId");
        }

        [Fact]
        public void ZeroDurabilityIsRefused()
        {
            var f = Valid();
            f.Character.Equipment = new List<EquipmentSpec>
                { new EquipmentSpec { Slot = 12, ItemId = "Rusty Sword", Durability = 0 } };
            AssertRefused(f, "character.equipment[12].durability");
        }

        [Fact]
        public void ATwoHandedWeaponWithAFilledOffhandIsRefused()
        {
            var f = Valid();
            f.Character.Equipment = new List<EquipmentSpec>
            {
                new EquipmentSpec { Slot = 12, ItemId = "Great Axe" },
                new EquipmentSpec { Slot = 13, ItemId = "Rusty Shield" },
            };
            AssertRefused(f, "character.equipment[13]");
        }

        [Fact]
        public void ATwoHandedWeaponWithAnEmptyOffhandIsAccepted()
        {
            var f = Valid();
            f.Character.Equipment = new List<EquipmentSpec>
                { new EquipmentSpec { Slot = 12, ItemId = "Great Axe" } };
            Assert.Empty(Check(f));
        }

        [Fact]
        public void AOneHandedWeaponWithAShieldIsAccepted()
        {
            var f = Valid();
            f.Character.Equipment = new List<EquipmentSpec>
            {
                new EquipmentSpec { Slot = 12, ItemId = "Rusty Sword" },
                new EquipmentSpec { Slot = 13, ItemId = "Rusty Shield" },
            };
            Assert.Empty(Check(f));
        }

        // --- consumables and actions ---

        [Fact]
        public void ABlankConsumableIsRefused()
        {
            var f = Valid(); f.Consumables = new List<string> { " " };
            AssertRefused(f, "consumables");
        }

        [Fact]
        public void AnUnknownConsumableIsRefused()
        {
            var f = Valid(); f.Consumables = new List<string> { "Elixir of Fiction" };
            AssertRefused(f, "consumables");
        }

        [Fact]
        public void AnActionWithoutASkillIsRefused()
        {
            var f = Valid();
            f.Actions = new List<ActionSpec> { new ActionSpec { Facing = "front" } };
            AssertRefused(f, "actions[0].skill");
        }

        [Fact]
        public void AnActionWithoutAFacingIsRefused()
        {
            var f = Valid();
            f.Actions = new List<ActionSpec> { new ActionSpec { Skill = "Melee Attack" } };
            AssertRefused(f, "actions[0].facing");
        }

        [Fact]
        public void AnActionWithASkillAndAFacingIsAccepted()
        {
            var f = Valid();
            f.Actions = new List<ActionSpec>
                { new ActionSpec { Skill = "Melee Attack", Facing = "front" } };
            Assert.Empty(Check(f));
        }

        // --- reporting ---

        [Fact]
        public void AProblemNamesTheFieldAndThePermittedRange()
        {
            var f = Valid(); f.Character.Level = 99;

            var problem = Check(f).First(p => p.Field == "character.level");

            Assert.Contains("99", problem.Message);
            Assert.Contains("50", problem.Message);
        }

        [Fact]
        public void SeveralFaultsAreAllReported()
        {
            var f = Valid();
            f.Name = null;
            f.Seed = null;
            f.Character.Level = 99;

            var fields = Check(f).Select(p => p.Field).ToList();

            Assert.Contains("name", fields);
            Assert.Contains("seed", fields);
            Assert.Contains("character.level", fields);
        }
    }
}
