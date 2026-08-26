#nullable disable
using Newtonsoft.Json;

namespace HotReplCommands.Dtos
{
    public sealed class UseScratchDatabaseResult
    {
        /// <summary>Database path the game held before the redirect.</summary>
        [JsonProperty("previousPath",  Required = Required.AllowNull)] public string PreviousPath { get; set; }

        /// <summary>Database path the game holds now. A caller asserts on this.</summary>
        [JsonProperty("resolvedPath",  Required = Required.AllowNull)] public string ResolvedPath { get; set; }

        /// <summary>Whether the resolved path lies inside a scratch directory.</summary>
        [JsonProperty("isScratch",     Required = Required.Always)]   public bool IsScratch { get; set; }

        /// <summary>Characters the scratch database holds, after connecting.</summary>
        [JsonProperty("characterCount", Required = Required.AllowNull)] public int? CharacterCount { get; set; }
    }
}
