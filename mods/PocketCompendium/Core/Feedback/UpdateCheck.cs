using System;
using System.IO;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading.Tasks;
using MelonLoader;

namespace PocketCompendium.Core.Feedback;

/// <summary>
/// Compares this file with the Pocket Compendium the website publishes, once per game start. The
/// website's mod list holds each download's SHA-256, so a different checksum means a newer build
/// is out. Nothing about the player is sent.
/// </summary>
internal static class UpdateCheck
{
    public const string ManifestUrl = ModLinks.Site + "/mods/manifest.json";
    public const string DownloadUrl = ModLinks.Site + "/mods";
    private const string ModId = "pocket-compendium";

    private static MelonPreferences_Entry<string> _announced;
    private static volatile string _published;
    private static bool _chatShown;

    /// <summary>Whether the website publishes a different Pocket Compendium than this one.</summary>
    public static bool NewerVersionOut => _published != null;

    public static void Start()
    {
        var category = MelonPreferences.CreateCategory("PocketCompendium_Updates", "Pocket Compendium updates");
        _announced = category.CreateEntry("AnnouncedChecksum", string.Empty, is_hidden: true);
        Task.Run(Check);
    }

    private static async Task Check()
    {
        try
        {
            string own = Checksum(typeof(UpdateCheck).Assembly.Location);
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
            using var manifest = JsonDocument.Parse(await client.GetStringAsync(ManifestUrl).ConfigureAwait(false));
            foreach (var mod in manifest.RootElement.GetProperty("mods").EnumerateArray())
            {
                if (mod.GetProperty("id").GetString() != ModId) continue;
                string published = mod.GetProperty("sha256").GetString();
                if (!string.IsNullOrEmpty(published) && !string.Equals(published, own, StringComparison.OrdinalIgnoreCase))
                    _published = published;
                return;
            }
        }
        catch (Exception exception)
        {
            Log.Msg($"Could not check for a newer Pocket Compendium: {exception.Message}");
        }
    }

    private static string Checksum(string path) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path)));

    /// <summary>Shows the chat line once per published build, once the player is in a world.</summary>
    public static void Update(Il2Cpp.Player player)
    {
        string published = _published;
        if (_chatShown || published == null || player == null || player.chat == null) return;
        _chatShown = true;
        if (_announced.Value == published) return;

        player.chat.AddMsgInfo("A new Pocket Compendium is out. Press F8 and open About to download it.");
        _announced.Value = published;
        MelonPreferences.Save();
    }
}
