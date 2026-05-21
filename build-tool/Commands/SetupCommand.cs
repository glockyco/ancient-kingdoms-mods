using System;
using System.ComponentModel;
using System.Threading.Tasks;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed class SetupCommand : AsyncCommand<SetupCommand.Settings>
{
    public sealed class Settings : BaseSettings
    {
        [CommandOption("--non-interactive")]
        [Description("Use defaults without prompting; suitable for CI.")]
        public bool NonInteractive { get; set; }
    }

    public override Task<int> ExecuteAsync(CommandContext context, Settings settings) =>
        throw new NotImplementedException("Filled in Task 11.");
}
