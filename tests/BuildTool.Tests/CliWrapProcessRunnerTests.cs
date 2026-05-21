using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using Xunit;

namespace BuildTool.Tests;

public class CliWrapProcessRunnerTests
{
    [Fact]
    public async Task RunsDotnetVersionAndCapturesStdout()
    {
        var runner = new CliWrapProcessRunner();
        var request = new ProcessRequest(
            Program: "dotnet",
            Arguments: new[] { "--version" });

        var result = await runner.RunAsync(request, CancellationToken.None);

        Assert.Equal(0, result.ExitCode);
        Assert.False(string.IsNullOrWhiteSpace(result.StandardOutput));
    }

    [Fact]
    public async Task NonZeroExitDoesNotThrow_AndIsReportedInResult()
    {
        var runner = new CliWrapProcessRunner();
        var request = new ProcessRequest(
            Program: "dotnet",
            Arguments: new[] { "--invalid-flag-that-cannot-exist" });

        var result = await runner.RunAsync(request, CancellationToken.None);

        Assert.NotEqual(0, result.ExitCode);
    }
}
