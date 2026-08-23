using System.Collections.Generic;
using System.IO;
using System.Security;
using System.Text;

namespace BuildTool.Configuration;

public static class LocalConfigWriter
{
    public static void Write(
        string path,
        string gamePath,
        string exportPath,
        string winePath,
        string winePrefix)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<Project>");
        sb.AppendLine("  <PropertyGroup>");
        AppendProperty(sb, "ANCIENT_KINGDOMS_PATH", gamePath);
        AppendProperty(sb, "DATA_EXPORT_PATH", exportPath);
        AppendProperty(sb, "WINE_PATH", winePath);
        AppendProperty(sb, "WINE_PREFIX", winePrefix);
        sb.AppendLine("  </PropertyGroup>");
        sb.AppendLine("</Project>");

        var tempPath = path + ".tmp";
        File.WriteAllText(tempPath, sb.ToString());
        File.Move(tempPath, path, overwrite: true);
    }

    public static void NoteChanges(
        IReadOnlyDictionary<string, string> existing,
        string gamePath,
        string exportPath,
        string winePath,
        string winePrefix,
        TextWriter output)
    {
        NoteChange(existing, "ANCIENT_KINGDOMS_PATH", gamePath, output);
        NoteChange(existing, "DATA_EXPORT_PATH", exportPath, output);
        NoteChange(existing, "WINE_PATH", winePath, output);
        NoteChange(existing, "WINE_PREFIX", winePrefix, output);
    }

    private static void NoteChange(
        IReadOnlyDictionary<string, string> existing,
        string key,
        string newValue,
        TextWriter output)
    {
        if (existing.TryGetValue(key, out var old) && old != newValue)
            output.WriteLine($"  Updated {key} (was: {old})");
    }

    private static void AppendProperty(StringBuilder sb, string name, string value)
    {
        sb.Append("    <").Append(name).Append('>')
            .Append(SecurityElement.Escape(value))
            .Append("</").Append(name).AppendLine(">");
    }
}
