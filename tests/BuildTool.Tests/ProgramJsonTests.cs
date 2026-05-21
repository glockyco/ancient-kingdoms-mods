using System;
using System.Diagnostics;
using System.Text.Json;
using System.Threading.Tasks;
using Xunit;

namespace BuildTool.Tests;

public class ProgramJsonTests
{
    [Fact]
    public async Task Main_WithJsonOnInvalidCommand_EmitsFailureEnvelope()
    {
        var result = await RunBuildToolAsync("missing-command", "--json");

        Assert.NotEqual(0, result.ExitCode);
        Assert.Equal(string.Empty, result.StandardOutput);
        using var doc = JsonDocument.Parse(result.StandardError);
        var root = doc.RootElement;
        Assert.Equal(1, root.GetProperty("schemaVersion").GetInt32());
        Assert.False(root.GetProperty("ok").GetBoolean());
        Assert.Equal("missing-command", root.GetProperty("command").GetString());
    }

    [Fact]
    public async Task Main_WithJsonOnHelp_EmitsSuccessEnvelope()
    {
        var result = await RunBuildToolAsync("--help", "--json");

        Assert.Equal(0, result.ExitCode);
        Assert.Equal(string.Empty, result.StandardError);
        using var doc = JsonDocument.Parse(result.StandardOutput);
        var root = doc.RootElement;
        Assert.Equal(1, root.GetProperty("schemaVersion").GetInt32());
        Assert.True(root.GetProperty("ok").GetBoolean());
        Assert.Equal("build-tool", root.GetProperty("command").GetString());
    }

    [Fact]
    public void ArgumentsForSpectre_RemovesJsonFlagWithoutReorderingOtherArgs()
    {
        var args = Program.ArgumentsForSpectre(new[] { "launch", "--wait", "--json", "--export" });

        Assert.Equal(new[] { "launch", "--wait", "--export" }, args);
    }

    private static async Task<ProcessRun> RunBuildToolAsync(params string[] args)
    {
        var dotnet = Environment.GetEnvironmentVariable("DOTNET_HOST_PATH");
        if (string.IsNullOrWhiteSpace(dotnet))
            dotnet = "dotnet";

        var startInfo = new ProcessStartInfo(dotnet)
        {
            RedirectStandardError = true,
            RedirectStandardOutput = true,
            UseShellExecute = false,
        };
        startInfo.ArgumentList.Add(typeof(Program).Assembly.Location);
        foreach (var arg in args)
            startInfo.ArgumentList.Add(arg);

        using var process = Process.Start(startInfo)
            ?? throw new InvalidOperationException("Could not start build-tool process.");
        var stdoutTask = process.StandardOutput.ReadToEndAsync();
        var stderrTask = process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        return new ProcessRun(
            process.ExitCode,
            await stdoutTask,
            await stderrTask);
    }

    private sealed record ProcessRun(
        int ExitCode,
        string StandardOutput,
        string StandardError);
}
