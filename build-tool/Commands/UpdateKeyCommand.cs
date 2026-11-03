using System;
using System.ComponentModel;
using System.IO;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Output;
using Spectre.Console;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed class UpdateKeyCommand : AsyncCommand<UpdateKeyCommand.Settings>
{
    private readonly string _publicKeyPath;
    private readonly CommandResultStore _resultStore;

    public UpdateKeyCommand()
        : this(Directory.GetCurrentDirectory(), new CommandResultStore())
    {
    }

    public UpdateKeyCommand(string repoRoot, CommandResultStore? resultStore = null)
        : this(repoRoot, Path.Combine(repoRoot, "mods", "Shared", "Updates", "release-key.txt"), resultStore)
    {
    }

    internal UpdateKeyCommand(string repoRoot, string publicKeyPath, CommandResultStore? resultStore = null)
    {
        _publicKeyPath = Path.GetFullPath(publicKeyPath, repoRoot);
        _resultStore = resultStore ?? new CommandResultStore();
    }

    public sealed class Settings : BaseSettings
    {
        [CommandOption("--private <PATH>")]
        [Description("Write the RSA private key as PKCS#8 PEM to a new file.")]
        public string? PrivatePath { get; set; }

        public override ValidationResult Validate() =>
            string.IsNullOrWhiteSpace(PrivatePath)
                ? ValidationResult.Error("Provide --private <path> for the new private key.")
                : ValidationResult.Success();
    }

    internal Task<int> RunAsync(Settings settings, CancellationToken cancellationToken = default) =>
        ExecuteAsync(null!, settings, cancellationToken);

    public override Task<int> ExecuteAsync(CommandContext context, Settings settings, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(settings.PrivatePath))
        {
            Console.Error.WriteLine("Provide --private <path> for the new private key.");
            return Task.FromResult(ExitCodes.InvalidUsage);
        }

        var privatePath = Path.GetFullPath(settings.PrivatePath);
        try
        {
            if (File.Exists(privatePath))
                throw new IOException($"Refusing to overwrite existing private key file {privatePath}.");
            if (string.Equals(privatePath, _publicKeyPath, StringComparison.Ordinal))
                throw new IOException("The private and public key paths must differ.");

            Directory.CreateDirectory(Path.GetDirectoryName(privatePath)!);
            using var key = RSA.Create(3072);
            var options = new FileStreamOptions { Mode = FileMode.CreateNew, Access = FileAccess.Write };
            if (OperatingSystem.IsMacOS() || OperatingSystem.IsLinux())
                options.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
            using (var stream = new FileStream(privatePath, options))
            using (var writer = new StreamWriter(stream))
                writer.Write(key.ExportPkcs8PrivateKeyPem());

            Directory.CreateDirectory(Path.GetDirectoryName(_publicKeyPath)!);
            File.WriteAllText(_publicKeyPath, Convert.ToBase64String(key.ExportSubjectPublicKeyInfo()));
            _resultStore.SetData(new { privatePath, publicKeyPath = _publicKeyPath });
            Console.WriteLine(privatePath);
            Console.WriteLine(_publicKeyPath);
            return Task.FromResult(ExitCodes.Success);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or CryptographicException)
        {
            Console.Error.WriteLine($"Could not create update key: {ex.Message}");
            _resultStore.SetErrorDetails(new { privatePath, publicKeyPath = _publicKeyPath, message = ex.Message });
            return Task.FromResult(ExitCodes.CommandFailed);
        }
    }
}
