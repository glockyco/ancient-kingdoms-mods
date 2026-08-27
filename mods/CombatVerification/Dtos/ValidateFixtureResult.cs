#nullable disable
using System.Collections.Generic;
using Newtonsoft.Json;

namespace CombatVerification.Dtos
{
    public sealed class FixtureProblemDto
    {
        [JsonProperty("field", Required = Required.Default)] public string Field { get; set; }
        [JsonProperty("message", Required = Required.Default)] public string Message { get; set; }
    }

    public sealed class ValidateFixtureResult
    {
        /// <summary>Whether the fixture describes a character the game could produce.</summary>
        [JsonProperty("ok", Required = Required.Always)] public bool Ok { get; set; }

        /// <summary>Every field at fault, so one pass names them all.</summary>
        [JsonProperty("problems", Required = Required.Default)]
        public List<FixtureProblemDto> Problems { get; set; }

        /// <summary>Rules the check ran against, reported so a result can be attributed.</summary>
        [JsonProperty("maxLevel", Required = Required.Default)] public int MaxLevel { get; set; }

        [JsonProperty("maxVeteranPoints", Required = Required.Default)]
        public int MaxVeteranPoints { get; set; }

        [JsonProperty("equipmentSlotCount", Required = Required.Default)]
        /// <summary>
        /// Slots the fixture's own class carries. Each archetype serializes its own slot table,
        /// so this describes the class that was checked rather than every class.
        /// </summary>
        public int EquipmentSlotCount { get; set; }

        [JsonProperty("offhandSlot", Required = Required.Default)] public int OffhandSlot { get; set; }

        [JsonProperty("classes", Required = Required.Default)] public List<string> Classes { get; set; }
    }
}
