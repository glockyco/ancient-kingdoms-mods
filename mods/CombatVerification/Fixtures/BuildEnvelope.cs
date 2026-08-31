#nullable disable
using System.Collections.Generic;
using Newtonsoft.Json;

namespace CombatVerification.Fixtures
{
    /// <summary>Versions understood by this harness and the planner adapters.</summary>
    public static class BuildContract
    {
        public const int SerializedSchemaVersion = 1;
        public const int CaptureSchemaVersion = 1;
        public const string ModelVersion = "1";

        public static IReadOnlyCollection<int> SupportedSerializedSchemas { get; }
            = new[] { SerializedSchemaVersion };

        public static IReadOnlyCollection<int> SupportedCaptureSchemas { get; }
            = new[] { CaptureSchemaVersion };
    }

    /// <summary>Version axes that determine whether two planner builds are comparable.</summary>
    public sealed class BuildEnvelope
    {
        [JsonProperty("serializedSchemaVersion", Required = Required.Default)]
        public int SerializedSchemaVersion { get; set; }

        [JsonProperty("captureSchemaVersion", Required = Required.Default)]
        public int CaptureSchemaVersion { get; set; }

        [JsonProperty("modelVersion", Required = Required.Default)]
        public string ModelVersion { get; set; }

        [JsonProperty("gameData", Required = Required.Default)]
        public GameDataVersion GameData { get; set; }
    }

    /// <summary>Identity of the game data from which a build was derived.</summary>
    public sealed class GameDataVersion
    {
        [JsonProperty("gameVersion", Required = Required.Default)]
        public string GameVersion { get; set; }

        [JsonProperty("steamBuildId", Required = Required.Default)]
        public string SteamBuildId { get; set; }

        [JsonProperty("assemblySha256", Required = Required.Default)]
        public string AssemblySha256 { get; set; }
    }
}
