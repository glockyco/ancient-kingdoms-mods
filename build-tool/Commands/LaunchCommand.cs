using System;
using System.ComponentModel;
using System.Threading.Tasks;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed class LaunchCommand : AsyncCommand<LaunchCommand.Settings>
{
    public sealed class Settings : BaseSettings
    {
        [CommandOption("--wait")]
        [Description("Block until the MelonLoader bootstrap banner appears.")]
        public bool Wait { get; set; }

        [CommandOption("--export")]
        [Description("Pass --export-data to the game on launch.")]
        public bool Export { get; set; }
    }

    public override Task<int> ExecuteAsync(CommandContext context, Settings settings) =>
        throw new NotImplementedException("Filled in Task 15.");
}
