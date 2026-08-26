using System.Collections.Generic;
using CombatVerification.Fixtures;

namespace CombatVerification.Tests
{
    /// <summary>
    /// Rules with known values, so a validator test states its own preconditions.
    /// The running game supplies the real implementation from its own definitions.
    /// </summary>
    internal sealed class SyntheticRules : IFixtureRules
    {
        public IReadOnlyCollection<int> SupportedSchemaVersions { get; set; } = new[] { 1 };
        public int MaxLevel { get; set; } = 50;
        public int MaxVeteranPoints { get; set; } = 200;
        public IReadOnlyCollection<string> AttributeNames { get; set; } =
            new[] { "strength", "constitution", "dexterity", "intelligence", "wisdom", "charisma" };
        public int EquipmentSlotCount { get; set; } = 16;
        public int OffhandSlot { get; set; } = 13;

        public Dictionary<string, string[]> Classes { get; } = new()
        {
            ["Warrior"] = new[] { "Human", "Dwarf" },
            ["Wizard"] = new[] { "Human", "Elf" },
        };

        public Dictionary<string, SkillRule> Skills { get; } = new();
        public Dictionary<string, ItemRule> Items { get; } = new();
        public HashSet<string> Augments { get; } = new() { "Jagged Shard" };
        public HashSet<string> Consumables { get; } = new() { "Roast Boar" };

        /// <summary>Levels grant one point each after the first.</summary>
        public int SkillPointsAtLevel(int level) => level < 1 ? 0 : level - 1;

        public int AllocatableAttributePoints(int level, int veteranPoints)
            => (level < 1 ? 0 : level - 1) + veteranPoints;

        public bool ClassExists(string className) => Classes.ContainsKey(className);

        public bool TryGetSkill(string skillName, out SkillRule rule)
            => Skills.TryGetValue(skillName, out rule!);

        public bool TryGetItem(string itemName, out ItemRule rule)
            => Items.TryGetValue(itemName, out rule!);

        public bool AugmentExists(string augmentName) => Augments.Contains(augmentName);

        public bool ConsumableExists(string consumableName) => Consumables.Contains(consumableName);

        // --- builders ---

        public SyntheticRules WithSkill(
            string name,
            int maxLevel = 5,
            bool veteran = false,
            string[]? classes = null,
            int[]? cumulativeCost = null,
            int requiredSpentPoints = 0,
            string? prerequisite = null,
            int prerequisiteLevel = 0)
        {
            Skills[name] = new SkillRule
            {
                Name = name,
                MaxLevel = maxLevel,
                IsVeteran = veteran,
                Classes = classes ?? System.Array.Empty<string>(),
                CumulativeCost = cumulativeCost ?? new[] { 1, 2, 3, 4, 5 },
                RequiredSpentPoints = requiredSpentPoints,
                PrerequisiteSkill = prerequisite!,
                PrerequisiteLevel = prerequisiteLevel,
            };
            return this;
        }

        public SyntheticRules WithItem(
            string name,
            int slot,
            int levelRequired = 1,
            string[]? classes = null,
            bool twoHanded = false,
            string? category = null,
            int[]? alsoFitsSlots = null)
        {
            var slots = new List<int> { slot };
            if (alsoFitsSlots is not null)
                slots.AddRange(alsoFitsSlots);

            Items[name] = new ItemRule
            {
                Name = name,
                Slots = slots,
                LevelRequired = levelRequired,
                Classes = classes ?? System.Array.Empty<string>(),
                IsTwoHanded = twoHanded,
                Category = category!,
            };
            return this;
        }
    }
}
