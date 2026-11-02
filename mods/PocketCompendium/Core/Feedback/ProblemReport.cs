#nullable disable
using System;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;

namespace PocketCompendium.Core.Feedback;

/// <summary>Where the player plays, as the details and the log name it.</summary>
public enum PlaySetting
{
    NotInWorld,
    Alone,
    Hosting,
    Joined,
}

/// <summary>An error Pocket Compendium logged, and where the player was when it happened.</summary>
public sealed class LoggedError
{
    /// <summary>What failed, as the log line says it.</summary>
    public string Message;

    /// <summary>The exception's text, or null for an error without one.</summary>
    public string Exception;

    public PlaySetting Setting;

    /// <summary>The worlds entered by then, counting the one the player was in.</summary>
    public int Worlds;
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
    public int WorldsEntered;
    public List<(string Name, string Version)> OtherMods = new();
    public List<string> SwitchedOff = new();

    /// <summary>The first errors logged since the game started.</summary>
    public List<LoggedError> Errors = new();

    /// <summary>Every error logged since the game started, which can be more than <see cref="Errors"/> holds.</summary>
    public int ErrorCount;
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

    private const int OwnFrames = 3;

    // The directories of Windows paths such as C:\Users\Jane Doe\..., Wine's Z:\..., and Unix paths.
    // They can contain spaces, so a directory runs to its next separator.
    private static readonly Regex Directories = new(@"[A-Za-z]:\\(?:[^\\\r\n:""'<>|]*\\)+|(?<![\w.])/(?:[^/\r\n:""'<>|]*/)+", RegexOptions.Compiled);

    public static string Details(SetupFacts facts) => Details(facts, int.MaxValue, frames: true);

    /// <summary>
    /// The link to the problem form with its details field filled in, within <see cref="MaxLinkLength"/>.
    /// It shortens error lines and then leaves out frames before it gives up the details.
    /// </summary>
    public static string Link(SetupFacts facts)
    {
        foreach (var (limit, frames) in new[] { (int.MaxValue, true), (120, true), (120, false), (40, false), (0, false) })
        {
            string link = LinkFor(Details(facts, limit, frames));
            if (link.Length <= MaxLinkLength) return link;
        }

        return LinkFor(string.Empty);
    }

    /// <summary>The error with every file path cut to its file name.</summary>
    public static string Impersonal(string error) => Directories.Replace(error ?? string.Empty, string.Empty);

    public static string SettingText(PlaySetting setting) => setting switch
    {
        PlaySetting.Alone => "alone",
        PlaySetting.Hosting => "hosting a world",
        PlaySetting.Joined => "in a world someone else hosts",
        _ => "not in a world",
    };

    /// <summary>Where the player was when an error happened: in which world and how, or between worlds.</summary>
    public static string When(PlaySetting setting, int worlds) => setting switch
    {
        PlaySetting.Alone => "world " + worlds + ", alone",
        PlaySetting.Hosting => "world " + worlds + ", hosting",
        PlaySetting.Joined => "world " + worlds + ", joined",
        _ => worlds == 0 ? "before any world" : "after world " + worlds,
    };

    /// <summary>
    /// The frame that threw the exception, then up to three Pocket Compendium frames that led
    /// there, innermost first, without directories. An Il2CppException names the throwing frame
    /// in its IL2CPP stack, after Unity's throw helper.
    /// </summary>
    public static List<string> Frames(string exception)
    {
        var frames = new List<string>();
        bool il2Cpp = false;
        int own = 0;
        foreach (string raw in Impersonal(exception).Split('\n'))
        {
            string line = raw.Trim();
            if (line.StartsWith("--- BEGIN IL2CPP STACK TRACE ---", StringComparison.Ordinal)) il2Cpp = true;
            else if (line.StartsWith("--- END IL2CPP STACK TRACE ---", StringComparison.Ordinal)) il2Cpp = false;
            if (!line.StartsWith("at ", StringComparison.Ordinal)) continue;

            string frame = Frame(line);
            if (frames.Count == 0)
            {
                // The throw helper and Il2CppInterop's rethrow only pass the exception on.
                if (frame.StartsWith("at UnityEngine.Bindings.ThrowHelper.", StringComparison.Ordinal) ||
                    frame.StartsWith("at Il2CppInterop.Runtime.Il2CppException.", StringComparison.Ordinal))
                    continue;
                frames.Add(frame);
                if (IsOwn(frame)) own++;
                continue;
            }

            if (il2Cpp || own >= OwnFrames || !IsOwn(frame) || frame == frames[0]) continue;
            frames.Add(frame);
            own++;
        }

        return frames;
    }

    private static string LinkFor(string details) =>
        FormUrl + "?template=" + Uri.EscapeDataString(FormFile) + "&" + DetailsField + "=" + Uri.EscapeDataString(details);

    private static string Details(SetupFacts facts, int errorLimit, bool frames)
    {
        var text = new StringBuilder();
        text.Append("Pocket Compendium: ").Append(facts.ModVersion).Append(" (build ").Append(facts.Build).Append(")\n");
        text.Append("Game: ").Append(facts.GameVersion).Append('\n');
        text.Append("MelonLoader: ").Append(facts.MelonLoaderVersion).Append('\n');
        text.Append("System: ").Append(facts.System).Append('\n');
        text.Append("Language: ").Append(facts.Language).Append('\n');
        text.Append("Playing: ").Append(SettingText(facts.Setting)).Append('\n');
        text.Append("Worlds entered: ").Append(facts.WorldsEntered).Append('\n');

        text.Append("Other mods: ");
        if (facts.OtherMods.Count == 0) text.Append("none");
        for (int index = 0; index < facts.OtherMods.Count; index++)
        {
            if (index > 0) text.Append(", ");
            text.Append(facts.OtherMods[index].Name).Append(' ').Append(facts.OtherMods[index].Version);
        }

        text.Append('\n');
        text.Append("Switched off: ").Append(facts.SwitchedOff.Count == 0 ? "none" : string.Join(", ", facts.SwitchedOff)).Append('\n');
        text.Append("Errors:");
        if (facts.Errors.Count == 0) text.Append(" none");
        foreach (var error in facts.Errors)
        {
            text.Append("\n- ").Append(Impersonal(error.Message).TrimEnd('.')).Append(" (").Append(When(error.Setting, error.Worlds)).Append(')');
            if (error.Exception == null) continue;

            text.Append("\n  ").Append(Shorten(FirstLine(Impersonal(error.Exception)), errorLimit));
            if (!frames) continue;
            foreach (string frame in Frames(error.Exception)) text.Append("\n  ").Append(frame);
        }

        int more = facts.ErrorCount - facts.Errors.Count;
        if (more > 0) text.Append("\n- ").Append(more).Append(more == 1 ? " more error in the log" : " more errors in the log");
        return text.ToString();
    }

    // An IL2CPP frame reads "at Type.Method (Args) [0x00000] in <...>:0", a managed one
    // "at Type.Method(Args) in File.cs:line 12". Both come out in the managed form.
    private static string Frame(string line)
    {
        int offset = line.IndexOf(" [0x", StringComparison.Ordinal);
        if (offset >= 0) line = line.Substring(0, offset);
        int arguments = line.IndexOf(" (", StringComparison.Ordinal);
        if (arguments > 0) line = line.Remove(arguments, 1);
        return line.TrimEnd();
    }

    // The registry calls every feature, so its frame says nothing about a failure.
    private static bool IsOwn(string frame) =>
        frame.StartsWith("at PocketCompendium.", StringComparison.Ordinal) &&
        !frame.StartsWith("at PocketCompendium.Core.Features.FeatureRegistry.", StringComparison.Ordinal);

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
