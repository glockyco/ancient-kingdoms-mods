#nullable disable
using System.Collections.Generic;
using CombatVerification.Fixtures;
using Newtonsoft.Json;

namespace CombatVerification.Dtos
{
    /// <summary>What to build the spawned player into.</summary>
    public sealed class BuildCharacterArgs
    {
        /// <summary>
        /// The character section of a fixture descriptor. The same shape a fixture carries, so a
        /// caller passes what it already holds.
        /// </summary>
        [JsonProperty("character", Required = Required.Always)]
        public CharacterSpec Character { get; set; }

        /// <summary>
        /// Companions the fixture declares. A fixture keeps these beside the character rather than
        /// inside it, so they are named separately here too. Absent means the fixture states
        /// nothing about companions, and an empty list means it states that there are none.
        /// </summary>
        [JsonProperty("companions", Required = Required.Default)]
        public List<CompanionSpec> Companions { get; set; }
    }

    /// <summary>One step of the build and what it achieved.</summary>
    public sealed class BuildStepDto
    {
        [JsonProperty("name", Required = Required.Default)]
        public string Name { get; set; }

        [JsonProperty("ok", Required = Required.Default)]
        public bool Ok { get; set; }

        [JsonProperty("detail", Required = Required.Default)]
        public string Detail { get; set; }
    }

    /// <summary>
    /// The build outcome, with the state read back from the player afterwards.
    /// </summary>
    public sealed class BuildCharacterResult
    {
        [JsonProperty("ok", Required = Required.Default)]
        public bool Ok { get; set; }

        [JsonProperty("steps", Required = Required.Default)]
        public List<BuildStepDto> Steps { get; set; }

        [JsonProperty("level", Required = Required.Default)]
        public int Level { get; set; }

        [JsonProperty("veteranPoints", Required = Required.Default)]
        public int VeteranPoints { get; set; }

        /// <summary>Points left unspent. A fixture that spends everything leaves zero.</summary>
        [JsonProperty("unspentAttributePoints", Required = Required.Default)]
        public int UnspentAttributePoints { get; set; }

        [JsonProperty("unspentSkillPoints", Required = Required.Default)]
        public int UnspentSkillPoints { get; set; }

        [JsonProperty("unspentVeteranPoints", Required = Required.Default)]
        public int UnspentVeteranPoints { get; set; }
    }
}
