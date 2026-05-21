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
        var result = await command.ExecuteAsync(null!, new BuildCommand.Settings());

        Assert.Equal(0, result);
        Assert.Equal(2, runner.Calls.Count);
        Assert.All(runner.Calls, call => Assert.Equal("dotnet", call.Program));
        Assert.All(runner.Calls, call => Assert.Contains("build", call.Arguments));
        Directory.Delete(tempRoot, recursive: true);
    }
}
