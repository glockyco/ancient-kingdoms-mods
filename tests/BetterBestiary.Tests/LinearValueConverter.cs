using System;
using BetterBestiary.Skills;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace BetterBestiary.Tests;

/// <summary>
/// Deserializes a parity-corpus LinearValue field, mirroring the polymorphism of
/// the website's <c>parseLinearValue</c>: the SQLite rows store LinearValue columns
/// as JSON strings (e.g. <c>"{\"base_value\":300,\"bonus_per_level\":0}"</c>), but the
/// converter also accepts a JSON object or a bare number so the fixture (and any
/// future shape) round-trips onto <see cref="LinearValue"/>. The zero-collapse that
/// <c>parseLinearValue</c> performs lives in <c>SkillEffectFormatter</c>, not here, so
/// this preserves raw values.
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
        switch (token.Type)
        {
            case JTokenType.Null:
                return null;
            case JTokenType.String:
                var raw = token.Value<string>();
                if (string.IsNullOrEmpty(raw))
                    return null;
                try
                {
                    return FromObject(JObject.Parse(raw));
                }
                catch (JsonException)
                {
                    return null;
                }
            case JTokenType.Object:
                return FromObject((JObject)token);
            case JTokenType.Integer:
            case JTokenType.Float:
                return new LinearValue(token.Value<double>(), 0);
            default:
                return null;
        }
    }

    private static LinearValue FromObject(JObject obj) =>
        new(obj.Value<double?>("base_value") ?? 0, obj.Value<double?>("bonus_per_level") ?? 0);

    public override void WriteJson(JsonWriter writer, LinearValue? value, JsonSerializer serializer) =>
        throw new NotSupportedException();
}
