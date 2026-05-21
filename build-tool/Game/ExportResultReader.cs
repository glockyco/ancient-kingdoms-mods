using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace BuildTool.Game;

public sealed record ExportOutcome(
    bool Ok,
    bool TimedOut,
    bool UnknownSchema,
    IReadOnlyList<ExporterOutcome> Exporters,
    string? ErrorMessage = null);

public sealed record ExporterOutcome(
    string Name,
    bool Ok,
    int? Count,
    string? OutputPath,
    string? ErrorMessage);

public static class ExportResultReader
{
    public const string FileName = ".exporter-result.json";
    public const int SupportedSchemaVersion = 1;

    public static async Task<ExportOutcome> WaitForResultAsync(
        string directory,
        TimeSpan timeout,
        CancellationToken cancellationToken)
    {
        var path = Path.Combine(directory, FileName);
        var deadline = DateTime.UtcNow + timeout;

        while (!cancellationToken.IsCancellationRequested)
        {
            if (File.Exists(path))
            {
                try { return Parse(await File.ReadAllTextAsync(path, cancellationToken)); }
                catch (IOException) { }
            }

            if (DateTime.UtcNow >= deadline)
                return TimedOut();

            await Task.Delay(TimeSpan.FromMilliseconds(200), cancellationToken);
        }

        return TimedOut();
    }

    private static ExportOutcome Parse(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var version = root.GetProperty("schemaVersion").GetInt32();
        if (version != SupportedSchemaVersion)
        {
            return new ExportOutcome(
                false,
                TimedOut: false,
                UnknownSchema: true,
                Array.Empty<ExporterOutcome>(),
                ErrorMessage: $"Unknown schemaVersion {version}");
        }

        var ok = root.GetProperty("ok").GetBoolean();
        var exporters = new List<ExporterOutcome>();
        if (root.TryGetProperty("exporters", out var arr))
        {
            foreach (var exporter in arr.EnumerateArray())
            {
                exporters.Add(new ExporterOutcome(
                    Name: exporter.GetProperty("name").GetString() ?? string.Empty,
                    Ok: exporter.GetProperty("ok").GetBoolean(),
                    Count: exporter.TryGetProperty("count", out var count) ? count.GetInt32() : null,
                    OutputPath: exporter.TryGetProperty("outputPath", out var path) ? path.GetString() : null,
                    ErrorMessage: exporter.TryGetProperty("error", out var error)
                        && error.TryGetProperty("message", out var message)
                            ? message.GetString()
                            : null));
            }
        }

        return new ExportOutcome(ok, TimedOut: false, UnknownSchema: false, exporters);
    }

    private static ExportOutcome TimedOut() =>
        new(false, TimedOut: true, UnknownSchema: false, Array.Empty<ExporterOutcome>());
}
