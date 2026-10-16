#nullable disable
using Newtonsoft.Json;

namespace HotReplCommands.Dtos
{
    /// <summary>Arguments for creating one character.</summary>
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

        /// <summary>
        /// Character from an earlier run that may be removed when it blocks this creation. The
        /// command never chooses a character to remove on the caller's behalf.
        /// </summary>
        [JsonProperty("replaceCharacterName", Required = Required.Default)]
        public string ReplaceCharacterName { get; set; }
    }
}
