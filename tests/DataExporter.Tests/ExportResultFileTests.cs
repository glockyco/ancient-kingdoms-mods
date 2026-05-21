using System;
using System.IO;
using DataExporter;
using DataExporter.Models;
using Newtonsoft.Json.Linq;
using Xunit;

namespace DataExporter.Tests
{
    public class ExportResultFileTests
    {
        [Fact]
        public void Write_ProducesWellFormedJson()
        {
            var dir = CreateTempDirectory();
            try
            {
                var result = new ExportRunResult
                {
                    Ok = true,
                    Exporters =
                    {
                        new ExporterRunResult { Name = "items", Ok = true, Count = 100, OutputPath = "items.json" },
                    },
                };

                ExportResultFile.Write(dir, result);

                var path = Path.Combine(dir, ExportResultFile.FileName);
                Assert.True(File.Exists(path));
                var json = JObject.Parse(File.ReadAllText(path));
                Assert.Equal(1, (int)json["schemaVersion"]!);
                Assert.True((bool)json["ok"]!);
                Assert.Equal("items", (string)json["exporters"]![0]!["name"]!);
            }
            finally { Directory.Delete(dir, recursive: true); }
        }

        [Fact]
        public void Write_IsAtomic_OverwritesExistingFile()
        {
            var dir = CreateTempDirectory();
            try
            {
                ExportResultFile.Write(dir, new ExportRunResult { Ok = false });
                ExportResultFile.Write(dir, new ExportRunResult { Ok = true });

                var path = Path.Combine(dir, ExportResultFile.FileName);
                var json = JObject.Parse(File.ReadAllText(path));
                Assert.True((bool)json["ok"]!);
            }
            finally { Directory.Delete(dir, recursive: true); }
        }

        private static string CreateTempDirectory()
        {
            var dir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(dir);
            return dir;
        }
    }
}
