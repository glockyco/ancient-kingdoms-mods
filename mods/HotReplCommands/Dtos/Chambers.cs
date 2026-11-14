#nullable disable
using Newtonsoft.Json;

namespace HotReplCommands.Dtos
{
    public sealed class RaiseLevelArgs
    {
        [JsonProperty("level")] public int Level { get; set; } = 40;
    }
    public sealed class GrantItemArgs
    {
        [JsonProperty("itemName", Required = Required.Always)] public string ItemName { get; set; }
        [JsonProperty("amount")] public int Amount { get; set; } = 1;
    }
    public sealed class ChambersNavigateArgs
    {
        /// <summary>approach, interact, answer, or leave. Interact and answer use the game's commands.</summary>
        [JsonProperty("action", Required = Required.Always)] public string Action { get; set; }
        [JsonProperty("objectIndex")] public int ObjectIndex { get; set; }
        [JsonProperty("choice")] public int Choice { get; set; }
    }
    public sealed class ScratchMutationResult
    {
        [JsonProperty("character")] public string Character { get; set; }
        [JsonProperty("subject")] public string Subject { get; set; }
        [JsonProperty("before")] public int Before { get; set; }
        [JsonProperty("after")] public int After { get; set; }
    }
    public sealed class ChambersState
    {
        [JsonProperty("character")] public string Character { get; set; }
        [JsonProperty("runId")] public int RunId { get; set; }
        [JsonProperty("runSeed")] public int RunSeed { get; set; }
        [JsonProperty("chamberIndex")] public int ChamberIndex { get; set; }
        [JsonProperty("trialKind")] public string TrialKind { get; set; }
        [JsonProperty("ready")] public bool Ready { get; set; }
        [JsonProperty("complete")] public bool Complete { get; set; }
        [JsonProperty("alive")] public bool Alive { get; set; }
        [JsonProperty("sceneHandle")] public int SceneHandle { get; set; }
        [JsonProperty("roomId")] public int RoomId { get; set; }
        [JsonProperty("timeRemaining")] public double TimeRemaining { get; set; }
        [JsonProperty("roomCamera")] public float[] RoomCamera { get; set; }

        public bool SameReadyRoom(ChambersState other) => Ready && other != null && other.Ready &&
            Alive && other.Alive && RunId == other.RunId && RunSeed == other.RunSeed &&
            ChamberIndex == other.ChamberIndex && TrialKind == other.TrialKind &&
            SceneHandle == other.SceneHandle && RoomId == other.RoomId && Character == other.Character;
    }
    public sealed class ChambersActionResult
    {
        [JsonProperty("before")] public ChambersState Before { get; set; }
        [JsonProperty("after")] public ChambersState After { get; set; }
        [JsonProperty("sealBefore")] public int? SealBefore { get; set; }
        [JsonProperty("sealAfter")] public int? SealAfter { get; set; }
    }
}
