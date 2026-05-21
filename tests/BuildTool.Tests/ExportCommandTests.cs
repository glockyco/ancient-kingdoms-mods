using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Text.Json;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Commands;
using BuildTool.Configuration;
using BuildTool.Output;
using Xunit;

namespace BuildTool.Tests;

public class ExportCommandTests
{
    [Fact]
    public async Task UpdateRunsBeforeLaunchAndScreenshotsArgumentIsPassed()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        File.WriteAllText(Path.Combine(tempRoot, "config.toml"), """
            [steam]
            username = "steam-user"
            """);
        var exportDir = Path.Combine(tempRoot, "exported-data");
        var runner = new FakeProcessRunner();
        runner.Enqueue(new ProcessResult(0, "", "", default));
        runner.Enqueue(new ProcessResult(0, "", "", default));
        var command = CreateCommand(tempRoot, exportDir, runner);

        var result = await command.ExecuteAsync(null!, new ExportCommand.Settings { Update = true, Screenshots = true });

        Assert.Equal(7, result);
        Assert.Equal(2, runner.Calls.Count);
        Assert.Equal("steamcmd", runner.Calls[0].Program);
        Assert.Contains("--export-data", runner.Calls[1].Arguments);
        Assert.Contains("--export-screenshots", runner.Calls[1].Arguments);
        Directory.Delete(tempRoot, recursive: true);
    }

    [Fact]
    public async Task ReturnsSuccess_WhenResultFileShowsOkTrue()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var exportDir = Path.Combine(tempRoot, "exported-data");
        var runner = new ResultWritingProcessRunner(exportDir, """
            { "schemaVersion": 1, "ok": true, "exporters": [], "errors": [] }
            """);
        var command = CreateCommand(tempRoot, exportDir, runner);

        var result = await command.ExecuteAsync(null!, new ExportCommand.Settings());

        Assert.Equal(0, result);
        Directory.Delete(tempRoot, recursive: true);
    }

    [Fact]
    public async Task ReturnsCommandFailed_WhenResultFileShowsOkFalse()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var exportDir = Path.Combine(tempRoot, "exported-data");
        var runner = new ResultWritingProcessRunner(exportDir, """
            { "schemaVersion": 1, "ok": false, "exporters": [
                { "name": "items", "ok": false, "error": { "kind": "exporter_failed", "message": "boom" } }
            ], "errors": [] }
            """);
        var command = CreateCommand(tempRoot, exportDir, runner);

        var result = await command.ExecuteAsync(null!, new ExportCommand.Settings());

        Assert.Equal(7, result);
        Directory.Delete(tempRoot, recursive: true);
    }

    [Fact]
    public async Task IgnoresStaleResultFileFromPreviousRun()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var exportDir = Path.Combine(tempRoot, "exported-data");
        Directory.CreateDirectory(exportDir);
        File.WriteAllText(Path.Combine(exportDir, ".exporter-result.json"), """
            { "schemaVersion": 1, "ok": true, "exporters": [], "errors": [] }
            """);
        var runner = new FakeProcessRunner();
        runner.Enqueue(new ProcessResult(0, "", "", default));
        var command = CreateCommand(tempRoot, exportDir, runner);

        var result = await command.ExecuteAsync(null!, new ExportCommand.Settings());

        Assert.Equal(7, result);
        Directory.Delete(tempRoot, recursive: true);
    }

    [Fact]
    public async Task ReturnsSuccess_StoresExporterOutcomeForJsonEnvelope()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var exportDir = Path.Combine(tempRoot, "exported-data");
        var runner = new ResultWritingProcessRunner(exportDir, """
            { "schemaVersion": 1, "ok": true, "exporters": [
                { "name": "items", "ok": true, "count": 12, "outputPath": "items.json" }
            ], "errors": [] }
            """);
        var store = new CommandResultStore();
        var command = CreateCommand(tempRoot, exportDir, runner, store);

        var result = await command.ExecuteAsync(null!, new ExportCommand.Settings());

        Assert.Equal(0, result);
        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(store.Data));
        var root = doc.RootElement;
        Assert.EndsWith(".exporter-result.json", root.GetProperty("resultFile").GetString());
        var exporter = root.GetProperty("exporters")[0];
        Assert.Equal("items", exporter.GetProperty("name").GetString());
        Assert.Equal(12, exporter.GetProperty("count").GetInt32());
        Directory.Delete(tempRoot, recursive: true);
    }

    private static ExportCommand CreateCommand(
        string tempRoot,
        string exportDir,
        IProcessRunner runner,
        CommandResultStore? store = null)
    {
        var gamePath = Path.Combine(tempRoot, "game");
        Directory.CreateDirectory(gamePath);
        File.WriteAllText(Path.Combine(gamePath, "ancientkingdoms.exe"), "exe");
        var config = new LocalConfig(
            GamePath: gamePath,
            DataExportPath: exportDir,
            WinePath: null,
            WinePrefix: null);
        return new ExportCommand(tempRoot, config, runner, isMacOs: false, store);
    }

    private sealed class ResultWritingProcessRunner : IProcessRunner
    {
        private readonly string _exportDir;
        private readonly string _json;

        public ResultWritingProcessRunner(string exportDir, string json)
        {
            _exportDir = exportDir;
            _json = json;
        }

        public List<ProcessRequest> Calls { get; } = new();

        public Task<ProcessResult> RunAsync(ProcessRequest request, CancellationToken cancellationToken)
        {
            Calls.Add(request);
            Directory.CreateDirectory(_exportDir);
            File.WriteAllText(Path.Combine(_exportDir, ".exporter-result.json"), _json);
            return Task.FromResult(new ProcessResult(0, string.Empty, string.Empty, default));
        }
    }
}
