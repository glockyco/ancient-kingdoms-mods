using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;

namespace BuildTool.Game;

internal static class GameProcesses
{
    private const string ExecutablePattern = @"(?:^|[ /\\])ancientkingdoms\.exe(?:\s|$)";

    internal static string SessionArgument(string token) =>
        "--ak-verification-session=" + Uri.EscapeDataString(token);

    internal static bool HasRelevantProcess(string gamePath) =>
        Regex.IsMatch(ReadSnapshot(), ExecutablePattern,
            RegexOptions.IgnoreCase | RegexOptions.Multiline);

    internal static IReadOnlyList<int> OwnedProcessIds(string snapshot, string token)
    {
        var marker = SessionArgument(token);
        var result = new List<int>();
        foreach (var line in snapshot.AsSpan().EnumerateLines())
        {
            var entry = line.Trim();
            var separator = entry.IndexOfAny(' ', '\t');
            if (separator < 1 || !int.TryParse(entry[..separator], out var pid) || pid <= 0) continue;
            var command = entry[(separator + 1)..].TrimStart();
            var index = command.IndexOf(marker, StringComparison.Ordinal);
            if (index < 1 || !char.IsWhiteSpace(command[index - 1])) continue;
            var end = index + marker.Length;
            if (end < command.Length && !char.IsWhiteSpace(command[end])) continue;
            if (!Regex.IsMatch(command, ExecutablePattern, RegexOptions.IgnoreCase)) continue;
            result.Add(pid);
        }
        return result;
    }

    internal static int StopOwnedProcesses(string token)
    {
        var stopped = 0;
        var elapsed = Stopwatch.StartNew();
        while (elapsed.Elapsed < TimeSpan.FromSeconds(5))
        {
            var owned = OwnedProcessIds(ReadSnapshot(), token);
            if (owned.Count == 0) return stopped;
            foreach (var pid in owned)
            {
                try
                {
                    using var process = Process.GetProcessById(pid);
                    // Recheck the native tag immediately before signalling. Wine's shared
                    // loader filename cannot establish process ownership.
                    if (!OwnedProcessIds(ReadSnapshot(), token).Contains(pid)) continue;
                    process.Kill(entireProcessTree: true);
                    if (!process.WaitForExit(1000))
                        throw new IOException($"Owned native game process {pid} did not stop.");
                    stopped++;
                    Console.WriteLine($"Stopped owned native game process {pid} after shutdown timeout.");
                }
                catch (ArgumentException)
                {
                    // The tagged process exited between the snapshot and handle lookup.
                }
            }
        }
        throw new IOException("Tagged native game processes remained after forced shutdown.");
    }

    private static string ReadSnapshot()
    {
        // Wine processes can share a loader image. Its filename does not identify the
        // Windows executable, but the native command line does.
        var start = new ProcessStartInfo("/bin/ps")
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };
        start.ArgumentList.Add("-axo");
        start.ArgumentList.Add("pid=,command=");
        using var process = Process.Start(start)
            ?? throw new IOException("Native game process inspection did not start.");
        var output = process.StandardOutput.ReadToEndAsync();
        var error = process.StandardError.ReadToEndAsync();
        if (!process.WaitForExit(2000))
        {
            process.Kill(entireProcessTree: true);
            throw new IOException("Native game process inspection timed out.");
        }
        if (process.ExitCode != 0)
            throw new IOException($"Native game process inspection failed: {error.GetAwaiter().GetResult()}");
        return output.GetAwaiter().GetResult();
    }
}
