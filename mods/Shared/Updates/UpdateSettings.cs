// Oblivious, because Pocket Compendium's game references hide the compiler's nullable attributes.
#nullable disable
using System;
using System.IO;
using System.Text.Json;

namespace AncientKingdomsMods.Shared.Updates;

/// <summary>The player's answer to the first-start question.</summary>
internal enum UpdateAnswer
{
    Install,
    Tell,
    Off,
}

/// <summary>
/// The player's answer and the version that ran last, in <c>UserData/PocketCompendium/Updates/settings.json</c>.
/// A file rather than MelonPreferences, because the updater reads it before MelonLoader loads the mod.
/// </summary>
internal sealed class UpdateSettings
{
    /// <summary>Null until the player has answered.</summary>
    public UpdateAnswer? Answer { get; set; }

    /// <summary>The Pocket Compendium version that ran before this start, null before the first.</summary>
    public ModVersion? LastVersion { get; set; }

    /// <summary>The stored settings, or none answered when the file is missing or unreadable.</summary>
    public static UpdateSettings Load(string path)
    {
        var settings = new UpdateSettings();
        try
        {
            if (!File.Exists(path)) return settings;
            using var document = JsonDocument.Parse(File.ReadAllBytes(path));
            var root = document.RootElement;
            if (root.TryGetProperty("answer", out var answer) && Enum.TryParse(answer.GetString(), ignoreCase: true, out UpdateAnswer parsed))
                settings.Answer = parsed;
            if (root.TryGetProperty("lastVersion", out var last) && ModVersion.TryParse(last.GetString(), out var version))
                settings.LastVersion = version;
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException or JsonException or InvalidOperationException)
        {
            // An unreadable file counts as no answer, so the question comes back instead of a guess.
        }
        return settings;
    }

    public void Save(string path)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path));
        using var stream = new MemoryStream();
        using (var writer = new Utf8JsonWriter(stream, new JsonWriterOptions { Indented = true }))
        {
            writer.WriteStartObject();
            if (Answer != null) writer.WriteString("answer", Answer.Value.ToString().ToLowerInvariant());
            if (LastVersion != null) writer.WriteString("lastVersion", LastVersion.Value.ToString());
            writer.WriteEndObject();
        }
        UpdateFiles.WriteAtomically(path, stream.ToArray());
    }
}
