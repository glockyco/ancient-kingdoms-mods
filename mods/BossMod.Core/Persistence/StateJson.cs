using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using BossMod.Core.Catalog;

namespace BossMod.Core.Persistence;

public static class StateJson
{
    public const int CurrentSchemaVersion = 1;

    private static readonly JsonSerializerOptions Options = new()
    {
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter() },
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private sealed class FileShape
    {
        public int Version { get; set; } = CurrentSchemaVersion;
        public Globals Global { get; set; } = new();
        public System.Collections.Generic.Dictionary<string, SkillRecord> Skills { get; set; } = new();
        public System.Collections.Generic.Dictionary<string, BossRecord> Bosses { get; set; } = new();
    }

    public static void Write(string path, SkillCatalog catalog, Globals globals)
    {
        var dir = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

        var shape = new FileShape
        {
            Global = globals,
            Skills = catalog.Skills,
            Bosses = catalog.Bosses,
        };

        // Atomic write: serialize to .tmp, fsync via FileStream.Flush(true), rename.
        var tmp = path + ".tmp";
        using (var fs = new FileStream(tmp, FileMode.Create, FileAccess.Write, FileShare.None))
        {
            JsonSerializer.Serialize(fs, shape, Options);
            fs.Flush(true);
        }
        if (File.Exists(path)) File.Delete(path);
        File.Move(tmp, path);
    }

    public static (SkillCatalog Catalog, Globals Globals) Read(string path)
    {
        if (!File.Exists(path))
            return (new SkillCatalog(), new Globals());

        try
        {
            using var fs = File.OpenRead(path);
            var shape = JsonSerializer.Deserialize<FileShape>(fs, Options);
            if (shape == null) return (new SkillCatalog(), new Globals());

            // Schema version migration: v1 only for now; future migrations branch here.
            var cat = new SkillCatalog
            {
                Skills = shape.Skills ?? new(),
                Bosses = shape.Bosses ?? new(),
            };
            return (cat, shape.Global ?? new Globals());
        }
        catch (JsonException)
        {
            // Corrupt file — silently fall back to defaults. The user's tuning is lost
            // but the mod stays usable. Caller should log a warning.
            return (new SkillCatalog(), new Globals());
        }
    }
}
