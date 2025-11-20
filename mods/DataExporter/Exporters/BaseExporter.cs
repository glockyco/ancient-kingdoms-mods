using System;
using System.IO;
using System.Text.RegularExpressions;
using MelonLoader;
using Newtonsoft.Json;

namespace DataExporter.Exporters;

public abstract class BaseExporter
{
    protected readonly MelonLogger.Instance Logger;
    protected readonly string ExportPath;

    protected BaseExporter(MelonLogger.Instance logger, string exportPath)
    {
        Logger = logger;
        ExportPath = exportPath;
    }

    public abstract void Export();

    /// <summary>
    /// Sanitizes a Unity object name to create a URL-safe ID.
    /// Converts to lowercase, replaces spaces with underscores, and removes special characters.
    /// </summary>
    protected static string SanitizeId(string input)
    {
        if (string.IsNullOrEmpty(input))
            return input;

        // Convert to lowercase and replace spaces with underscores
        var sanitized = input.ToLowerInvariant().Replace(" ", "_");

        // Remove URL-unsafe characters: # % ? & / \ and other special chars except _ and -
        sanitized = Regex.Replace(sanitized, @"[^a-z0-9_\-]", "");

        return sanitized;
    }

    protected void WriteJson<T>(T data, string filename)
    {
        try
        {
            var json = JsonConvert.SerializeObject(data, Formatting.Indented, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                DefaultValueHandling = DefaultValueHandling.Include
            });

            var filePath = Path.Combine(ExportPath, filename);
            File.WriteAllText(filePath, json);
            Logger.Msg($"✓ Exported {filename}");
        }
        catch (Exception ex)
        {
            Logger.Error($"Failed to export {filename}: {ex.Message}");
        }
    }
}
