using System;
using System.Linq;
using System.Xml.Linq;

namespace BuildTool.Configuration;

public static class LocalConfigLoader
{
    public static LocalConfig Load(string propsFilePath)
    {
        var doc = XDocument.Load(propsFilePath);
        var props = doc.Descendants("PropertyGroup")
            .Elements()
            .ToDictionary(e => e.Name.LocalName, e => e.Value, StringComparer.OrdinalIgnoreCase);

        string Require(string key)
        {
            if (!props.TryGetValue(key, out var value) || string.IsNullOrWhiteSpace(value))
                throw new InvalidOperationException($"{key} missing from {propsFilePath}");
            return value;
        }

        string? Optional(string key) =>
            props.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value) ? value : null;

        return new LocalConfig(
            GamePath: Require("ANCIENT_KINGDOMS_PATH"),
            DataExportPath: Require("DATA_EXPORT_PATH"),
            WinePath: Optional("WINE_PATH"),
            WinePrefix: Optional("WINE_PREFIX"),
            HotReplEndpoint: Optional("HOTREPL_ENDPOINT") ?? "ws://127.0.0.1:18590");
    }
}
