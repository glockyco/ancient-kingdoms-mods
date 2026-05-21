using System;
using System.Diagnostics;
using System.IO;
using BuildTool.Output;
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

        Assert.Equal(ExitCodes.InvalidUsage, result.ExitCode);
        Assert.Equal(string.Empty, result.StandardOutput);
        using var doc = JsonDocument.Parse(result.StandardError);
        var root = doc.RootElement;
        Assert.Equal(1, root.GetProperty("schemaVersion").GetInt32());
        Assert.False(root.GetProperty("ok").GetBoolean());
        Assert.Equal("missing-command", root.GetProperty("command").GetString());
        Assert.Equal("invalid_request", root.GetProperty("error").GetProperty("kind").GetString());
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

    [Fact]
    public void Run_WithJson_PreservesCommandSpecificSuccessData()
    {
        var store = new CommandResultStore();

        using var stdout = new StringWriter();
        using var stderr = new StringWriter();
        var exitCode = Program.RunJson(
            _ =>
            {
                store.SetData(new { value = 42 });
                return 0;
            },
            new[] { "stores-data", "--json" },
            store,
            stdout,
            stderr);

        Assert.Equal(0, exitCode);
        Assert.Equal(string.Empty, stderr.ToString());
        using var doc = JsonDocument.Parse(stdout.ToString());
        var root = doc.RootElement;
        Assert.True(root.GetProperty("ok").GetBoolean());
        Assert.Equal(42, root.GetProperty("data").GetProperty("value").GetInt32());
    }

    [Fact]
    public void Run_WithJson_MapsUnreachableExitCodeToStableFailureKind()
    {
        var store = new CommandResultStore();

        using var stdout = new StringWriter();
        using var stderr = new StringWriter();
        var exitCode = Program.RunJson(
            _ =>
            {
                Console.Error.WriteLine("missing tool");
                return ExitCodes.Unreachable;
            },
            new[] { "unreachable", "--json" },
            store,
            stdout,
            stderr);

        Assert.Equal(ExitCodes.Unreachable, exitCode);
        Assert.Equal(string.Empty, stdout.ToString());
        using var doc = JsonDocument.Parse(stderr.ToString());
        var error = doc.RootElement.GetProperty("error");
        Assert.Equal("tool_unreachable", error.GetProperty("kind").GetString());
        Assert.Equal("tool_unreachable", error.GetProperty("code").GetString());
    }

    [Fact]
    public void Run_WithJson_MapsExpectedExceptionsToInvalidRequest()
    {
        var store = new CommandResultStore();
        using var stdout = new StringWriter();
        using var stderr = new StringWriter();

        var exitCode = Program.RunJson(
            _ => throw new ArgumentException("bad config"),
            new[] { "launch", "--json" },
            store,
            stdout,
            stderr);

        Assert.Equal(ExitCodes.InvalidUsage, exitCode);
        Assert.Equal(string.Empty, stdout.ToString());
        using var doc = JsonDocument.Parse(stderr.ToString());
        var error = doc.RootElement.GetProperty("error");
        Assert.Equal("invalid_request", error.GetProperty("kind").GetString());
        Assert.Equal("bad config", error.GetProperty("message").GetString());
    }

    [Theory]
    [InlineData("deploy", true)]
    [InlineData("deploy-host", true)]
    [InlineData("launch", true)]
    [InlineData("export", true)]
    [InlineData("update", true)]
    [InlineData("build", false)]
    [InlineData("setup", false)]
    [InlineData("missing-command", false)]
    public void RequiresLocalProps_MatchesCommandsThatUseConfiguredGame(
        string command,
        bool expected)
    {
        Assert.Equal(expected, Program.RequiresLocalProps(new[] { command }));
    }

    [Fact]
    public void RequiresLocalProps_AllowsHelpWithoutConfig()
    {
        Assert.False(Program.RequiresLocalProps(new[] { "deploy", "--help" }));
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
