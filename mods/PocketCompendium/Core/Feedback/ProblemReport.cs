#nullable disable
using System;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;

namespace PocketCompendium.Core.Feedback;

/// <summary>Where the player plays, as the details name it.</summary>
public enum PlaySetting
{
    Alone,
    Hosting,
    Joined,
}

/// <summary>The facts about a player's setup that a problem report carries.</summary>
public sealed class SetupFacts
{
    public string ModVersion;
    public string Build;
    public string GameVersion;
    public string MelonLoaderVersion;
    public string System;
    public string Language;
    public PlaySetting Setting;
    public List<(string Name, string Version)> OtherMods = new();
    public List<string> SwitchedOff = new();
    public List<(string Feature, string Error)> Stopped = new();
}

/// <summary>
/// The details a problem report carries and the link that opens the problem form with them. A
/// report is public, so error lines lose their directories, which can hold the Windows user name.
/// </summary>
public static class ProblemReport
{
    public const string FormUrl = "https://github.com/glockyco/ancient-kingdoms-mods/issues/new";
    public const string FormFile = "pocket-compendium-problem.yml";
    public const string DetailsField = "details";

    /// <summary>Below the length at which GitHub answers 414 URI Too Long, with room to spare.</summary>
    public const int MaxLinkLength = 8000;

    // The directories of Windows paths such as C:\Users\Jane Doe\..., Wine's Z:\..., and Unix paths.
    // They can contain spaces, so a directory runs to its next separator.
    private static readonly Regex Directories = new(@"[A-Za-z]:\\(?:[^\\\r\n:""'<>|]*\\)+|(?<![\w.])/(?:[^/\r\n:""'<>|]*/)+", RegexOptions.Compiled);

    public static string Details(SetupFacts facts) => Details(facts, int.MaxValue);

    /// <summary>The link to the problem form with its details field filled in, within <see cref="MaxLinkLength"/>.</summary>
    public static string Link(SetupFacts facts)
    {
        foreach (int limit in new[] { int.MaxValue, 120, 40, 0 })
        {
            string link = LinkFor(Details(facts, limit));
            if (link.Length <= MaxLinkLength) return link;
        }

        return LinkFor(string.Empty);
    }

    /// <summary>The error with every file path cut to its file name.</summary>
    public static string Impersonal(string error) => Directories.Replace(error ?? string.Empty, string.Empty);

    private static string LinkFor(string details) =>
        FormUrl + "?template=" + Uri.EscapeDataString(FormFile) + "&" + DetailsField + "=" + Uri.EscapeDataString(details);

    private static string Details(SetupFacts facts, int errorLimit)
    {
        var text = new StringBuilder();
        text.Append("Pocket Compendium: ").Append(facts.ModVersion).Append(" (build ").Append(facts.Build).Append(")\n");
        text.Append("Game: ").Append(facts.GameVersion).Append('\n');
        text.Append("MelonLoader: ").Append(facts.MelonLoaderVersion).Append('\n');
        text.Append("System: ").Append(facts.System).Append('\n');
        text.Append("Language: ").Append(facts.Language).Append('\n');
        text.Append("Playing: ").Append(facts.Setting switch
        {
            PlaySetting.Hosting => "hosting a world",
            PlaySetting.Joined => "in a world someone else hosts",
            _ => "alone",
        }).Append('\n');

        text.Append("Other mods: ");
        if (facts.OtherMods.Count == 0) text.Append("none");
        for (int index = 0; index < facts.OtherMods.Count; index++)
        {
            if (index > 0) text.Append(", ");
            text.Append(facts.OtherMods[index].Name).Append(' ').Append(facts.OtherMods[index].Version);
        }

        text.Append('\n');
        text.Append("Switched off: ").Append(facts.SwitchedOff.Count == 0 ? "none" : string.Join(", ", facts.SwitchedOff)).Append('\n');
        text.Append("Stopped after an error: ");
        if (facts.Stopped.Count == 0) text.Append("none");
        foreach (var (feature, error) in facts.Stopped)
            text.Append('\n').Append("- ").Append(feature).Append(": ").Append(Shorten(FirstLine(Impersonal(error)), errorLimit));
        return text.ToString();
    }

    private static string FirstLine(string text)
    {
        int end = text.IndexOfAny(new[] { '\r', '\n' });
        return (end < 0 ? text : text.Substring(0, end)).Trim();
    }

    private static string Shorten(string text, int limit)
    {
        if (text.Length <= limit) return text;
        return limit <= 0 ? "(shortened)" : text.Substring(0, limit).TrimEnd() + " (shortened)";
    }
}
