using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Game;
using Xunit;

namespace BuildTool.Tests;

public class ExportResultReaderTests
{
    [Fact]
    public async Task ReadAsync_ReturnsOutcome_WhenFileExistsWithSchemaVersion1()
    {
        var dir = Directory.CreateTempSubdirectory().FullName;
        try
        {
            var path = Path.Combine(dir, ".exporter-result.json");
            File.WriteAllText(path, """
                {
                  "schemaVersion": 1,
                  "ok": true,
                  "exporters": [{ "name": "items", "ok": true }],
                  "errors": []
                }
                """);

            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
            var outcome = await ExportResultReader.WaitForResultAsync(dir, TimeSpan.FromSeconds(1), cts.Token);

            Assert.True(outcome.Ok);
            Assert.Single(outcome.Exporters);
        }
        finally { Directory.Delete(dir, recursive: true); }
    }

    [Fact]
    public async Task ReadAsync_TimesOut_WhenFileNeverAppears()
    {
        var dir = Directory.CreateTempSubdirectory().FullName;
        try
        {
            var outcome = await ExportResultReader.WaitForResultAsync(
                dir,
                TimeSpan.FromMilliseconds(100),
                CancellationToken.None);
            Assert.True(outcome.TimedOut);
        }
        finally { Directory.Delete(dir, recursive: true); }
    }

    [Fact]
    public async Task ReadAsync_FailsOnUnknownSchemaVersion()
    {
        var dir = Directory.CreateTempSubdirectory().FullName;
        try
        {
            var path = Path.Combine(dir, ".exporter-result.json");
            File.WriteAllText(path, """{ "schemaVersion": 99, "ok": true }""");

            var outcome = await ExportResultReader.WaitForResultAsync(dir, TimeSpan.FromSeconds(1), CancellationToken.None);

            Assert.False(outcome.Ok);
            Assert.True(outcome.UnknownSchema);
        }
        finally { Directory.Delete(dir, recursive: true); }
    }
}
