using System;
using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;
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
        Converters = { new JsonStringEnumConverter(namingPolicy: null, allowIntegerValues: false) },
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private static readonly JsonSerializerOptions PreserveNullOptions = new()
    {
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter(namingPolicy: null, allowIntegerValues: false) },
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
            var json = NormalizeLegacyJson(File.ReadAllText(path));
            string? shapeValidationError = ValidateJsonShape(json);
            if (shapeValidationError != null) return Defaults(StateReadStatus.CorruptUsedDefaults, shapeValidationError);
            var shape = JsonSerializer.Deserialize<FileShape>(json, Options);
            if (shape == null) return Defaults(StateReadStatus.CorruptUsedDefaults, "State file was empty.");

            if (shape.Version != CurrentSchemaVersion)
            {
                return Defaults(
                    StateReadStatus.UnsupportedVersionUsedDefaults,
                    $"Unsupported state schema version {shape.Version}.");
            }

            var globals = shape.Global;
            string? validationError = Validate(globals);
            if (validationError != null) return Defaults(StateReadStatus.CorruptUsedDefaults, validationError);

            var catalog = new SkillCatalog
            {
                Skills = shape.Skills,
                Bosses = shape.Bosses,
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

    private static string? ValidateJsonShape(string json)
    {
        var root = JsonNode.Parse(json) as JsonObject;
        if (root == null) return "State root object is required.";

        if (!root.TryGetPropertyValue("Global", out var globalNode) || globalNode is not JsonObject)
            return "Global object is required.";
        if (!root.TryGetPropertyValue("Skills", out var skillsNode) || skillsNode is not JsonObject skills)
            return "Skills object is required.";
        if (!root.TryGetPropertyValue("Bosses", out var bossesNode) || bossesNode is not JsonObject bosses)
            return "Bosses object is required.";

        foreach (var skill in skills)
        {
            if (skill.Value is not JsonObject skillObject) return $"Skill '{skill.Key}' must be an object.";
            if (skillObject.TryGetPropertyValue("RawSnapshot", out var rawSnapshot) && rawSnapshot is not JsonObject)
                return $"Skill '{skill.Key}' RawSnapshot object is required.";
        }

        foreach (var boss in bosses)
        {
            if (boss.Value is not JsonObject bossObject) return $"Boss '{boss.Key}' must be an object.";
            if (bossObject.TryGetPropertyValue("Skills", out var bossSkillsNode) && bossSkillsNode is not JsonObject)
                return $"Boss '{boss.Key}' Skills object is required.";
            if (bossObject.TryGetPropertyValue("Skills", out bossSkillsNode) && bossSkillsNode is JsonObject bossSkills)
            {
                foreach (var bossSkill in bossSkills)
                {
                    if (bossSkill.Value is not JsonObject bossSkillObject) return $"Boss skill '{boss.Key}/{bossSkill.Key}' must be an object.";
                    if (bossSkillObject.TryGetPropertyValue("EffectiveSnapshot", out var effectiveSnapshot) && effectiveSnapshot is not JsonObject)
                        return $"Boss skill '{boss.Key}/{bossSkill.Key}' EffectiveSnapshot object is required.";
                }
            }
        }

        return null;
    }

    private static string? Validate(Globals globals)
    {
        if (globals.Thresholds == null)
            return "Global.Thresholds is required.";
        if (globals.Hotkeys == null)
            return "Global.Hotkeys is required.";
        if (!float.IsFinite(globals.MasterVolume) || globals.MasterVolume < 0f || globals.MasterVolume > 1f)
            return "Global.MasterVolume must be finite and between 0 and 1.";
        if (!float.IsFinite(globals.UiScale) || globals.UiScale <= 0f)
            return "Global.UiScale must be finite and positive.";
        if (!float.IsFinite(globals.ProximityRadius) || globals.ProximityRadius <= 0f)
            return "Global.ProximityRadius must be finite and positive.";
        if (globals.MaxCastBars <= 0)
            return "Global.MaxCastBars must be positive.";
        if (!Enum.IsDefined(typeof(ExpansionDefault), globals.ExpansionDefault))
            return "Global.ExpansionDefault must be a defined value.";
        return null;
    }

    private static string NormalizeLegacyJson(string json)
    {
        var root = JsonNode.Parse(json) as JsonObject;
        if (root == null) return json;

        if (root["Global"] is JsonObject global &&
            global["ExpansionDefault"] is JsonValue expansionValue &&
            expansionValue.TryGetValue<string>(out var expansion))
        {
            string normalized = expansion switch
            {
                "expand_targeted_only" => nameof(ExpansionDefault.ExpandTargetedOnly),
                "expand_all" => nameof(ExpansionDefault.ExpandAll),
                "collapse_all" => nameof(ExpansionDefault.CollapseAll),
                _ => expansion,
            };
            global["ExpansionDefault"] = normalized;
        }

        if (root["Skills"] is JsonObject skills)
        {
            foreach (var skill in skills)
            {
                if (skill.Value is JsonObject skillObject) MigrateAudioMuted(skillObject);
            }
        }

        if (root["Bosses"] is JsonObject bosses)
        {
            foreach (var boss in bosses)
            {
                if (boss.Value?["Skills"] is not JsonObject bossSkills) continue;
                foreach (var bossSkill in bossSkills)
                {
                    if (bossSkill.Value is JsonObject bossSkillObject) MigrateAudioMuted(bossSkillObject);
                }
            }
        }

        return root.ToJsonString(PreserveNullOptions);
    }

    private static void MigrateAudioMuted(JsonObject obj)
    {
        if (obj.ContainsKey("AudioMuted") || !obj.TryGetPropertyValue("Muted", out var muted)) return;
        if (muted is JsonValue mutedValue && mutedValue.TryGetValue<bool>(out var audioMuted)) obj["AudioMuted"] = audioMuted;
        obj.Remove("Muted");
    }

    private static StateReadResult Defaults(StateReadStatus status, string? errorMessage) =>
        new(new SkillCatalog(), new Globals(), status, errorMessage);

    private static string SafeError(string message)
    {
        message = message.Replace('\r', ' ').Replace('\n', ' ');
        return message.Length <= 240 ? message : message[..240];
    }
}
