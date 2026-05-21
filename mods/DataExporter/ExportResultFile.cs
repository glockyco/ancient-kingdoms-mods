using System.IO;
using DataExporter.Models;
using Newtonsoft.Json;

namespace DataExporter
{
    public static class ExportResultFile
    {
        public const string FileName = ".exporter-result.json";

        public static void Write(string directory, ExportRunResult result)
        {
            if (!Directory.Exists(directory))
                Directory.CreateDirectory(directory);

            var finalPath = Path.Combine(directory, FileName);
            var tempPath = finalPath + ".tmp";
            var json = JsonConvert.SerializeObject(result, Formatting.Indented);
            File.WriteAllText(tempPath, json);
            if (File.Exists(finalPath)) File.Delete(finalPath);
            File.Move(tempPath, finalPath);
        }
    }
}
