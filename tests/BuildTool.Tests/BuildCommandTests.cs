using System;
using System.IO;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Commands;
using Xunit;

namespace BuildTool.Tests;

public class BuildCommandTests
{
    [Fact]
    public async Task InvokesDotnetBuildForEachModProject()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var modsRoot = Path.Combine(tempRoot, "mods");
        Directory.CreateDirectory(Path.Combine(modsRoot, "ModA"));
        Directory.CreateDirectory(Path.Combine(modsRoot, "ModB"));
        File.WriteAllText(Path.Combine(modsRoot, "ModA", "ModA.csproj"), "<Project/>");
        File.WriteAllText(Path.Combine(modsRoot, "ModB", "ModB.csproj"), "<Project/>");

        var runner = new FakeProcessRunner();
        runner.Enqueue(new ProcessResult(0, "", "", default));
        runner.Enqueue(new ProcessResult(0, "", "", default));

        var command = new BuildCommand(tempRoot, runner);
        var result = await command.RunAsync(new BuildCommand.Settings(), TestContext.Current.CancellationToken);

        Assert.Equal(0, result);
        Assert.Equal(2, runner.Calls.Count);
        Assert.All(runner.Calls, call => Assert.Equal("dotnet", call.Program));
        Assert.All(runner.Calls, call => Assert.Contains("build", call.Arguments));
        Directory.Delete(tempRoot, recursive: true);
    }

    [Theory]
    [InlineData("<Project><PropertyGroup><ANCIENT_KINGDOMS_PATH>/configured/game</ANCIENT_KINGDOMS_PATH></PropertyGroup></Project>", "Game path: /configured/game")]
    [InlineData("<Project><PropertyGroup /></Project>", "Game path: ANCIENT_KINGDOMS_PATH is absent from Local.props")]
    [InlineData(null, "Game path: Local.props is absent")]
    public async Task ReportsTheGamePathUsedByTheBuild(string? propsXml, string expected)
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        Directory.CreateDirectory(Path.Combine(tempRoot, "mods"));
        if (propsXml is not null)
            File.WriteAllText(Path.Combine(tempRoot, "Local.props"), propsXml);

        using var output = new StringWriter();
        var originalOutput = Console.Out;
        try
        {
            Console.SetOut(output);
            var result = await new BuildCommand(tempRoot, new FakeProcessRunner())
                .RunAsync(new BuildCommand.Settings(), TestContext.Current.CancellationToken);
            Assert.Equal(0, result);
        }
        finally
        {
            Console.SetOut(originalOutput);
            Directory.Delete(tempRoot, recursive: true);
        }

        Assert.Contains(expected, output.ToString(), StringComparison.Ordinal);
    }
}
