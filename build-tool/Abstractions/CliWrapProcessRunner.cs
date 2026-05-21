using System.Threading;
using System.Threading.Tasks;
using CliWrap;
using CliWrap.Buffered;

namespace BuildTool.Abstractions;

public sealed class CliWrapProcessRunner : IProcessRunner
{
    public async Task<ProcessResult> RunAsync(ProcessRequest request, CancellationToken cancellationToken)
    {
        var command = Cli.Wrap(request.Program)
            .WithArguments(request.Arguments)
            .WithValidation(CommandResultValidation.None);

        if (request.WorkingDirectory is not null)
            command = command.WithWorkingDirectory(request.WorkingDirectory);

        if (request.Environment is not null)
            command = command.WithEnvironmentVariables(request.Environment);

        var result = await command.ExecuteBufferedAsync(cancellationToken);

        return new ProcessResult(
            ExitCode: result.ExitCode,
            StandardOutput: result.StandardOutput,
            StandardError: result.StandardError,
            Duration: result.RunTime);
    }
}
