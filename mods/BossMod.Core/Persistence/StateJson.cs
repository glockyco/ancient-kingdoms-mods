using System;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using BossMod.Core.Catalog;

namespace BossMod.Core.Persistence;

public enum StateReadStatus
{
    Loaded,
    MissingUsedDefaults,
    CorruptUsedDefaults,
    UnsupportedVersionUsedDefaults,
}

public sealed record StateReadResult(SkillCatalog Catalog, Globals Globals, StateReadStatus Status, string? ErrorMessage);

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

        var tmp = path + ".tmp";
        using (var fs = new FileStream(tmp, FileMode.Create, FileAccess.Write, FileShare.None))
        {
            JsonSerializer.Serialize(fs, shape, Options);
            fs.Flush(true);
        }

        if (File.Exists(path))
        {
            try
            {
                File.Replace(tmp, path, destinationBackupFileName: null);
            }
            catch (PlatformNotSupportedException)
            {
                // Fallback has a small no-destination window between delete and move on platforms without File.Replace.
                File.Delete(path);
                File.Move(tmp, path);
            }
        }
        else
        {
            File.Move(tmp, path);
        }
    }

    public static StateReadResult Read(string path)
    {
        if (!File.Exists(path))
            return Defaults(StateReadStatus.MissingUsedDefaults, errorMessage: null);

        try
        {
            using var fs = File.OpenRead(path);
            var shape = JsonSerializer.Deserialize<FileShape>(fs, Options);
            if (shape == null) return Defaults(StateReadStatus.CorruptUsedDefaults, "State file was empty.");

            if (shape.Version != CurrentSchemaVersion)
            {
                return Defaults(
                    StateReadStatus.UnsupportedVersionUsedDefaults,
                    $"Unsupported state schema version {shape.Version}.");
            }

            var globals = shape.Global ?? new Globals();
            string? validationError = Validate(globals);
            if (validationError != null) return Defaults(StateReadStatus.CorruptUsedDefaults, validationError);

            var catalog = new SkillCatalog
            {
                Skills = shape.Skills ?? new(),
                Bosses = shape.Bosses ?? new(),
            };
            return new StateReadResult(catalog, globals, StateReadStatus.Loaded, ErrorMessage: null);
        }
        catch (JsonException ex)
        {
            return Defaults(StateReadStatus.CorruptUsedDefaults, SafeError(ex.Message));
        }
        catch (NotSupportedException ex)
        {
            return Defaults(StateReadStatus.CorruptUsedDefaults, SafeError(ex.Message));
        }
    }

    private static string? Validate(Globals globals)
    {
        if (!float.IsFinite(globals.MasterVolume) || globals.MasterVolume < 0f || globals.MasterVolume > 1f)
            return "Global.MasterVolume must be finite and between 0 and 1.";
        if (!float.IsFinite(globals.UiScale) || globals.UiScale <= 0f)
            return "Global.UiScale must be finite and positive.";
        if (!float.IsFinite(globals.ProximityRadius) || globals.ProximityRadius <= 0f)
            return "Global.ProximityRadius must be finite and positive.";
        if (globals.MaxCastBars <= 0)
            return "Global.MaxCastBars must be positive.";
        return null;
    }

    private static StateReadResult Defaults(StateReadStatus status, string? errorMessage) =>
        new(new SkillCatalog(), new Globals(), status, errorMessage);

    private static string SafeError(string message)
    {
        message = message.Replace('\r', ' ').Replace('\n', ' ');
        return message.Length <= 240 ? message : message[..240];
    }
}
