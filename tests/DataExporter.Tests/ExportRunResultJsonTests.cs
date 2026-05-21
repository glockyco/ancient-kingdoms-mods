using DataExporter.Models;
using Newtonsoft.Json;
using Xunit;

namespace DataExporter.Tests
{
    public class ExportRunResultJsonTests
    {
        [Fact]
        public void RoundTrip_PreservesAllFields()
        {
            var original = new ExportRunResult
            {
                Ok = true,
                Exporters =
                {
                    new ExporterRunResult { Name = "ok", Ok = true, Required = true, Count = 5 },
                    new ExporterRunResult { Name = "fail", Ok = false, Required = false,
                        Error = new ExporterRunError { Kind = "exporter_failed", Message = "boom" } },
                },
            };

            var json = JsonConvert.SerializeObject(original);
            var roundTripped = JsonConvert.DeserializeObject<ExportRunResult>(json)!;

            Assert.Equal(2, roundTripped.Exporters.Count);
            Assert.Equal("fail", roundTripped.Exporters[1].Name);
            Assert.Equal("boom", roundTripped.Exporters[1].Error!.Message);
        }
    }
}
