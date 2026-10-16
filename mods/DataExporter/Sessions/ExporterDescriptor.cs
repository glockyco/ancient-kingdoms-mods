using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;

namespace DataExporter.Sessions;

public sealed class ExporterDescriptor
{
    public string Id { get; }
    public IReadOnlyList<string> Outputs { get; }
    public bool Required { get; }
    public Action Export { get; }
    public IReadOnlyList<ImageReferences> Images { get; }

    public ExporterDescriptor(string id, string[] outputs, Action export, bool required = true,
        params ImageReferences[] images)
    {
        Id = id;
        Outputs = outputs;
        Export = export;
        Required = required;
        Images = images;
    }

    public static void Validate(IReadOnlyList<ExporterDescriptor> catalog)
    {
        var ids = new HashSet<string>(StringComparer.Ordinal);
        var paths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var descriptor in catalog)
        {
            if (string.IsNullOrWhiteSpace(descriptor.Id) || !ids.Add(descriptor.Id))
                throw new InvalidOperationException($"Duplicate or empty exporter id '{descriptor.Id}'.");
            if (descriptor.Export == null)
                throw new InvalidOperationException($"Exporter '{descriptor.Id}' has no action.");
            foreach (var path in descriptor.Outputs)
            {
                SessionIntegrity.ValidateRelativePath(path);
                if (path is "manifest.json" or "classes.json" or "static_data.json" || !paths.Add(path))
                    throw new InvalidOperationException($"Duplicate or reserved output path '{path}'.");
            }
            foreach (var references in descriptor.Images)
            {
                if (!Contains(descriptor.Outputs, references.Output))
                    throw new InvalidOperationException($"Exporter '{descriptor.Id}' references undeclared output '{references.Output}'.");
                if (string.IsNullOrWhiteSpace(references.Exporter))
                    throw new InvalidOperationException($"Image references in '{references.Output}' have no exporter id.");
            }
        }
    }

    private static bool Contains(IReadOnlyList<string> outputs, string path)
    {
        foreach (var output in outputs)
            if (output == path)
                return true;
        return false;
    }
}

public sealed class ImageReferences
{
    public string Output { get; }
    public string Exporter { get; }
    public Func<JToken, IEnumerable<string>> Read { get; }

    public ImageReferences(string output, string exporter, Func<JToken, IEnumerable<string>> read)
    {
        Output = output;
        Exporter = exporter;
        Read = read;
    }

    public static IEnumerable<string> ReadFields(JToken json, params string[] fields)
    {
        if (json is not JArray rows)
            throw new InvalidOperationException("Image references require a top-level JSON array.");
        foreach (var row in rows)
        {
            foreach (var field in fields)
            {
                var value = row[field];
                if (value?.Type != JTokenType.String || string.IsNullOrWhiteSpace(value.Value<string>()))
                    throw new InvalidOperationException($"Missing image reference '{field}'.");
                yield return value.Value<string>()!;
            }
        }
    }
}
