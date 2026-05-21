using System;
using System.ComponentModel;
using System.Threading.Tasks;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed class ExportCommand : AsyncCommand<ExportCommand.Settings>
{
    public sealed class Settings : BaseSettings
    {
        [CommandOption("--screenshots")]
        [Description("Also capture map screenshots.")]
        public bool Screenshots { get; set; }

        [CommandOption("--update")]
        [Description("Run steamcmd app_update before export.")]
        public bool Update { get; set; }
    }

    public override Task<int> ExecuteAsync(CommandContext context, Settings settings) =>
        throw new NotImplementedException("Filled in Task 16.");
}
