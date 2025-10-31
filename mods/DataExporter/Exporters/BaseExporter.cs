using System;
using System.IO;
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

    protected string GetZoneId(UnityEngine.Transform transform, string zoneMonsterField)
    {
        // Priority 1: Use zoneMonster field if populated
        if (!string.IsNullOrEmpty(zoneMonsterField))
        {
            return zoneMonsterField.ToLowerInvariant().Replace(" ", "_");
        }

        // Priority 2: Walk up GameObject hierarchy to find zone
        UnityEngine.Transform root = transform;
        UnityEngine.Transform potentialZone = null;

        while (root.parent != null)
        {
            potentialZone = root;
            root = root.parent;
        }

        string zoneName;
        if (potentialZone != null && potentialZone != transform)
        {
            zoneName = potentialZone.name;
        }
        else
        {
            zoneName = root.name;
        }

        // Clean up "Entities" suffix
        if (zoneName.EndsWith(" Entities"))
        {
            zoneName = zoneName.Substring(0, zoneName.Length - 9);
        }

        return zoneName.ToLowerInvariant().Replace(" ", "_");
    }
}
