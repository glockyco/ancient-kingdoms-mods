using System;
using System.Diagnostics;
using System.IO;
using BuildTool.Abstractions;
using BuildTool.Commands;
using BuildTool.Configuration;
using BuildTool.Output;
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
        return Run(app, args);
    }

    private static int Run(CommandApp app, string[] args)
    {
        if (!HasFlag(args, "--json"))
            return app.Run(args);

        var command = CommandName(args);
        var originalOut = Console.Out;
        var originalError = Console.Error;
        using var capturedOut = new StringWriter();
        using var capturedError = new StringWriter();
        var stopwatch = Stopwatch.StartNew();

        Console.SetOut(capturedOut);
        Console.SetError(capturedError);
        try
        {
            var exitCode = app.Run(ArgumentsForSpectre(args));
            stopwatch.Stop();
            Console.SetOut(originalOut);
            Console.SetError(originalError);

            if (exitCode == ExitCodes.Success)
            {
                Console.Out.WriteLine(OutputEnvelope.Success(
                    command,
                    new { exitCode },
                    DurationMs(stopwatch)));
            }
            else
            {
                var kind = FailureKind(exitCode);
                Console.Error.WriteLine(OutputEnvelope.Failure(
                    command,
                    kind,
                    code: kind,
                    message: FailureMessage(capturedError, capturedOut),
                    retryable: false,
                    details: new { exitCode }));
            }

            return exitCode;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            Console.SetOut(originalOut);
            Console.SetError(originalError);
            Console.Error.WriteLine(OutputEnvelope.Failure(
                command,
                kind: "internal",
                code: "internal",
                message: ex.Message,
                retryable: false,
                details: new { exceptionType = ex.GetType().FullName }));
            return ExitCodes.Internal;
        }
        finally
        {
            Console.SetOut(originalOut);
            Console.SetError(originalError);
        }
    }

    private static bool HasFlag(string[] args, string name) =>
        Array.Exists(args, arg => string.Equals(arg, name, StringComparison.OrdinalIgnoreCase));

    internal static string[] ArgumentsForSpectre(string[] args)
    {
        var jsonCount = 0;
        foreach (var arg in args)
        {
            if (string.Equals(arg, "--json", StringComparison.OrdinalIgnoreCase))
                jsonCount++;
        }

        if (jsonCount == 0)
            return args;

        var filtered = new string[args.Length - jsonCount];
        var index = 0;
        foreach (var arg in args)
        {
            if (string.Equals(arg, "--json", StringComparison.OrdinalIgnoreCase))
                continue;
            filtered[index++] = arg;
        }

        return filtered;
    }

    private static string CommandName(string[] args)
    {
        foreach (var arg in args)
        {
            if (!arg.StartsWith("-", StringComparison.Ordinal))
                return arg;
        }

        return "build-tool";
    }

    private static int DurationMs(Stopwatch stopwatch) =>
        stopwatch.ElapsedMilliseconds > int.MaxValue ? int.MaxValue : (int)stopwatch.ElapsedMilliseconds;

    private static string FailureKind(int exitCode) => exitCode switch
    {
        ExitCodes.InvalidUsage => "invalid_request",
        ExitCodes.Timeout => "timeout",
        ExitCodes.CommandFailed => "command_failed",
        ExitCodes.Cancelled => "cancelled",
        _ => "internal",
    };

    private static string FailureMessage(StringWriter capturedError, StringWriter capturedOut)
    {
        var error = capturedError.ToString().Trim();
        if (!string.IsNullOrEmpty(error))
            return error;

        var output = capturedOut.ToString().Trim();
        return string.IsNullOrEmpty(output) ? "Command failed." : output;
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
