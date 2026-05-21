using System;
using System.IO;
using BuildTool.Abstractions;
using BuildTool.Commands;
using BuildTool.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Spectre.Console.Cli;

namespace BuildTool;

public static class Program
{
    public static int Main(string[] args)
    {
        var rootDir = FindRepoRoot();
        var propsPath = Path.Combine(rootDir, "Local.props");

        var services = new ServiceCollection();
        services.AddSingleton<IProcessRunner, CliWrapProcessRunner>();
        services.AddSingleton<string>(_ => rootDir);
        services.AddSingleton(_ => File.Exists(propsPath) ? LocalConfigLoader.Load(propsPath) : LocalConfig.Empty);
        services.AddSingleton(typeof(bool), OperatingSystem.IsMacOS());

        var registrar = new TypeRegistrar(services);
        var app = new CommandApp(registrar);
        app.Configure(config =>
        {
            config.SetApplicationName("build-tool");
            config.AddCommand<SetupCommand>("setup").WithDescription("Configure Local.props (interactive).");
            config.AddCommand<BuildCommand>("build").WithDescription("Build all mods.");
            config.AddCommand<DeployCommand>("deploy").WithDescription("Copy built mods to the game Mods directory.");
            config.AddCommand<DeployHostCommand>("deploy-host").WithDescription("Build and deploy HotRepl host.");
            config.AddCommand<LaunchCommand>("launch").WithDescription("Launch Ancient Kingdoms.");
            config.AddCommand<ExportCommand>("export").WithDescription("Launch with --export-data and capture results.");
            config.AddCommand<UpdateCommand>("update").WithDescription("Run steamcmd app_update.");
        });
        return app.Run(args);
    }

    private static string FindRepoRoot()
    {
        var dir = Path.GetDirectoryName(Path.GetDirectoryName(AppContext.BaseDirectory));
        while (dir != null && !File.Exists(Path.Combine(dir, "Local.props.example")))
            dir = Directory.GetParent(dir)?.FullName;
        if (dir is null)
            throw new InvalidOperationException("Could not find repository root (looking for Local.props.example).");
        return dir;
    }

    private sealed class TypeRegistrar : ITypeRegistrar
    {
        private readonly IServiceCollection _services;

        public TypeRegistrar(IServiceCollection services)
        {
            _services = services;
        }

        public ITypeResolver Build()
        {
            return new TypeResolver(_services.BuildServiceProvider());
        }

        public void Register(Type service, Type implementation)
        {
            _services.AddSingleton(service, implementation);
        }

        public void RegisterInstance(Type service, object implementation)
        {
            _services.AddSingleton(service, implementation);
        }

        public void RegisterLazy(Type service, Func<object> factory)
        {
            _services.AddSingleton(service, _ => factory());
        }
    }

    private sealed class TypeResolver : ITypeResolver, IDisposable
    {
        private readonly ServiceProvider _provider;

        public TypeResolver(ServiceProvider provider)
        {
            _provider = provider;
        }

        public object? Resolve(Type? type)
        {
            return type is null ? null : _provider.GetService(type);
        }

        public void Dispose()
        {
            _provider.Dispose();
        }
    }
}
