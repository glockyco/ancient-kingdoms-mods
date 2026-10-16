using System;
using System.Collections.Generic;
using System.Linq;
using System.Xml.Linq;

namespace BuildTool.Configuration;

public static class LocalConfigLoader
{
    /// <summary>
    /// The environment variable that gives one launch its HotRepl port. A second instance needs a
    /// port of its own, so the value belongs to the invocation rather than to Local.props.
    /// </summary>
    public const string HotReplPortVariable = "HOTREPL_PORT";

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
            HotReplEndpoint: ResolveHotReplEndpoint(
                Optional(props, "HOTREPL_ENDPOINT") ?? "ws://127.0.0.1:18590",
                Environment.GetEnvironmentVariable(HotReplPortVariable)));
    }

    /// <summary>
    /// The endpoint this invocation's client connects to. A launch with HOTREPL_PORT makes the
    /// game listen on that port, so the client takes the same port and keeps the configured host.
    /// </summary>
    internal static string ResolveHotReplEndpoint(string configured, string? port)
    {
        if (string.IsNullOrWhiteSpace(port))
            return configured;
        if (!int.TryParse(port, out var number) || number is < 1 or > 65535)
            throw new InvalidOperationException($"{HotReplPortVariable} is not a port number: {port}");
        return new UriBuilder(configured) { Port = number }.Uri.AbsoluteUri.TrimEnd('/');
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
