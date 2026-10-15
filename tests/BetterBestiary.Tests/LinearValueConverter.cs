using System;
using BetterBestiary.Skills;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace BetterBestiary.Tests;

/// <summary>
/// Deserializes a parity-corpus LinearValue field, written by the website as an
/// object such as <c>{"base_value": 300, "bonus_per_level": 0}</c>, onto
/// <see cref="LinearValue"/>, whose only constructor takes both components. The
/// zero-collapse that <c>parseLinearValue</c> performs lives in
/// <c>SkillEffectFormatter</c>, not here, so this preserves raw values.
/// </summary>
internal sealed class LinearValueConverter : JsonConverter<LinearValue>
{
    public override bool CanWrite => false;

    public override LinearValue? ReadJson(
        JsonReader reader,
        Type objectType,
        LinearValue? existingValue,
        bool hasExistingValue,
        JsonSerializer serializer)
    {
        var token = JToken.Load(reader);
        return token.Type switch
        {
            JTokenType.Null => null,
            JTokenType.Object => new LinearValue(
                token.Value<double?>("base_value") ?? 0,
                token.Value<double?>("bonus_per_level") ?? 0),
            _ => throw new JsonSerializationException(
                $"A LinearValue must be an object, not {token.Type}"),
        };
    }

    public override void WriteJson(JsonWriter writer, LinearValue? value, JsonSerializer serializer) =>
        throw new NotSupportedException();
}
