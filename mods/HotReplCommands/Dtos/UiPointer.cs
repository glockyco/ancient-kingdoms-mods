#nullable disable
using Newtonsoft.Json;

namespace HotReplCommands.Dtos
{
    public sealed class UiPointerArgs
    {
        /// <summary>
        /// An active GameObject, as <c>GameObject.Find</c> takes it, such as
        /// <c>PC_GatheringButton</c> or <c>Canvas/Panel/Button</c>. The pointer goes to the centre of
        /// its rect, or for a world object to where the main camera shows it. Leave it out to give
        /// <see cref="X"/> and <see cref="Y"/>.
        /// </summary>
        [JsonProperty("path", Required = Required.Default)]
        public string Path { get; set; }

        /// <summary>A screen point in pixels from the bottom left, used when <see cref="Path"/> is absent.</summary>
        [JsonProperty("x", Required = Required.Default)]
        public float? X { get; set; }

        [JsonProperty("y", Required = Required.Default)]
        public float? Y { get; set; }

        /// <summary>"hover" holds the pointer there, "click" also presses and releases the left button.</summary>
        [JsonProperty("action", Required = Required.Default)]
        public string Action { get; set; } = "hover";

        /// <summary>
        /// How long the pointer stays there, in seconds, counted from the start. The command returns
        /// once hovers have had time to show, and the pointer stays for the rest, so a screenshot
        /// taken then shows the hover. A later call replaces the hold.
        /// </summary>
        [JsonProperty("holdSeconds", Required = Required.Default)]
        public float HoldSeconds { get; set; } = 5f;
    }

    public sealed class UiPointerResult
    {
        [JsonProperty("x")] public float X { get; set; }
        [JsonProperty("y")] public float Y { get; set; }

        /// <summary>The topmost interface element at the point, or null over the world, to show what takes the pointer there.</summary>
        [JsonProperty("topElement")] public string TopElement { get; set; }

        [JsonProperty("clicked")] public bool Clicked { get; set; }

        /// <summary>Seconds the pointer still stays there after the command returned.</summary>
        [JsonProperty("heldFor")] public float HeldFor { get; set; }
    }
}
