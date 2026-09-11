#nullable disable
using System.Collections.Generic;
using Newtonsoft.Json;

namespace CombatVerification.Builds
{
    /// <summary>Versioned build inputs shared by fixtures, captures, and planner state.</summary>
    public sealed class LogicalBuildData
    {
        [JsonProperty("schemaVersion", Required = Required.Always)]
        public int SchemaVersion { get; set; }

        [JsonProperty("player", Required = Required.Always)]
        public PlayerBuild Player { get; set; }

        [JsonProperty("companions", Required = Required.Always)]
        public List<CompanionBuild> Companions { get; set; }

        [JsonProperty("consumables", Required = Required.Always)]
        public List<ItemQuantity> Consumables { get; set; }

        [JsonProperty("ammunition", Required = Required.Always)]
        public List<ItemQuantity> Ammunition { get; set; }

        /// <summary>Stable book asset IDs. Catalog definitions own their gains.</summary>
        [JsonProperty("learnedBookIds", Required = Required.Always)]
        public List<string> LearnedBookIds { get; set; }

        [JsonProperty("provenance", Required = Required.Always)]
        public BuildProvenance Provenance { get; set; }
    }

    public sealed class PlayerBuild
    {
        [JsonProperty("entityId", Required = Required.Always)] public string EntityId { get; set; }
        [JsonProperty("classId", Required = Required.Always)] public string ClassId { get; set; }
        [JsonProperty("raceId", Required = Required.Always)] public string RaceId { get; set; }
        [JsonProperty("level", Required = Required.Always)] public int Level { get; set; }
        [JsonProperty("veteranPoints", Required = Required.Always)] public int VeteranPoints { get; set; }
        [JsonProperty("attributes", Required = Required.Always)] public AttributeLayers Attributes { get; set; }
        [JsonProperty("skills", Required = Required.Always)] public List<AllocatedSkill> Skills { get; set; }
        [JsonProperty("equipment", Required = Required.Always)] public List<EquippedItem> Equipment { get; set; }
    }

    /// <summary>Separate declared inputs from observed totals that can contain those inputs.</summary>
    public sealed class AttributeLayers
    {
        /// <summary>Raw total observed from the running game, or null when no observation exists.</summary>
        [JsonProperty("rawObserved", Required = Required.AllowNull)]
        public AttributeValues RawObserved { get; set; }

        /// <summary>Class and race progression contribution for the declared level.</summary>
        [JsonProperty("baseProgression", Required = Required.Always)]
        public AttributeValues BaseProgression { get; set; }

        /// <summary>Points explicitly allocated by the build.</summary>
        [JsonProperty("allocated", Required = Required.Always)]
        public AttributeValues Allocated { get; set; }

        /// <summary>Final total observed from the running game, or null when no observation exists.</summary>
        [JsonProperty("derivedObserved", Required = Required.AllowNull)]
        public AttributeValues DerivedObserved { get; set; }
    }

    public sealed class AttributeValues
    {
        [JsonProperty("strength", Required = Required.Always)] public int Strength { get; set; }
        [JsonProperty("constitution", Required = Required.Always)] public int Constitution { get; set; }
        [JsonProperty("dexterity", Required = Required.Always)] public int Dexterity { get; set; }
        [JsonProperty("intelligence", Required = Required.Always)] public int Intelligence { get; set; }
        [JsonProperty("wisdom", Required = Required.Always)] public int Wisdom { get; set; }
        [JsonProperty("charisma", Required = Required.Always)] public int Charisma { get; set; }
    }

    public sealed class AllocatedSkill
    {
        [JsonProperty("skillId", Required = Required.Always)] public string SkillId { get; set; }
        [JsonProperty("skillName", Required = Required.AllowNull)] public string SkillName { get; set; }
        [JsonProperty("level", Required = Required.Always)] public int Level { get; set; }
        [JsonProperty("pool", Required = Required.Always)] public string Pool { get; set; }
    }

    public sealed class EquippedItem
    {
        [JsonProperty("slot", Required = Required.Always)] public int Slot { get; set; }
        [JsonProperty("itemId", Required = Required.Always)] public string ItemId { get; set; }
        [JsonProperty("itemName", Required = Required.AllowNull)] public string ItemName { get; set; }
        [JsonProperty("augmentId", Required = Required.AllowNull)] public string AugmentId { get; set; }
        [JsonProperty("durability", Required = Required.Always)] public int Durability { get; set; }
        [JsonProperty("amount", Required = Required.Always)] public int Amount { get; set; }
    }

    public sealed class CompanionBuild
    {
        [JsonProperty("entityId", Required = Required.Always)] public string EntityId { get; set; }
        [JsonProperty("kind", Required = Required.Always)] public string Kind { get; set; }
        [JsonProperty("archetypeId", Required = Required.Always)] public string ArchetypeId { get; set; }
        [JsonProperty("raceId", Required = Required.Always)] public string RaceId { get; set; }
        [JsonProperty("level", Required = Required.Always)] public int Level { get; set; }
        [JsonProperty("healthMultiplier", Required = Required.AllowNull)] public float? HealthMultiplier { get; set; }
        [JsonProperty("resourceMultiplier", Required = Required.AllowNull)] public float? ResourceMultiplier { get; set; }
        [JsonProperty("baseCombat", Required = Required.AllowNull)] public int? BaseCombat { get; set; }
        [JsonProperty("skills", Required = Required.Always)] public List<AllocatedSkill> Skills { get; set; }
        [JsonProperty("equipment", Required = Required.Always)] public List<EquippedItem> Equipment { get; set; }
    }

    public sealed class ItemQuantity
    {
        [JsonProperty("itemId", Required = Required.Always)] public string ItemId { get; set; }
        [JsonProperty("itemName", Required = Required.AllowNull)] public string ItemName { get; set; }
        [JsonProperty("quantity", Required = Required.Always)] public int Quantity { get; set; }
    }

    public sealed class BuildProvenance
    {
        [JsonProperty("kind", Required = Required.Always)] public string Kind { get; set; }
        [JsonProperty("source", Required = Required.Always)] public string Source { get; set; }
    }
}
