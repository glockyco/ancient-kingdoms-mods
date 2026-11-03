using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using BuildTool.Commands;
using Xunit;

namespace BuildTool.Tests;

public sealed class UpdateKeyCommandTests : IDisposable
{
    private readonly string _root = Directory.CreateTempSubdirectory().FullName;

    [Fact]
    public async Task WritesRsa3072KeyPairWithRestrictedPrivateFileThatSignsVerifiableData()
    {
        var privatePath = Path.Combine(_root, "private", "release.pem");
        var publicPath = Path.Combine(_root, "shared", "release-key.txt");
        var command = new UpdateKeyCommand(_root, publicPath);

        var result = await command.RunAsync(
            new UpdateKeyCommand.Settings { PrivatePath = privatePath },
            TestContext.Current.CancellationToken);

        Assert.Equal(0, result);
        var pem = File.ReadAllText(privatePath);
        Assert.StartsWith("-----BEGIN PRIVATE KEY-----", pem);
        using var privateKey = RSA.Create();
        privateKey.ImportFromPem(pem);
        Assert.Equal(3072, privateKey.KeySize);
        var publicText = File.ReadAllText(publicPath);
        var publicDer = Convert.FromBase64String(publicText);
        Assert.Equal(Convert.ToBase64String(publicDer), publicText);
        using var publicKey = RSA.Create();
        publicKey.ImportSubjectPublicKeyInfo(publicDer, out var consumed);
        Assert.Equal(publicDer.Length, consumed);
        var data = Encoding.UTF8.GetBytes("A signed mod list.");
        var signature = privateKey.SignData(data, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        Assert.True(publicKey.VerifyData(data, signature, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1));
        if (OperatingSystem.IsMacOS() || OperatingSystem.IsLinux())
            Assert.Equal(UnixFileMode.UserRead | UnixFileMode.UserWrite, File.GetUnixFileMode(privatePath));
    }

    [Fact]
    public async Task RefusesToOverwriteExistingPrivateFileAndLeavesPublicKeyAlone()
    {
        var privatePath = Path.Combine(_root, "release.pem");
        var publicPath = Path.Combine(_root, "release-key.txt");
        File.WriteAllText(privatePath, "existing private key");
        File.WriteAllText(publicPath, "existing public key");

        var result = await new UpdateKeyCommand(_root, publicPath).RunAsync(
            new UpdateKeyCommand.Settings { PrivatePath = privatePath },
            TestContext.Current.CancellationToken);

        Assert.NotEqual(0, result);
        Assert.Equal("existing private key", File.ReadAllText(privatePath));
        Assert.Equal("existing public key", File.ReadAllText(publicPath));
    }

    [Fact]
    public async Task RequiresPrivatePath()
    {
        var result = await new UpdateKeyCommand(_root, Path.Combine(_root, "public.txt"))
            .RunAsync(new UpdateKeyCommand.Settings(), TestContext.Current.CancellationToken);
        Assert.NotEqual(0, result);
        Assert.Empty(Directory.GetFileSystemEntries(_root));
    }

    [Fact]
    public async Task RefusesToUseTheSamePathForBothKeys()
    {
        var path = Path.Combine(_root, "key");
        var result = await new UpdateKeyCommand(_root, path).RunAsync(
            new UpdateKeyCommand.Settings { PrivatePath = path },
            TestContext.Current.CancellationToken);
        Assert.NotEqual(0, result);
        Assert.False(File.Exists(path));
    }

    public void Dispose() => Directory.Delete(_root, recursive: true);
}
