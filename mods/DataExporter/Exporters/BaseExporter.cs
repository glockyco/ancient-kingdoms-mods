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
}
