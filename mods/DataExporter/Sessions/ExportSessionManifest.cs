using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace DataExporter.Sessions;

public sealed class ExportSessionManifest
{
    [JsonProperty("schema_version", Required = Required.Always)]
    public int SchemaVersion { get; set; } = 1;
    [JsonProperty("session_id", Required = Required.Always)]
    public string SessionId { get; set; } = "";
    [JsonProperty("started_at", Required = Required.Always)]
    public DateTime StartedAt { get; set; }
    [JsonProperty("completed_at", Required = Required.Always)]
    public DateTime CompletedAt { get; set; }
    [JsonProperty("game_version", Required = Required.Always)]
    public string GameVersion { get; set; } = "";
    [JsonProperty("locale", Required = Required.Always)]
    public string Locale { get; set; } = "";
    [JsonProperty("steam_build_id", Required = Required.Always)]
    public string SteamBuildId { get; set; } = "";
    [JsonProperty("files", Required = Required.Always)]
    public List<SessionFile> Files { get; set; } = new();
}

public sealed class SessionFile
{
    [JsonProperty("path", Required = Required.Always)]
    public string Path { get; set; } = "";
    [JsonProperty("exporter", Required = Required.Always)]
    public string Exporter { get; set; } = "";
    [JsonProperty("bytes", Required = Required.Always)]
    public long Bytes { get; set; }
    [JsonProperty("count", Required = Required.AllowNull)]
    public long? Count { get; set; }
    [JsonProperty("sha256", Required = Required.Always)]
    public string Sha256 { get; set; } = "";
}

public static class SessionIntegrity
{
    public const string PublishedLocale = "en";

    public static ExportSessionManifest Verify(string sessionPath, string expectedLocale = PublishedLocale)
    {
        var path = System.IO.Path.Combine(sessionPath, "manifest.json");
        var manifest = JsonConvert.DeserializeObject<ExportSessionManifest>(File.ReadAllText(path))
            ?? throw new InvalidDataException($"'{path}' is not a session manifest.");
        if (manifest.SchemaVersion != 1)
            throw new InvalidDataException($"'{path}' has schema_version {manifest.SchemaVersion}, expected 1.");
        ValidateSessionId(manifest.SessionId);
        if (System.IO.Path.GetFileName(System.IO.Path.TrimEndingDirectorySeparator(sessionPath)) != manifest.SessionId)
            throw new InvalidDataException($"'{path}' has session_id '{manifest.SessionId}' that does not match directory '{sessionPath}'.");
        if (manifest.Locale != expectedLocale)
            throw new InvalidDataException($"'{path}' has locale '{manifest.Locale}', expected '{expectedLocale}'.");
        if (string.IsNullOrWhiteSpace(manifest.GameVersion) || string.IsNullOrWhiteSpace(manifest.SteamBuildId))
            throw new InvalidDataException($"'{path}' requires game_version and steam_build_id.");
        var listed = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "manifest.json" };
        foreach (var file in manifest.Files)
        {
            var fullPath = ResolvePath(sessionPath, file.Path);
            if (!listed.Add(file.Path))
                throw new InvalidDataException($"Duplicate or reserved manifest path '{file.Path}'.");
            if (string.IsNullOrWhiteSpace(file.Exporter) || file.Bytes < 0 || file.Count < 0
                || !Regex.IsMatch(file.Sha256, @"\A[0-9a-f]{64}\z"))
                throw new InvalidDataException($"Invalid manifest entry '{file.Path}'.");
            if (file.Path is "classes.json" or "static_data.json")
                throw new InvalidDataException($"Curated input '{file.Path}' is not runtime session data.");
            var info = new FileInfo(fullPath);
            if (!info.Exists)
                throw new FileNotFoundException($"Manifest file '{file.Path}' is missing.", fullPath);
            RejectLink(info);
            if (info.Length != file.Bytes)
                throw new InvalidDataException($"'{fullPath}' has {info.Length} bytes, expected {file.Bytes}.");
            if (Digest(fullPath) != file.Sha256)
                throw new InvalidDataException($"SHA-256 mismatch for '{fullPath}'.");
            if (file.Path.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
            {
                if (CountJson(ReadJson(fullPath), fullPath) != file.Count)
                    throw new InvalidDataException($"JSON count mismatch for '{fullPath}'.");
            }
            else if (file.Count != null)
                throw new InvalidDataException($"Image '{fullPath}' must have count null.");
        }
        foreach (var file in Directory.EnumerateFiles(sessionPath, "*", SearchOption.AllDirectories))
        {
            var relative = System.IO.Path.GetRelativePath(sessionPath, file).Replace('\\', '/');
            if (!listed.Contains(relative))
                throw new InvalidDataException($"Unlisted session file '{relative}' in '{sessionPath}'.");
        }
        return manifest;
    }

    public static string ResolvePath(string root, string relativePath)
    {
        ValidateRelativePath(relativePath);
        var fullRoot = System.IO.Path.GetFullPath(root);
        var fullPath = System.IO.Path.GetFullPath(System.IO.Path.Combine(fullRoot, relativePath));
        var parent = new DirectoryInfo(System.IO.Path.GetDirectoryName(fullPath)!);
        while (parent != null && parent.FullName != fullRoot)
        {
            if (parent.Exists)
                RejectLink(parent);
            parent = parent.Parent;
        }
        return fullPath;
    }

    public static void ValidateRelativePath(string path)
    {
        if (string.IsNullOrWhiteSpace(path) || path.Contains('\\') || path.Contains(':')
            || System.IO.Path.IsPathRooted(path)
            || path.Split('/').Any(part => part.Length == 0 || part == "." || part == ".."))
            throw new InvalidDataException($"Invalid relative session path '{path}'.");
    }

    public static string Digest(string path)
    {
        using var sha = SHA256.Create();
        using var stream = File.OpenRead(path);
        return Convert.ToHexString(sha.ComputeHash(stream)).ToLowerInvariant();
    }

    public static void ValidateSessionId(string id)
    {
        if (id == null || !Regex.IsMatch(id, @"\A\d{8}T\d{6}Z-[0-9a-f]{8}\z"))
            throw new InvalidDataException($"Invalid session_id '{id}'.");
    }

    internal static JToken ReadJson(string path)
    {
        try { return JToken.Parse(File.ReadAllText(path)); }
        catch (JsonException ex) { throw new InvalidDataException($"Cannot parse JSON output '{path}': {ex.Message}", ex); }
    }

    internal static long CountJson(JToken json, string path) => json switch
    {
        JArray rows => rows.Count,
        JObject => 1,
        _ => throw new InvalidDataException($"JSON output '{path}' must contain an array or object."),
    };

    private static void RejectLink(FileSystemInfo info)
    {
        if ((info.Attributes & FileAttributes.ReparsePoint) != 0)
            throw new InvalidDataException($"Session path '{info.FullName}' cannot be a symbolic link.");
    }
}
