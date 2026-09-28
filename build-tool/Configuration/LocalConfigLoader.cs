using System;
using System.Collections.Generic;
using System.Linq;
using System.Xml.Linq;

namespace BuildTool.Configuration;

public static class LocalConfigLoader
{
    public static LocalConfig Load(string propsFilePath)
    {
        var props = ReadProperties(propsFilePath);

        string Require(string key)
        {
            if (!props.TryGetValue(key, out var value) || string.IsNullOrWhiteSpace(value))
                throw new InvalidOperationException($"{key} missing from {propsFilePath}");
            return value;
        }

        return new LocalConfig(
            GamePath: Require("ANCIENT_KINGDOMS_PATH"),
            DataExportPath: Require("DATA_EXPORT_PATH"),
            WinePath: Require("WINE_PATH"),
            WinePrefix: Require("WINE_PREFIX"),
            HotReplEndpoint: Optional(props, "HOTREPL_ENDPOINT") ?? "ws://127.0.0.1:18590");
    }

    public static string? LoadGamePath(string propsFilePath) =>
        Optional(ReadProperties(propsFilePath), "ANCIENT_KINGDOMS_PATH");

    private static Dictionary<string, string> ReadProperties(string propsFilePath)
    {
        var doc = XDocument.Load(propsFilePath);
        return doc.Descendants("PropertyGroup")
            .Elements()
            .ToDictionary(e => e.Name.LocalName, e => e.Value, StringComparer.OrdinalIgnoreCase);
    }

    private static string? Optional(IReadOnlyDictionary<string, string> props, string key) =>
        props.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value) ? value : null;
}
