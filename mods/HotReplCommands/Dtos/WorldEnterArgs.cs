#nullable disable
using Newtonsoft.Json;

namespace HotReplCommands.Dtos
{
    public sealed class WorldEnterArgs
    {
        /// <summary>
        /// Character to enter as. When absent, world entry selects the lowest name in
        /// ordinal order, so one character set yields one answer.
        /// </summary>
        [JsonProperty("character", Required = Required.Default)]
        public string Character { get; set; }
    }
}
