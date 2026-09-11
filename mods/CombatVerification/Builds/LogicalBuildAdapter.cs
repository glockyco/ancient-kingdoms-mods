#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;

namespace CombatVerification.Builds
{
    /// <summary>Schema and structural checks at the C# logical-build boundary.</summary>
    public static class LogicalBuildAdapter
    {
        public const int SchemaVersion = 1;

        public static LogicalBuildData Deserialize(string json)
        {
            var settings = new JsonSerializerSettings
            {
                MissingMemberHandling = MissingMemberHandling.Error,
            };
            var build = JsonConvert.DeserializeObject<LogicalBuildData>(json, settings);
            var problems = Validate(build);
            if (problems.Count != 0)
                throw new LogicalBuildException(problems);
            return build;
        }

        public static IReadOnlyList<string> Validate(LogicalBuildData build)
        {
            var problems = new List<string>();
            if (build == null)
                return new[] { "buildData is required" };
            if (build.SchemaVersion != SchemaVersion)
                problems.Add($"buildData.schemaVersion {build.SchemaVersion} is unsupported; expected {SchemaVersion}");

            ValidatePlayer(problems, build.Player);
            ValidateCompanions(problems, build.Companions, build.Player?.EntityId);
            ValidateItemQuantities(problems, "buildData.consumables", build.Consumables);
            ValidateItemQuantities(problems, "buildData.ammunition", build.Ammunition);
            ValidateIds(problems, "buildData.learnedBookIds", build.LearnedBookIds);

            if (build.Provenance == null)
                problems.Add("buildData.provenance is required");
            else
            {
                Require(problems, "buildData.provenance.kind", build.Provenance.Kind);
                Require(problems, "buildData.provenance.source", build.Provenance.Source);
                if (build.Provenance.Kind != "authored"
                    && build.Provenance.Kind != "capture"
                    && build.Provenance.Kind != "hypothetical")
                {
                    problems.Add("buildData.provenance.kind must be authored, capture, or hypothetical");
                }
            }

            return problems;
        }

        private static void ValidatePlayer(List<string> problems, PlayerBuild player)
        {
            if (player == null)
            {
                problems.Add("buildData.player is required");
                return;
            }

            Require(problems, "buildData.player.entityId", player.EntityId);
            Require(problems, "buildData.player.classId", player.ClassId);
            Require(problems, "buildData.player.raceId", player.RaceId);
            if (player.Level < 1)
                problems.Add("buildData.player.level must be at least 1");
            if (player.VeteranPoints < 0)
                problems.Add("buildData.player.veteranPoints must not be negative");

            ValidateAttributeLayers(problems, "buildData.player.attributes", player.Attributes);
            ValidateSkills(problems, "buildData.player.skills", player.Skills);
            ValidateEquipment(problems, "buildData.player.equipment", player.Equipment);
        }

        private static void ValidateAttributeLayers(
            List<string> problems, string path, AttributeLayers attributes)
        {
            if (attributes == null)
            {
                problems.Add($"{path} is required");
                return;
            }

            ValidateAttributes(problems, $"{path}.baseProgression", attributes.BaseProgression, true);
            ValidateAttributes(problems, $"{path}.allocated", attributes.Allocated, true);
            ValidateAttributes(problems, $"{path}.rawObserved", attributes.RawObserved, false);
            ValidateAttributes(problems, $"{path}.derivedObserved", attributes.DerivedObserved, false);
        }

        private static void ValidateAttributes(
            List<string> problems, string path, AttributeValues values, bool required)
        {
            if (values == null)
            {
                if (required)
                    problems.Add($"{path} is required");
                return;
            }

            var entries = new[]
            {
                ("strength", values.Strength),
                ("constitution", values.Constitution),
                ("dexterity", values.Dexterity),
                ("intelligence", values.Intelligence),
                ("wisdom", values.Wisdom),
                ("charisma", values.Charisma),
            };
            foreach (var (name, value) in entries)
                if (value < 0)
                    problems.Add($"{path}.{name} must not be negative");
        }

        private static void ValidateSkills(
            List<string> problems, string path, IReadOnlyList<AllocatedSkill> skills)
        {
            if (skills == null)
            {
                problems.Add($"{path} is required; use an empty list for none");
                return;
            }

            var ids = new HashSet<string>(StringComparer.Ordinal);
            for (var i = 0; i < skills.Count; i++)
            {
                var skill = skills[i];
                var entry = $"{path}[{i}]";
                if (skill == null)
                {
                    problems.Add($"{entry} is required");
                    continue;
                }
                if (Require(problems, $"{entry}.skillId", skill.SkillId)
                    && !ids.Add(skill.SkillId))
                    problems.Add($"{entry}.skillId duplicates {skill.SkillId}");
                ValidateOptionalString(problems, $"{entry}.skillName", skill.SkillName);
                if (skill.Level < 1)
                    problems.Add($"{entry}.level must be at least 1");
                if (skill.Pool != "normal" && skill.Pool != "veteran")
                    problems.Add($"{entry}.pool must be normal or veteran");
            }
        }

        private static void ValidateEquipment(
            List<string> problems, string path, IReadOnlyList<EquippedItem> equipment)
        {
            if (equipment == null)
            {
                problems.Add($"{path} is required; use an empty list for none");
                return;
            }

            var slots = new HashSet<int>();
            for (var i = 0; i < equipment.Count; i++)
            {
                var item = equipment[i];
                var entry = $"{path}[{i}]";
                if (item == null)
                {
                    problems.Add($"{entry} is required");
                    continue;
                }
                if (item.Slot < 0)
                    problems.Add($"{entry}.slot must not be negative");
                else if (!slots.Add(item.Slot))
                    problems.Add($"{entry}.slot duplicates slot {item.Slot}");
                Require(problems, $"{entry}.itemId", item.ItemId);
                ValidateOptionalString(problems, $"{entry}.itemName", item.ItemName);
                ValidateOptionalString(problems, $"{entry}.augmentId", item.AugmentId);
                if (item.Durability <= 0)
                    problems.Add($"{entry}.durability must be above zero");
                if (item.Amount <= 0)
                    problems.Add($"{entry}.amount must be above zero");
            }
        }

        private static void ValidateCompanions(
            List<string> problems,
            IReadOnlyList<CompanionBuild> companions,
            string playerEntityId)
        {
            const string path = "buildData.companions";
            if (companions == null)
            {
                problems.Add($"{path} is required; use an empty list for none");
                return;
            }

            var ids = new HashSet<string>(StringComparer.Ordinal);
            for (var i = 0; i < companions.Count; i++)
            {
                var companion = companions[i];
                var entry = $"{path}[{i}]";
                if (companion == null)
                {
                    problems.Add($"{entry} is required");
                    continue;
                }
                if (Require(problems, $"{entry}.entityId", companion.EntityId))
                {
                    if (!ids.Add(companion.EntityId))
                        problems.Add($"{entry}.entityId duplicates {companion.EntityId}");
                    if (companion.EntityId == playerEntityId)
                        problems.Add($"{entry}.entityId duplicates player entityId");
                }
                if (companion.Kind != "mercenary" && companion.Kind != "pet")
                    problems.Add($"{entry}.kind must be mercenary or pet");
                Require(problems, $"{entry}.archetypeId", companion.ArchetypeId);
                Require(problems, $"{entry}.raceId", companion.RaceId);
                if (companion.Level < 1)
                    problems.Add($"{entry}.level must be at least 1");
                if (companion.HealthMultiplier < 0)
                    problems.Add($"{entry}.healthMultiplier must not be negative");
                if (companion.ResourceMultiplier < 0)
                    problems.Add($"{entry}.resourceMultiplier must not be negative");
                if (companion.BaseCombat < 0)
                    problems.Add($"{entry}.baseCombat must not be negative");
                ValidateCompanionResources(problems, $"{entry}.currentResources", companion.CurrentResources);
                ValidateEffects(problems, $"{entry}.effects", companion.Effects, companion.EntityId);
                ValidateSkills(problems, $"{entry}.skills", companion.Skills);
                ValidateEquipment(problems, $"{entry}.equipment", companion.Equipment);
            }
        }

        private static void ValidateCompanionResources(
            List<string> problems, string path, CompanionResources resources)
        {
            if (resources == null)
                return;
            ValidateResource(problems, $"{path}.health", resources.Health, required: true);
            ValidateResource(problems, $"{path}.mana", resources.Mana, required: false);
            ValidateResource(problems, $"{path}.energy", resources.Energy, required: false);
        }

        private static void ValidateResource(
            List<string> problems, string path, ResourceValue resource, bool required)
        {
            if (resource == null)
            {
                if (required)
                    problems.Add($"{path} is required");
                return;
            }
            if (resource.Max < 1)
                problems.Add($"{path}.max must be at least 1");
            if (resource.Current < 0 || resource.Current > resource.Max)
                problems.Add($"{path}.current must be between zero and max");
        }

        private static void ValidateEffects(
            List<string> problems,
            string path,
            IReadOnlyList<CapturedEffect> effects,
            string recipientEntityId)
        {
            if (effects == null)
                return;
            for (var i = 0; i < effects.Count; i++)
            {
                var effect = effects[i];
                var entry = $"{path}[{i}]";
                if (effect == null)
                {
                    problems.Add($"{entry} is required");
                    continue;
                }
                Require(problems, $"{entry}.skillId", effect.SkillId);
                if (effect.Level < 1)
                    problems.Add($"{entry}.level must be at least 1");
                if (!Require(problems, $"{entry}.recipientEntityId", effect.RecipientEntityId))
                    continue;
                if (effect.RecipientEntityId != recipientEntityId)
                    problems.Add($"{entry}.recipientEntityId must match the companion entityId");
            }
        }

        private static void ValidateItemQuantities(
            List<string> problems, string path, IReadOnlyList<ItemQuantity> items)
        {
            if (items == null)
            {
                problems.Add($"{path} is required; use an empty list for none");
                return;
            }

            var ids = new HashSet<string>(StringComparer.Ordinal);
            for (var i = 0; i < items.Count; i++)
            {
                var item = items[i];
                var entry = $"{path}[{i}]";
                if (item == null)
                {
                    problems.Add($"{entry} is required");
                    continue;
                }
                if (Require(problems, $"{entry}.itemId", item.ItemId)
                    && !ids.Add(item.ItemId))
                    problems.Add($"{entry}.itemId duplicates {item.ItemId}");
                ValidateOptionalString(problems, $"{entry}.itemName", item.ItemName);
                if (item.Quantity <= 0)
                    problems.Add($"{entry}.quantity must be above zero");
            }
        }

        private static void ValidateIds(
            List<string> problems, string path, IReadOnlyList<string> values)
        {
            if (values == null)
            {
                problems.Add($"{path} is required; use an empty list for none");
                return;
            }

            var ids = new HashSet<string>(StringComparer.Ordinal);
            for (var i = 0; i < values.Count; i++)
            {
                if (!Require(problems, $"{path}[{i}]", values[i]))
                    continue;
                if (!ids.Add(values[i]))
                    problems.Add($"{path}[{i}] duplicates {values[i]}");
            }
        }

        private static void ValidateOptionalString(
            List<string> problems, string path, string value)
        {
            if (value != null && string.IsNullOrWhiteSpace(value))
                problems.Add($"{path} must be null or a non-empty string");
        }

        private static bool Require(List<string> problems, string path, string value)
        {
            if (!string.IsNullOrWhiteSpace(value))
                return true;
            problems.Add($"{path} must be a non-empty string");
            return false;
        }
    }

    public sealed class LogicalBuildException : Exception
    {
        public LogicalBuildException(IReadOnlyList<string> problems)
            : base(string.Join("; ", problems))
        {
            Problems = problems;
        }

        public IReadOnlyList<string> Problems { get; }
    }
}
