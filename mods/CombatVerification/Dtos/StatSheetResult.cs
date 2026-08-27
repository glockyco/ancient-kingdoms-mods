#nullable disable
using System.Collections.Generic;
using Newtonsoft.Json;

namespace CombatVerification.Dtos
{
    /// <summary>What one slot holds and what it adds.</summary>
    public sealed class EquippedPiece
    {
        [JsonProperty("slot")] public int Slot { get; set; }
        [JsonProperty("itemId")] public string ItemId { get; set; }
        [JsonProperty("augmentId")] public string AugmentId { get; set; }
        [JsonProperty("durability")] public int Durability { get; set; }

        /// <summary>
        /// Whether the engine counts this slot. It counts a slot only above zero durability, so a
        /// worn-out piece is worn and contributes nothing.
        /// </summary>
        [JsonProperty("contributes")] public bool Contributes { get; set; }

        /// <summary>
        /// What the item and its augment add, keyed by the name the game gives each bonus. Empty
        /// when the slot does not contribute.
        /// </summary>
        [JsonProperty("contribution")] public Dictionary<string, double> Contribution { get; set; }
    }

    /// <summary>
    /// Resource maxima and the multipliers that feed them.
    /// </summary>
    /// <remarks>
    /// An entity carries only the resources it uses. A player has both, while a companion carries
    /// mana or energy according to its archetype and genuinely lacks the other. An absent resource
    /// is reported as absent, because reporting it as zero would be a maximum the entity does not
    /// have, and a comparison would then treat a missing component as an empty pool.
    /// </remarks>
    public sealed class ResourceSheet
    {
        [JsonProperty("healthMax")] public int? HealthMax { get; set; }
        [JsonProperty("healthCurrent")] public int? HealthCurrent { get; set; }
        [JsonProperty("healthRecoveryRate")] public int? HealthRecoveryRate { get; set; }
        [JsonProperty("healthMultiplier")] public float? HealthMultiplier { get; set; }

        [JsonProperty("manaMax")] public int? ManaMax { get; set; }
        [JsonProperty("manaRecoveryRate")] public int? ManaRecoveryRate { get; set; }
        [JsonProperty("manaMultiplier")] public float? ManaMultiplier { get; set; }

        [JsonProperty("energyMax")] public int? EnergyMax { get; set; }
        [JsonProperty("energyRecoveryRate")] public int? EnergyRecoveryRate { get; set; }

        /// <summary>
        /// Reported because the game rolls, accumulates and persists it. Whether it reaches the
        /// maximum is a question a comparison answers, not one this probe assumes.
        /// </summary>
        [JsonProperty("energyMultiplier")] public float? EnergyMultiplier { get; set; }
    }

    /// <summary>One armour set among the worn pieces, and what the set itself declares.</summary>
    /// <remarks>
    /// A set bonus is not a per-slot contribution: it is a threshold effect, so the totals cannot
    /// be reconciled from the worn pieces alone. This section carries the count and the declared
    /// bonuses so a reader can account for every point without this probe deciding when a
    /// threshold applies.
    /// </remarks>
    public sealed class ActiveSet
    {
        [JsonProperty("setId")] public string SetId { get; set; }
        [JsonProperty("name")] public string Name { get; set; }

        /// <summary>Pieces of this set that the engine counts, which excludes a worn-out one.</summary>
        [JsonProperty("piecesWorn")] public int PiecesWorn { get; set; }

        /// <summary>Numeric bonuses the set declares, keyed by the name the game gives each.</summary>
        [JsonProperty("declaredBonuses")] public Dictionary<string, double> DeclaredBonuses { get; set; }

        /// <summary>Skill levels the set declares, keyed by skill name.</summary>
        [JsonProperty("declaredSkillBonuses")] public Dictionary<string, int> DeclaredSkillBonuses { get; set; }

        /// <summary>
        /// Skill levels the engine currently grants from this set, read from the game rather than
        /// derived from the count, so the threshold stays where the game implements it.
        /// </summary>
        [JsonProperty("grantedSkillBonuses")] public Dictionary<string, int> GrantedSkillBonuses { get; set; }
    }

    /// <summary>The complete combat state of one entity.</summary>
    public sealed class EntitySheet
    {
        /// <summary>Either the player or one of its companions.</summary>
        [JsonProperty("kind")] public string Kind { get; set; }

        /// <summary>The class for a player, and the archetype for a companion.</summary>
        [JsonProperty("archetype")] public string Archetype { get; set; }

        [JsonProperty("race")] public string Race { get; set; }
        [JsonProperty("level")] public int Level { get; set; }

        [JsonProperty("attributes")] public Dictionary<string, int> Attributes { get; set; }

        /// <summary>Every stat the combat component computes, keyed by its own name.</summary>
        [JsonProperty("combat")] public Dictionary<string, double> Combat { get; set; }

        [JsonProperty("resources")] public ResourceSheet Resources { get; set; }

        /// <summary>Occupied slots only. An empty slot adds nothing and is not reported.</summary>
        [JsonProperty("equipment")] public List<EquippedPiece> Equipment { get; set; }

        /// <summary>Armour sets represented among the worn pieces.</summary>
        [JsonProperty("activeSets")] public List<ActiveSet> ActiveSets { get; set; }
    }

    /// <summary>A reading of the player and every companion it holds.</summary>
    public sealed class StatSheetResult
    {
        [JsonProperty("character")] public EntitySheet Character { get; set; }
        [JsonProperty("companions")] public List<EntitySheet> Companions { get; set; }
    }
}
