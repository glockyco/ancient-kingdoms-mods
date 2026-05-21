using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace BuildTool.HotRepl;

public static class ProfileWriter
{
    public static void Upsert(
        string profileFilePath,
        string profileName,
        string url,
        string authSource,
        string authName)
    {
        JsonObject root;
        if (File.Exists(profileFilePath))
        {
            var existing = JsonNode.Parse(File.ReadAllText(profileFilePath));
            root = existing as JsonObject ?? new JsonObject();
        }
        else
        {
            root = new JsonObject { ["schemaVersion"] = 1 };
        }

        if (root["profiles"] is not JsonObject profiles)
        {
            profiles = new JsonObject();
            root["profiles"] = profiles;
        }

        profiles[profileName] = new JsonObject
        {
            ["url"] = url,
            ["auth"] = new JsonObject
            {
                ["source"] = authSource,
                ["name"] = authName,
            },
        };

        var directory = Path.GetDirectoryName(profileFilePath);
        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
            Directory.CreateDirectory(directory);

        var tempPath = profileFilePath + ".tmp";
        var json = root.ToJsonString(new JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(tempPath, json);
        File.Move(tempPath, profileFilePath, overwrite: true);
    }
}
