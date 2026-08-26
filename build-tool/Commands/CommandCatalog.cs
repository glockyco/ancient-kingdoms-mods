using System;
using System.Collections.Generic;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

/// <summary>
/// The verbs this tool exposes, in the order they are presented.
/// </summary>
/// <remarks>
/// One list, used by the application and asserted by its tests. A test that rebuilt the list
/// for itself would pass while the application registered something else.
///
/// Each entry supplies its verb and description once. The registration receives them, so the
/// generic command type is the only thing the lambda contributes.
/// </remarks>
public static class CommandCatalog
{
    public sealed record Entry(
        string Verb,
        string Description,
        Action<IConfigurator, string, string> Register);

    private static Action<IConfigurator, string, string> Command<TCommand>()
        where TCommand : class, ICommand
        => (config, verb, description) =>
            config.AddCommand<TCommand>(verb).WithDescription(description);

    public static readonly IReadOnlyList<Entry> All = new Entry[]
    {
        new("setup", "Configure Local.props (interactive).", Command<SetupCommand>()),
        new("build", "Build all mods.", Command<BuildCommand>()),
        new("publish-mods", "Build and publish configured website mod downloads.",
            Command<PublishModsCommand>()),
        new("deploy", "Copy built mods to the game Mods directory.", Command<DeployCommand>()),
        new("deploy-host", "Build and deploy HotRepl host.", Command<DeployHostCommand>()),
        new("launch", "Launch Ancient Kingdoms.", Command<LaunchCommand>()),
        new("export", "Launch the game and drive compendium.export over HotRepl.",
            Command<ExportCommand>()),
        new("verify", "Launch the game against a scratch database for combat verification.",
            Command<VerifyCommand>()),
        new("update", "Ask the bottle's Steam client to bring the game current.",
            Command<UpdateCommand>()),
    };

    public static void RegisterAll(IConfigurator config)
    {
        foreach (var entry in All)
            entry.Register(config, entry.Verb, entry.Description);
    }
}
