#nullable disable
using System.Collections.Generic;
using Newtonsoft.Json;

namespace CombatVerification.Fixtures
{
    /// <summary>
    /// One build fixture. Authored fixtures and builds captured from a player's game
    /// use this same shape, so a player's report is runnable without conversion.
    /// </summary>
    /// <remarks>
    /// An absent section and an empty section mean different things. A section the stat
    /// sheet depends on — allocated attributes, skills, equipment, consumables — must be
    /// present, and an empty list states that it holds nothing. Absent means it was never
    /// read, which no default may stand in for. Companions and actions may be absent,
    /// because a fixture that names neither measures the stat sheet on its own.
    /// </remarks>
    public sealed class FixtureDescriptor
    {
        /// <summary>Schema of this descriptor. A run refuses a version it does not know.</summary>
        [JsonProperty("schemaVersion", Required = Required.Default)]
        public int SchemaVersion { get; set; }

        /// <summary>Game build this descriptor was written against.</summary>
        [JsonProperty("gameVersion", Required = Required.Default)]
        public string GameVersion { get; set; }

        /// <summary>Identity of the fixture. The recorded baseline is keyed on it.</summary>
        [JsonProperty("name", Required = Required.Default)]
        public string Name { get; set; }

        /// <summary>Seed applied before measurement, recorded with the results.</summary>
        [JsonProperty("seed", Required = Required.Default)]
        public int? Seed { get; set; }

        /// <summary>
        /// When a captured build was read from a player's game. Null for an authored fixture.
        /// </summary>
        [JsonProperty("capturedAt", Required = Required.Default)]
        public string CapturedAt { get; set; }

        [JsonProperty("character", Required = Required.Default)]
        public CharacterSpec Character { get; set; }

        [JsonProperty("companions", Required = Required.Default)]
        public List<CompanionSpec> Companions { get; set; }

        /// <summary>Consumables the build declares. An empty list means none are assumed.</summary>
        [JsonProperty("consumables", Required = Required.Default)]
        public List<string> Consumables { get; set; }

        [JsonProperty("target", Required = Required.Default)]
        public TargetSpec Target { get; set; }

        /// <summary>Actions to drive. Empty for a fixture that measures the stat sheet only.</summary>
        [JsonProperty("actions", Required = Required.Default)]
        public List<ActionSpec> Actions { get; set; }
    }

    public sealed class CharacterSpec
    {
        [JsonProperty("class", Required = Required.Default)] public string Class { get; set; }
        [JsonProperty("race", Required = Required.Default)] public string Race { get; set; }
        [JsonProperty("level", Required = Required.Default)] public int Level { get; set; }

        /// <summary>Veteran points to award. Only reachable at the level cap.</summary>
        [JsonProperty("veteranPoints", Required = Required.Default)]
        public int VeteranPoints { get; set; }

        /// <summary>
        /// Attribute points the fixture spends, by attribute name. These are the points
        /// allocated on top of the progression the class grants for its level.
        /// </summary>
        [JsonProperty("allocatedAttributes", Required = Required.Default)]
        public Dictionary<string, int> AllocatedAttributes { get; set; }

        [JsonProperty("skills", Required = Required.Default)]
        public List<SkillSpec> Skills { get; set; }

        [JsonProperty("equipment", Required = Required.Default)]
        public List<EquipmentSpec> Equipment { get; set; }
    }

    public sealed class SkillSpec
    {
        [JsonProperty("name", Required = Required.Default)] public string Name { get; set; }
        [JsonProperty("level", Required = Required.Default)] public int Level { get; set; }
    }

    public sealed class EquipmentSpec
    {
        /// <summary>Equipment slot index, as the game orders its slots.</summary>
        [JsonProperty("slot", Required = Required.Default)] public int Slot { get; set; }

        /// <summary>
        /// Identifier the game uses for the item. Resolution is by identifier, never by
        /// display name, so a stored fixture survives a rename in a game update.
        /// </summary>
        [JsonProperty("itemId", Required = Required.Default)] public string ItemId { get; set; }

        /// <summary>Display name, carried as human-readable context only.</summary>
        [JsonProperty("itemName", Required = Required.Default)] public string ItemName { get; set; }

        /// <summary>Augment identifier socketed into this item, or null for none.</summary>
        [JsonProperty("augmentId", Required = Required.Default)] public string AugmentId { get; set; }

        [JsonProperty("durability", Required = Required.Default)] public int? Durability { get; set; }
    }

    public sealed class CompanionSpec
    {
        [JsonProperty("archetype", Required = Required.Default)] public string Archetype { get; set; }
        [JsonProperty("race", Required = Required.Default)] public string Race { get; set; }

        [JsonProperty("healthMultiplier", Required = Required.Default)] public float? HealthMultiplier { get; set; }
        [JsonProperty("resourceMultiplier", Required = Required.Default)] public float? ResourceMultiplier { get; set; }
        [JsonProperty("baseCombat", Required = Required.Default)] public int? BaseCombat { get; set; }

        [JsonProperty("equipment", Required = Required.Default)]
        public List<EquipmentSpec> Equipment { get; set; }
    }

    public sealed class TargetSpec
    {
        /// <summary>Spawn to measure against, named as the game names it.</summary>
        [JsonProperty("spawn", Required = Required.Default)] public string Spawn { get; set; }

        [JsonProperty("level", Required = Required.Default)] public int? Level { get; set; }
    }

    public sealed class ActionSpec
    {
        [JsonProperty("skill", Required = Required.Default)] public string Skill { get; set; }

        /// <summary>
        /// Facing used for this action. Facing changes both avoidance and damage, so a
        /// fixture states it rather than letting materialization choose.
        /// </summary>
        [JsonProperty("facing", Required = Required.Default)] public string Facing { get; set; }
    }
}
