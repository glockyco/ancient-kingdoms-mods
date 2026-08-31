using System.Linq;
using CombatVerification.Fixtures;
using Xunit;

namespace CombatVerification.Tests
{
    /// <summary>
    /// Which slot accepts which item, when that depends on the archetype.
    /// </summary>
    /// <remarks>
    /// The game serializes a slot table on every class prefab, and slot 13 differs: it requires
    /// "Shield" for a Warrior, a Cleric, a Wizard and a Druid, "Bow" for a Ranger, and "Weapon"
    /// for a Rogue. Reading one prefab and treating its table as universal made the validator
    /// refuse every bow and every Rogue offhand, while the build command accepted them, so the
    /// two commands disagreed about the same document.
    /// </remarks>
    public class ArchetypeSlotTests
    {
        private static FixtureDescriptor Fixture(string className, params EquipmentSpec[] worn)
            => new()
            {
                Build = BuildEnvelopeTestData.Create(),
                Name = "slots",
                Seed = 1,
                Character = new CharacterSpec
                {
                    Class = className,
                    Race = "Human",
                    Level = 50,
                    AllocatedAttributes = new(),
                    Skills = new(),
                    Equipment = worn.ToList(),
                },
                Consumables = new(),
            };

        private static SyntheticRules Rules() => new();

        [Fact]
        public void ABowFitsARangersOffhandSlot()
        {
            var rules = Rules().WithItem("Warbow", slot: 13, category: "Bow", classes: new[] { "Ranger" });

            var validation = FixtureValidator.Validate(
                Fixture("Ranger", new EquipmentSpec { Slot = 13, ItemId = "Warbow", Durability = 10 }),
                rules);

            Assert.True(validation.Ok, string.Join(" | ", validation.Problems.Select(p => p.Message)));
        }

        [Fact]
        public void ABowFitsNoSlotOfAWarrior()
        {
            var rules = Rules().WithItem("Warbow", slot: 13, category: "Bow");

            var validation = FixtureValidator.Validate(
                Fixture("Warrior", new EquipmentSpec { Slot = 13, ItemId = "Warbow", Durability = 10 }),
                rules);

            Assert.False(validation.Ok);
            Assert.Contains("does not fit slot 13 of a Warrior",
                string.Join(" ", validation.Problems.Select(p => p.Message)));
        }

        [Fact]
        public void ASecondWeaponFitsARoguesOffhandSlot()
        {
            var rules = Rules()
                .WithItem("War Shard", slot: 12, category: "WeaponDagger", classes: new[] { "Rogue" });

            var validation = FixtureValidator.Validate(
                Fixture("Rogue", new EquipmentSpec { Slot = 13, ItemId = "War Shard", Durability = 10 }),
                rules);

            Assert.True(validation.Ok, string.Join(" | ", validation.Problems.Select(p => p.Message)));
        }

        [Fact]
        public void AShieldFitsNoSlotOfARogue()
        {
            var rules = Rules().WithItem("Bulwark", slot: 13, category: "Shield", archetype: "Warrior");

            var validation = FixtureValidator.Validate(
                Fixture("Rogue", new EquipmentSpec { Slot = 13, ItemId = "Bulwark", Durability = 10 }),
                rules);

            Assert.False(validation.Ok);
            Assert.Contains("does not fit slot 13 of a Rogue",
                string.Join(" ", validation.Problems.Select(p => p.Message)));
        }

        [Fact]
        public void AnArchetypeWithNoPublishedTableCannotBeChecked()
        {
            var rules = Rules().WithItem("Warbow", slot: 13, category: "Bow");
            rules.Classes["Cleric"] = new[] { "Human" };

            var validation = FixtureValidator.Validate(
                Fixture("Cleric", new EquipmentSpec { Slot = 13, ItemId = "Warbow", Durability = 10 }),
                rules);

            Assert.False(validation.Ok);
            Assert.Contains("publishes no slot table",
                string.Join(" ", validation.Problems.Select(p => p.Message)));
        }

        [Fact]
        public void ATwoHandedWeaponIsRefusedBesideABow()
        {
            var rules = Rules()
                .WithItem("Greatsword", slot: 12, category: "WeaponSword2H", twoHanded: true)
                .WithItem("Warbow", slot: 13, category: "Bow");

            var validation = FixtureValidator.Validate(
                Fixture("Ranger",
                    new EquipmentSpec { Slot = 12, ItemId = "Greatsword", Durability = 10 },
                    new EquipmentSpec { Slot = 13, ItemId = "Warbow", Durability = 10 }),
                rules);

            Assert.False(validation.Ok);
            Assert.Contains("two-handed",
                string.Join(" ", validation.Problems.Select(p => p.Message)));
        }

        [Fact]
        public void AClassRequirementMatchesWhicheverFormTheFixtureUses()
        {
            var rules = Rules()
                .WithItem("Warbow", slot: 13, category: "Bow", classes: new[] { "ranger" });

            var validation = FixtureValidator.Validate(
                Fixture("Ranger", new EquipmentSpec { Slot = 13, ItemId = "Warbow", Durability = 10 }),
                rules);

            Assert.True(validation.Ok, string.Join(" | ", validation.Problems.Select(p => p.Message)));
        }

        [Fact]
        public void AClassTheGameDoesNotDefineIsStillRefused()
        {
            var validation = FixtureValidator.Validate(Fixture("Necromancer"), Rules());

            Assert.False(validation.Ok);
            Assert.Contains("is not a class the game defines",
                string.Join(" ", validation.Problems.Select(p => p.Message)));
        }
    }
}
