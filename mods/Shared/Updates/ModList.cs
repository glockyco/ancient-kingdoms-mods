// Oblivious, because Pocket Compendium's game references hide the compiler's nullable attributes.
#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

namespace AncientKingdomsMods.Shared.Updates;

/// <summary>One release of a mod and the changes it brings, as the website's mod list names them.</summary>
internal sealed class Release
{
    public Release(ModVersion version, IReadOnlyList<string> changes)
    {
        Version = version;
        Changes = changes;
    }

    public ModVersion Version { get; }
    public IReadOnlyList<string> Changes { get; }
}

/// <summary>A mod the website publishes.</summary>
internal sealed class ListedMod
{
    public ListedMod(string id, ModVersion version, string downloadPath, long sizeBytes, string sha256, IReadOnlyList<Release> releases)
    {
        Id = id;
        Version = version;
        DownloadPath = downloadPath;
        SizeBytes = sizeBytes;
        Sha256 = sha256;
        Releases = releases;
    }

    public string Id { get; }
    public ModVersion Version { get; }
    public string DownloadPath { get; }
    public long SizeBytes { get; }
    public string Sha256 { get; }
    public IReadOnlyList<Release> Releases { get; }
}

/// <summary>
/// The website's <c>/mods/manifest.json</c>, which <c>build-tool publish-mods</c> writes. Parse it only after
/// <see cref="ListSignature"/> has verified the bytes.
/// </summary>
internal sealed class ModList
{
    public const string PocketCompendiumId = "pocket-compendium";

    private ModList(IReadOnlyList<ListedMod> mods) => Mods = mods;

    public IReadOnlyList<ListedMod> Mods { get; }

    public ListedMod Find(string id) => Mods.FirstOrDefault(mod => mod.Id == id);

    /// <exception cref="FormatException">The bytes are not a mod list.</exception>
    public static ModList Parse(byte[] json)
    {
        try
        {
            using var document = JsonDocument.Parse(json);
            var mods = new List<ListedMod>();
            foreach (var mod in document.RootElement.GetProperty("mods").EnumerateArray())
            {
                var releases = new List<Release>();
                if (mod.TryGetProperty("releases", out var listed))
                    foreach (var release in listed.EnumerateArray())
                        releases.Add(new Release(
                            ModVersion.Parse(release.GetProperty("version").GetString()),
                            release.GetProperty("changes").EnumerateArray().Select(change => change.GetString() ?? "").ToArray()));
                mods.Add(new ListedMod(
                    mod.GetProperty("id").GetString() ?? "",
                    ModVersion.Parse(mod.GetProperty("version").GetString()),
                    mod.GetProperty("downloadPath").GetString() ?? "",
                    mod.GetProperty("sizeBytes").GetInt64(),
                    mod.GetProperty("sha256").GetString() ?? "",
                    releases));
            }
            return new ModList(mods);
        }
        catch (Exception e) when (e is JsonException or KeyNotFoundException or InvalidOperationException)
        {
            throw new FormatException("The mod list has an unexpected shape: " + e.Message, e);
        }
    }
}
