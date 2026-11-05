// Oblivious, because Pocket Compendium's game references hide the compiler's nullable attributes.
#nullable disable
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace AncientKingdomsMods.Shared.Updates;

/// <summary>Where Pocket Compendium, its updater and the files between them live in the game folder.</summary>
internal sealed class UpdateFiles
{
    public const string ModFile = "PocketCompendium.dll";
    public const string ModName = "Pocket Compendium";
    public const string PluginFile = "PocketCompendiumUpdater.dll";
    public const string UpdateCodeFile = "PocketCompendium.UpdateCore.dll";

    public UpdateFiles(string userDataDirectory, string modsDirectory, string pluginsDirectory)
    {
        Folder = Path.Combine(userDataDirectory, "PocketCompendium", "Updates");
        ModsFolder = modsDirectory;
        Installed = Path.Combine(modsDirectory, ModFile);
        Plugin = Path.Combine(pluginsDirectory, PluginFile);
    }

    public string ModsFolder { get; }

    /// <summary>
    /// Every copy of Pocket Compendium in the Mods folder: the usual file and any DLL that names
    /// itself Pocket Compendium. A browser saves a second download as "PocketCompendium (1).dll", and
    /// MelonLoader loads only one copy, the first by name, which can be the older one.
    /// </summary>
    public IReadOnlyList<string> Copies()
    {
        if (!Directory.Exists(ModsFolder)) return Array.Empty<string>();
        return Directory.EnumerateFiles(ModsFolder, "*.dll")
            .Where(path => string.Equals(path, Installed, StringComparison.OrdinalIgnoreCase) || MelonInfoReader.Name(path) == ModName)
            .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public string Folder { get; }
    public string Settings => Path.Combine(Folder, "settings.json");

    /// <summary>A verified download waiting for the next start.</summary>
    public string Staged => Path.Combine(Folder, ModFile);

    /// <summary>The SHA-256 the signed list named for <see cref="Staged"/>.</summary>
    public string StagedHash => Path.Combine(Folder, ModFile + ".sha256");

    /// <summary>The update code the plugin loads, which Pocket Compendium keeps current.</summary>
    public string UpdateCode => Path.Combine(Folder, UpdateCodeFile);

    /// <summary>Where an update puts Pocket Compendium, under its usual name.</summary>
    public string Installed { get; }
    public string Plugin { get; }

    /// <summary>Writes beside the target and then moves, so a reader never sees half a file.</summary>
    public static void WriteAtomically(string path, byte[] bytes)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path));
        string temporary = path + ".part";
        File.WriteAllBytes(temporary, bytes);
        File.Move(temporary, path, overwrite: true);
    }
}
