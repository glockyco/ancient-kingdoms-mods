using System;
using System.Threading.Tasks;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed class BuildCommand : AsyncCommand<BuildCommand.Settings>
{
    public sealed class Settings : BaseSettings { }

    public override Task<int> ExecuteAsync(CommandContext context, Settings settings) =>
        throw new NotImplementedException("Filled in Task 12.");
}
