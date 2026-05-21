using System.ComponentModel;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public class BaseSettings : CommandSettings
{
    [CommandOption("--json")]
    [Description("Emit machine-readable JSON envelope on stdout (stderr on failure).")]
    public bool Json { get; set; }

    [CommandOption("--quiet")]
    [Description("Suppress non-essential human output.")]
    public bool Quiet { get; set; }

    [CommandOption("--verbose")]
    [Description("Emit verbose human output.")]
    public bool Verbose { get; set; }

    [CommandOption("--no-color")]
    [Description("Disable ANSI colour in human output.")]
    public bool NoColor { get; set; }
}
