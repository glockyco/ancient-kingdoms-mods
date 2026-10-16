#nullable disable
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Security.Cryptography;
using BuildTool.Game;
using DataExporter.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace DataExporter.Sessions;

public static class ExportSession
{
    public static ExportRunResult Run(string exportRoot, string gameDirectory,
        Func<string, IReadOnlyList<ExporterDescriptor>> createCatalog)
    {
        var startedAt = DateTime.UtcNow;
        var id = startedAt.ToString("yyyyMMdd'T'HHmmss'Z'", CultureInfo.InvariantCulture)
            + "-" + Convert.ToHexString(RandomNumberGenerator.GetBytes(4)).ToLowerInvariant();
        var staging = Path.Combine(exportRoot, "staging", id);
        var result = new ExportRunResult { StartedAt = startedAt, SessionId = id, SessionPath = staging };
        try
        {
            Directory.CreateDirectory(staging);
            var catalog = createCatalog(staging);
            ExporterDescriptor.Validate(catalog);
            foreach (var descriptor in catalog)
            {
                var exporter = new ExporterRunResult { Name = descriptor.Id };
                try
                {
                    descriptor.Export();
                    exporter.Ok = true;
                }
                catch (Exception ex)
                {
                    exporter.Error = new ExporterRunError { Kind = "exporter_failed", Message = ex.Message };
                    if (descriptor.Required)
                        result.Errors.Add($"{descriptor.Id}: {ex.Message}");
                }
                result.Exporters.Add(exporter);
            }
            if (result.Errors.Count != 0)
                return Complete(result);

            var manifest = BuildManifest(staging, catalog, id, startedAt, ReadSteamBuildId(gameDirectory));
            File.WriteAllText(Path.Combine(staging, "manifest.json"), JsonConvert.SerializeObject(manifest, Formatting.Indented));
            SessionIntegrity.Verify(staging);
            var previousId = ReadActiveSessionId(exportRoot);
            var promoted = Path.Combine(exportRoot, "sessions", id);
            Directory.CreateDirectory(Path.GetDirectoryName(promoted)!);
            Directory.Move(staging, promoted);
            try
            {
                WritePointer(exportRoot, id);
            }
            catch
            {
                Directory.Move(promoted, staging);
                throw;
            }
            result.Ok = true;
            result.SessionPath = promoted;
            // The pointer is committed. A cleanup failure cannot undo publication.
            try { RetainSessions(exportRoot, id, previousId); }
            catch (Exception ex) { result.Errors.Add($"Session promoted, but retention failed: {ex.Message}"); }
        }
        catch (Exception ex)
        {
            result.Errors.Add(ex.Message);
        }
        return Complete(result);
    }

    public static ExportSessionManifest BuildManifest(string staging, IReadOnlyList<ExporterDescriptor> catalog,
        string sessionId, DateTime startedAt, string steamBuildId)
    {
        ExporterDescriptor.Validate(catalog);
        var manifest = new ExportSessionManifest
        {
            SessionId = sessionId,
            StartedAt = startedAt,
            CompletedAt = DateTime.UtcNow,
            SteamBuildId = steamBuildId,
        };
        var owned = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var json = new Dictionary<string, JToken>(StringComparer.Ordinal);
        foreach (var descriptor in catalog)
        {
            foreach (var output in descriptor.Outputs)
            {
                var path = SessionIntegrity.ResolvePath(staging, output);
                var content = SessionIntegrity.ReadJson(path);
                json.Add(output, content);
                owned.Add(output, descriptor.Id);
                manifest.Files.Add(Describe(path, output, descriptor.Id, SessionIntegrity.CountJson(content, path)));
            }
        }
        foreach (var descriptor in catalog)
        {
            foreach (var references in descriptor.Images)
            {
                foreach (var image in references.Read(json[references.Output]))
                {
                    var path = SessionIntegrity.ResolvePath(staging, image);
                    if (owned.TryGetValue(image, out var owner))
                    {
                        if (owner != references.Exporter || json.ContainsKey(image))
                            throw new InvalidDataException($"Image '{image}' has conflicting owners '{owner}' and '{references.Exporter}'.");
                        continue;
                    }
                    owned.Add(image, references.Exporter);
                    manifest.Files.Add(Describe(path, image, references.Exporter, null));
                }
            }
        }
        foreach (var file in Directory.EnumerateFiles(staging, "*", SearchOption.AllDirectories))
        {
            var relative = Path.GetRelativePath(staging, file).Replace('\\', '/');
            if (!owned.ContainsKey(relative))
                throw new InvalidDataException($"Unowned staging file '{relative}' in '{staging}'.");
        }
        if (!json.TryGetValue("game_config.json", out var config))
            throw new InvalidDataException("Required output 'game_config.json' is not registered.");
        manifest.GameVersion = RequiredText(config, "game_version", "game_config.json");
        manifest.Locale = RequiredText(config, "export_locale", "game_config.json");
        return manifest;
    }

    public static string ReadSteamBuildId(string gameDirectory)
    {
        var game = new DirectoryInfo(Path.GetFullPath(gameDirectory));
        var steamApps = game.Parent?.Parent;
        var manifestPath = Path.Combine(steamApps?.FullName ?? game.FullName,
            SteamAppManifests.FileName(SteamAppManifests.AncientKingdomsAppId));
        var manifest = SteamAppManifests.Read(manifestPath)
            ?? throw new InvalidDataException($"Steam manifest '{manifestPath}' is missing or incomplete.");
        if (!manifest.IsFullyInstalled)
            throw new InvalidDataException($"Steam manifest '{manifestPath}' has StateFlags {manifest.StateFlags}, expected {SteamAppManifest.StateFullyInstalled}.");
        var installed = Path.GetFullPath(Path.Combine(steamApps!.FullName, "common", manifest.InstallDir));
        if (!string.Equals(installed, game.FullName, OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal))
            throw new InvalidDataException($"Steam manifest '{manifestPath}' names install '{installed}', not running install '{game.FullName}'.");
        if (string.IsNullOrWhiteSpace(manifest.BuildId))
            throw new InvalidDataException($"Steam manifest '{manifestPath}' has an empty buildid.");
        return manifest.BuildId;
    }

    private static SessionFile Describe(string fullPath, string path, string exporter, long? count)
    {
        var info = new FileInfo(fullPath);
        if (!info.Exists)
            throw new FileNotFoundException($"Required session file '{path}' is missing.", fullPath);
        return new SessionFile
        {
            Path = path,
            Exporter = exporter,
            Bytes = info.Length,
            Count = count,
            Sha256 = SessionIntegrity.Digest(fullPath),
        };
    }

    private static string RequiredText(JToken json, string field, string path)
    {
        var value = json[field];
        if (value?.Type != JTokenType.String || string.IsNullOrWhiteSpace(value.Value<string>()))
            throw new InvalidDataException($"'{path}' requires nonempty '{field}'.");
        return value.Value<string>()!;
    }

    private static string ReadActiveSessionId(string root)
    {
        var path = Path.Combine(root, "active-session.json");
        if (!File.Exists(path))
            return null;
        var pointer = JObject.Parse(File.ReadAllText(path));
        var id = RequiredText(pointer, "session_id", path);
        SessionIntegrity.ValidateSessionId(id);
        if (RequiredText(pointer, "path", path) != $"sessions/{id}" || id.Contains('/'))
            throw new InvalidDataException($"Invalid active session pointer '{path}'.");
        return id;
    }

    private static void WritePointer(string root, string id)
    {
        var pointer = Path.Combine(root, "active-session.json");
        var temporary = Path.Combine(root, $".active-session-{id}.tmp");
        try
        {
            File.WriteAllText(temporary, new JObject { ["session_id"] = id, ["path"] = $"sessions/{id}" }.ToString(Formatting.None));
            File.Move(temporary, pointer, overwrite: true);
        }
        finally
        {
            if (File.Exists(temporary))
                File.Delete(temporary);
        }
    }

    private static void RetainSessions(string root, string current, string previous)
    {
        foreach (var directory in Directory.EnumerateDirectories(Path.Combine(root, "sessions")))
        {
            var id = Path.GetFileName(directory);
            if (id != current && id != previous)
                Directory.Delete(directory, recursive: true);
        }
        foreach (var directory in Directory.EnumerateDirectories(Path.Combine(root, "staging")))
            Directory.Delete(directory, recursive: true);
    }

    private static ExportRunResult Complete(ExportRunResult result)
    {
        result.CompletedAt = DateTime.UtcNow;
        result.DurationMs = (long)(result.CompletedAt - result.StartedAt).TotalMilliseconds;
        return result;
    }
}
