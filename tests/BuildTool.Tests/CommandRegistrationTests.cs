using System.Linq;
using BuildTool.Commands;
using Spectre.Console.Cli;
using Xunit;

namespace BuildTool.Tests;

/// <summary>
/// Named rather than counted: adding a verb must state what it is, because the documented
/// workflow and the release gate both address these by name.
/// </summary>
public class CommandRegistrationTests
{
    [Fact]
    public void CatalogExposesExactlyTheDocumentedVerbs()
        => Assert.Equal(
            new[]
            {
                "build",
                "deploy",
                "deploy-host",
                "export",
                "launch",
                "publish-mods",
                "setup",
                "update",
                "verify",
            },
            CommandCatalog.All.Select(e => e.Verb).OrderBy(v => v).ToArray());

    [Fact]
    public void EveryVerbIsUnique()
    {
        var verbs = CommandCatalog.All.Select(e => e.Verb).ToList();

        Assert.Equal(verbs.Count, verbs.Distinct().Count());
    }

    [Fact]
    public void EveryVerbCarriesADescription()
    {
        foreach (var entry in CommandCatalog.All)
            Assert.False(string.IsNullOrWhiteSpace(entry.Description), entry.Verb);
    }

    [Fact]
    public void RegisteringTheCatalogConfiguresAnApplication()
    {
        // Exercises the same registration the application uses, so a verb that cannot be
        // registered fails here rather than at startup.
        var app = new CommandApp();

        app.Configure(config =>
        {
            config.SetApplicationName("build-tool");
            CommandCatalog.RegisterAll(config);
        });

        Assert.Equal(0, app.Run(new[] { "--help" }));
    }

    [Theory]
    [InlineData("verify")]
    [InlineData("export")]
    public void AKnownVerbIsAcceptedByTheConfiguredApplication(string verb)
    {
        var app = new CommandApp();
        app.Configure(CommandCatalog.RegisterAll);

        // A registered verb reaches its own help rather than failing to parse.
        Assert.Equal(0, app.Run(new[] { verb, "--help" }));
    }
}
