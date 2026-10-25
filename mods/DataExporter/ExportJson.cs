#nullable enable

using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

namespace DataExporter;

/// <summary>
/// Serializes export files byte for byte the same for the same data, so that two exports of an
/// unchanged game have the same digests.
/// </summary>
public static class ExportJson
{
    private static readonly JsonSerializerSettings Settings = new()
    {
        NullValueHandling = NullValueHandling.Ignore,
        DefaultValueHandling = DefaultValueHandling.Include,
        Formatting = Formatting.Indented,
        ContractResolver = new DeclarationOrderContractResolver(),
    };

    public static string Serialize(object data) => JsonConvert.SerializeObject(data, Settings);

    /// <summary>
    /// Orders rows by a unique key. Use it for rows that come from Unity's object enumeration,
    /// whose order is arbitrary and can change between game builds. Keep the game's order for
    /// rows read from a game-defined array.
    /// </summary>
    public static List<T> SortedRows<T>(IEnumerable<T> rows, Func<T, string> key, string what)
    {
        var sorted = rows.OrderBy(key, StringComparer.Ordinal).ToList();
        for (var i = 1; i < sorted.Count; i++)
        {
            if (string.Equals(key(sorted[i - 1]), key(sorted[i]), StringComparison.Ordinal))
                throw new InvalidOperationException($"{what}: key '{key(sorted[i])}' is not unique.");
        }
        return sorted;
    }

    /// <summary>
    /// Writes properties in declaration order, base class first. Reflection does not guarantee
    /// member order, and the order it returns changed between two runs of the same exporter.
    /// </summary>
    private sealed class DeclarationOrderContractResolver : DefaultContractResolver
    {
        protected override IList<JsonProperty> CreateProperties(Type type, MemberSerialization memberSerialization)
        {
            return base.CreateProperties(type, memberSerialization)
                .OrderBy(property => InheritanceDepth(property.DeclaringType))
                .ThenBy(property => MetadataToken(property))
                .ToList();
        }

        private static int InheritanceDepth(Type? type)
        {
            var depth = 0;
            for (var current = type?.BaseType; current != null; current = current.BaseType)
                depth++;
            return depth;
        }

        private static int MetadataToken(JsonProperty property)
        {
            const BindingFlags flags = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic
                | BindingFlags.DeclaredOnly;
            var declaringType = property.DeclaringType
                ?? throw new InvalidOperationException($"Property '{property.PropertyName}' has no declaring type.");
            var underlyingName = property.UnderlyingName
                ?? throw new InvalidOperationException($"Property '{property.PropertyName}' has no underlying member name.");
            var members = declaringType.GetMember(underlyingName, flags);
            if (members.Length != 1)
                throw new InvalidOperationException(
                    $"{declaringType.Name}.{underlyingName}: expected one member, found {members.Length}.");
            return members[0].MetadataToken;
        }
    }
}
