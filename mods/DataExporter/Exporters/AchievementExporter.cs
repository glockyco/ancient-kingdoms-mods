using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Runtime.InteropServices;
using DataExporter.Models;
using MelonLoader;

namespace DataExporter.Exporters;

public class AchievementExporter : BaseExporter
{
    private const int AppId = 2241380;
    private const int ExpectedAchievementCount = 38;
    private const string SteamLibrary = "steam_api64";
    private static readonly HttpClient HttpClient = new();

    public AchievementExporter(MelonLogger.Instance logger, string exportPath) : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting Steam achievements...");

        var schema = ReadAchievementSchema();
        if (schema.Count != ExpectedAchievementCount)
            throw new InvalidOperationException($"Steam returned {schema.Count} achievements for app {AppId}. Expected {ExpectedAchievementCount}.");

        var achievements = new List<AchievementData>(schema.Count);
        var ids = new HashSet<string>(StringComparer.Ordinal);

        for (var index = 0; index < schema.Count; index++)
        {
            var source = schema[index];
            var id = source.Id;
            if (string.IsNullOrWhiteSpace(id))
                throw new InvalidOperationException($"Steam returned an empty achievement ID at display position {index}.");
            if (!ids.Add(id))
                throw new InvalidOperationException($"Steam returned duplicate achievement ID '{id}'.");
            if (!source.Hidden && (string.IsNullOrWhiteSpace(source.Name) || string.IsNullOrWhiteSpace(source.Description)))
                throw new InvalidOperationException($"Visible achievement '{id}' has empty Steam metadata.");

            var imageDirectory = Path.Combine("images", "achievements", id.ToLowerInvariant());
            var unlockedPath = Path.Combine(imageDirectory, "unlocked.jpg").Replace('\\', '/');
            var lockedPath = Path.Combine(imageDirectory, "locked.jpg").Replace('\\', '/');
            DownloadIcon(source.Icons.Unlocked, unlockedPath);
            DownloadIcon(source.Icons.Locked, lockedPath);

            achievements.Add(new AchievementData
            {
                id = id,
                name = source.Name,
                description = source.Description,
                hidden = source.Hidden,
                display_order = index,
                unlocked_icon_path = unlockedPath,
                locked_icon_path = lockedPath,
            });
        }

        WriteJson(achievements, "achievements.json");
        Logger.Msg($"✓ Exported {achievements.Count} Steam achievements");
    }

    private List<SchemaAchievement> ReadAchievementSchema()
    {
        var steamPath = ReadUtf8(SteamAPI_GetSteamInstallPath());
        if (string.IsNullOrWhiteSpace(steamPath))
            throw new InvalidOperationException("Steam did not return its installation path.");

        var schemaPath = Path.Combine(steamPath, "appcache", "stats", $"UserGameStatsSchema_{AppId}.bin");
        if (!File.Exists(schemaPath))
            throw new FileNotFoundException("Steam's local achievement schema is unavailable.", schemaPath);

        using var stream = File.OpenRead(schemaPath);
        using var reader = new BinaryReader(stream);
        var root = ReadObject(reader);
        var achievements = new List<SchemaAchievement>();
        foreach (var node in Descendants(root))
        {
            if (!node.Children.Any(child => child.Key == "display") || !node.Children.Any(child => child.Key == "name"))
                continue;

            var id = node.String("name");
            var display = node.Object("display");
            if (string.IsNullOrWhiteSpace(id) || display == null)
                continue;

            var name = display.Object("name")?.String("english") ?? string.Empty;
            var description = display.Object("desc")?.String("english") ?? string.Empty;
            achievements.Add(new SchemaAchievement(
                id,
                name,
                description,
                display.Integer("hidden") == 1,
                new IconHashes(display.String("icon"), display.String("icon_gray"))));
        }

        foreach (var achievement in achievements)
        {
            if (string.IsNullOrWhiteSpace(achievement.Icons.Unlocked) || string.IsNullOrWhiteSpace(achievement.Icons.Locked))
                throw new InvalidOperationException($"Steam's local schema has incomplete icon metadata for achievement '{achievement.Id}'.");
        }

        return achievements;
    }

    private void DownloadIcon(string hash, string relativePath)
    {
        var outputPath = ToWritablePath(Path.Combine(ExportPath, relativePath));
        Directory.CreateDirectory(Path.GetDirectoryName(outputPath)!);
        var url = $"https://shared.fastly.steamstatic.com/community_assets/images/apps/{AppId}/{hash}";
        var bytes = HttpClient.GetByteArrayAsync(url).GetAwaiter().GetResult();
        if (bytes.Length == 0)
            throw new InvalidOperationException($"Steam returned an empty achievement icon from '{url}'.");
        File.WriteAllBytes(outputPath, bytes);
    }

    private static string ToWritablePath(string path)
    {
        var portable = path.Replace('\\', '/');
        return portable.StartsWith("/") ? "Z:" + portable : portable;
    }

    private static SchemaNode ReadObject(BinaryReader reader)
    {
        var root = new SchemaNode(string.Empty);
        while (true)
        {
            var type = reader.ReadByte();
            if (type == 8)
                return root;

            var key = ReadNullTerminatedUtf8(reader);
            switch (type)
            {
                case 0:
                    var child = ReadObject(reader);
                    child.Key = key;
                    root.Children.Add(child);
                    break;
                case 1:
                    root.Children.Add(new SchemaNode(key) { Text = ReadNullTerminatedUtf8(reader) });
                    break;
                case 2:
                    root.Children.Add(new SchemaNode(key) { Number = reader.ReadInt32() });
                    break;
                case 3:
                    reader.ReadSingle();
                    break;
                case 7:
                case 10:
                    reader.ReadInt64();
                    break;
                default:
                    throw new InvalidDataException($"Steam schema contains unsupported value type {type} at '{key}'.");
            }
        }
    }

    private static IEnumerable<SchemaNode> Descendants(SchemaNode root)
    {
        foreach (var child in root.Children)
        {
            yield return child;
            foreach (var descendant in Descendants(child))
                yield return descendant;
        }
    }

    private static string ReadNullTerminatedUtf8(BinaryReader reader)
    {
        var bytes = new List<byte>();
        byte value;
        while ((value = reader.ReadByte()) != 0)
            bytes.Add(value);
        return System.Text.Encoding.UTF8.GetString(bytes.ToArray());
    }

    private static string ReadUtf8(IntPtr pointer)
    {
        return pointer == IntPtr.Zero ? string.Empty : Marshal.PtrToStringUTF8(pointer) ?? string.Empty;
    }

    private sealed class SchemaNode
    {
        public SchemaNode(string key) => Key = key;
        public string Key { get; set; }
        public string Text { get; set; }
        public int? Number { get; set; }
        public List<SchemaNode> Children { get; } = new();
        public string String(string key) => Children.FirstOrDefault(child => child.Key == key)?.Text ?? string.Empty;
        public int Integer(string key) => Children.FirstOrDefault(child => child.Key == key)?.Number ?? 0;
        public SchemaNode Object(string key) => Children.FirstOrDefault(child => child.Key == key && child.Children.Count > 0);
    }

    private sealed class SchemaAchievement
    {
        public SchemaAchievement(string id, string name, string description, bool hidden, IconHashes icons)
        {
            Id = id;
            Name = name;
            Description = description;
            Hidden = hidden;
            Icons = icons;
        }

        public string Id { get; }
        public string Name { get; }
        public string Description { get; }
        public bool Hidden { get; }
        public IconHashes Icons { get; }
    }

    private sealed class IconHashes
    {
        public IconHashes(string unlocked, string locked)
        {
            Unlocked = unlocked;
            Locked = locked;
        }

        public string Unlocked { get; }
        public string Locked { get; }
    }

    [DllImport(SteamLibrary, CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr SteamAPI_GetSteamInstallPath();
}
