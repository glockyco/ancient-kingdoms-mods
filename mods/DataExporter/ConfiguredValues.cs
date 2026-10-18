using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace DataExporter;

/// <summary>Value-only capture. Every read returns a detached DTO, never a live actor or mutable source array.</summary>
public sealed class ConfiguredValues
{
    private readonly Dictionary<string, string> _values;
    private bool _valid = true;

    public ConfiguredValues(IReadOnlyDictionary<string, object> values)
    {
        _values = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var pair in values)
            _values.Add(pair.Key, JsonConvert.SerializeObject(pair.Value));
    }

    public void Invalidate() => _valid = false;

    public T Read<T>(string key)
    {
        if (!_valid)
            throw new InvalidOperationException("Configured World snapshot was invalidated. Reload World before exporting.");
        return JsonConvert.DeserializeObject<T>(_values[key])
            ?? throw new InvalidOperationException($"Configured capture '{key}' is null. Reload World.");
    }
}
