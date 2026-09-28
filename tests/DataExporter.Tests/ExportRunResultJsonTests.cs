using DataExporter.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace DataExporter.Tests
{
    public class ExportRunResultJsonTests
    {
        [Fact]
        public void FailurePayload_ContainsExporterErrorWithoutUnusedMetadata()
        {
            var result = new ExportRunResult
            {
                Ok = false,
                Exporters =
                {
                    new ExporterRunResult
                    {
                        Name = "skills",
                        Ok = false,
                        Error = new ExporterRunError { Kind = "exporter_failed", Message = "Cannot write skills.json" },
                    },
                },
                Errors = { "skills: Cannot write skills.json" },
            };

            var payload = JObject.Parse(JsonConvert.SerializeObject(result));
            var exporter = Assert.IsType<JObject>(payload["exporters"]![0]);
            Assert.Equal(false, (bool?)payload["ok"]);
            Assert.Equal("skills", (string?)exporter["name"]);
            Assert.Equal(false, (bool?)exporter["ok"]);
            Assert.Equal("Cannot write skills.json", (string?)exporter["error"]?["message"]);
            Assert.Null(exporter["required"]);
            Assert.Null(exporter["count"]);
            Assert.Null(exporter["outputPath"]);
            Assert.Equal("skills: Cannot write skills.json", (string?)payload["errors"]![0]);
        }
    }
}
