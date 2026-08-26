#nullable disable
using System.Collections.Generic;
using Newtonsoft.Json;

namespace CombatVerification.Dtos
{
    /// <summary>Arguments for creating one fixture character.</summary>
    public sealed class CreateCharacterArgs
    {
        /// <summary>Name to give the character. The creator refuses a name it would refuse a player.</summary>
        [JsonProperty("characterName", Required = Required.Always)]
        public string CharacterName { get; set; }

        /// <summary>Class to select, as the creator names it or as an identifier.</summary>
        [JsonProperty("class", Required = Required.Always)]
        public string Class { get; set; }

        /// <summary>Race to select, as the creator names it or as an identifier.</summary>
        [JsonProperty("race", Required = Required.Always)]
        public string Race { get; set; }
    }

    /// <summary>What the creator produced, read back after it finished.</summary>
    public sealed class CreateCharacterResult
    {
        [JsonProperty("characterName", Required = Required.Default)]
        public string CharacterName { get; set; }

        /// <summary>Class the stored character holds, read from the save rather than assumed.</summary>
        [JsonProperty("storedClass", Required = Required.Default)]
        public string StoredClass { get; set; }

        /// <summary>Race the stored character holds, read from the save rather than assumed.</summary>
        [JsonProperty("storedRace", Required = Required.Default)]
        public string StoredRace { get; set; }

        /// <summary>Level the stored character holds. A new character starts at level 1.</summary>
        [JsonProperty("storedLevel", Required = Required.Default)]
        public int StoredLevel { get; set; }

        /// <summary>Classes the creator offered for the requested race.</summary>
        [JsonProperty("classesOfferedForRace", Required = Required.Default)]
        public List<string> ClassesOfferedForRace { get; set; }
    }
}
