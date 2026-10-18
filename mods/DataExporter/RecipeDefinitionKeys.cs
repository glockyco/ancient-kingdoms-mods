using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace DataExporter;

/// <summary>Private ingestion identities for complete, ordered native recipe definitions.</summary>
public sealed class RecipeDefinitionKeys
{
    private readonly Dictionary<string, string> _definitions = new(StringComparer.Ordinal);

    public string Register(string kind, string resultItemId, int amount,
        IEnumerable<(string ItemId, int Amount)> materials, int? level,
        bool cooking, bool scribing, int? experience)
    {
        if (kind != "crafting" && kind != "alchemy" && kind != "scribing")
            throw new InvalidOperationException($"Unknown recipe kind '{kind}'.");
        if (string.IsNullOrEmpty(resultItemId) || amount <= 0)
            throw new InvalidOperationException("Recipe requires a result and positive declared amount.");
        if (level < 0 || experience < 0)
            throw new InvalidOperationException($"Recipe {resultItemId} has a negative tier or experience.");
        var entries = materials.Select(material =>
        {
            if (string.IsNullOrEmpty(material.ItemId) || material.Amount <= 0)
                throw new InvalidOperationException($"Recipe {resultItemId} has an invalid material.");
            return new JArray(material.ItemId, material.Amount);
        });
        // Property order is part of this private canonical encoding. Material order is native.
        var definition = new JObject
        {
            ["amount"] = amount,
            ["cooking"] = cooking,
            ["experience"] = experience.HasValue ? new JValue(experience.Value) : JValue.CreateNull(),
            ["kind"] = kind,
            ["level"] = level.HasValue ? new JValue(level.Value) : JValue.CreateNull(),
            ["materials"] = new JArray(entries),
            ["result"] = resultItemId,
            ["scribing"] = scribing
        }.ToString(Formatting.None);
        var key = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(definition))).ToLowerInvariant();
        if (_definitions.TryGetValue(key, out var existing) && existing != definition)
            throw new InvalidOperationException($"Recipe definition key collision: {key}.");
        _definitions[key] = definition;
        return key;
    }
}
