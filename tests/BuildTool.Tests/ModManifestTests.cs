using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text.Json;
using BuildTool.Commands;
using Xunit;
using static BuildTool.Commands.PublishModsCommand;

namespace BuildTool.Tests;

public sealed class ModManifestTests : IDisposable
{
    private readonly string _root = Directory.CreateTempSubdirectory().FullName;

    [Theory]
    [InlineData("""[{"version":"1.2","changes":["Fix."]}]""")]
    [InlineData("""[{"version":"1.2.3-rc","changes":["Fix."]}]""")]
    [InlineData("""[{"version":"01.2.3","changes":["Fix."]}]""")]
    [InlineData("""[{"version":"1.2.3.4","changes":["Fix."]}]""")]
    [InlineData("""[{"version":"1.2.3","changes":["Fix."]},{"version":"1.2.10","changes":["Fix."]}]""")]
    [InlineData("""[{"version":"1.2.3","changes":["Fix."]},{"version":"1.2.3","changes":["Fix."]}]""")]
    [InlineData("""[{"version":"1.2.3","changes":[]}]""")]
    [InlineData("""[{"version":"1.2.3","changes":[""]}]""")]
    [InlineData("""[{"version":"1.2.3","changes":["  "]}]""")]
    [InlineData("""[{"version":"1.2.3","changes":[null]}]""")]
    [InlineData("""[{"version":"1.2.3","changes":null}]""")]
    [InlineData("""[{"version":null,"changes":["Fix."]}]""")]
    [InlineData("[null]")]
    public void RejectsInvalidRegistryReleases(string releases)
    {
        Assert.Throws<InvalidDataException>(() => ParseConfig(Registry(releases)));
    }

    [Fact]
    public void ManifestV2KeepsEveryExistingFieldAndFiltersFutureReleases()
    {
        var mod = Assert.Single(ParseConfig(Registry("""
            [
              {"version":"2.3.10","changes":["Future change."]},
              {"version":"2.3.4","changes":["First fix.","Second fix."]},
              {"version":"2.2.0","changes":["Older fix."]}
            ]
            """)).Mods);
        var releases = SelectReleases(mod, "2.3.4");
        using var document = JsonDocument.Parse(SerializeManifest(new List<PublishedMod>
        {
            new(mod.Id, mod.Name, "2.3.4", mod.Description, "TestMod.dll", "/mods/TestMod.dll", 123, "abc123", releases),
        }));
        Assert.Equal(2, document.RootElement.GetProperty("schemaVersion").GetInt32());
        var entry = Assert.Single(document.RootElement.GetProperty("mods").EnumerateArray());
        Assert.Equal(
            new[] { "id", "name", "version", "description", "fileName", "downloadPath", "sizeBytes", "sha256", "releases" },
            entry.EnumerateObject().Select(property => property.Name).ToArray());
        Assert.Equal("test-mod", entry.GetProperty("id").GetString());
        Assert.Equal("Test Mod", entry.GetProperty("name").GetString());
        Assert.Equal("2.3.4", entry.GetProperty("version").GetString());
        Assert.Equal("Test description.", entry.GetProperty("description").GetString());
        Assert.Equal("TestMod.dll", entry.GetProperty("fileName").GetString());
        Assert.Equal("/mods/TestMod.dll", entry.GetProperty("downloadPath").GetString());
        Assert.Equal(123, entry.GetProperty("sizeBytes").GetInt64());
        Assert.Equal("abc123", entry.GetProperty("sha256").GetString());
        var publishedReleases = entry.GetProperty("releases").EnumerateArray().ToArray();
        Assert.Equal(new[] { "2.3.4", "2.2.0" }, publishedReleases.Select(release => release.GetProperty("version").GetString()).ToArray());
        Assert.Equal(new[] { "First fix.", "Second fix." }, publishedReleases[0].GetProperty("changes").EnumerateArray().Select(change => change.GetString()).ToArray());
        Assert.Equal(new[] { "version", "changes" }, publishedReleases[0].EnumerateObject().Select(property => property.Name).ToArray());
    }

    [Fact]
    public void ModWithoutReleasesKeepsExactlyTheEightExistingFields()
    {
        var mod = Assert.Single(ParseConfig(Registry("null")).Mods);
        Assert.Null(SelectReleases(mod, "1.0.0"));
        using var document = JsonDocument.Parse(SerializeManifest(new List<PublishedMod>
        {
            new(mod.Id, mod.Name, "1.0.0", mod.Description, "TestMod.dll", "/mods/TestMod.dll", 123, "abc123"),
        }));
        var entry = Assert.Single(document.RootElement.GetProperty("mods").EnumerateArray());
        Assert.Equal(
            new[] { "id", "name", "version", "description", "fileName", "downloadPath", "sizeBytes", "sha256" },
            entry.EnumerateObject().Select(property => property.Name).ToArray());
    }

    [Theory]
    [InlineData("[]")]
    [InlineData("""[{"version":"1.0.0","changes":["A fix."]}]""")]
    public void RequiresChangesForTheNewestTagOnceReleasesAreListed(string releases)
    {
        var mod = Assert.Single(ParseConfig(Registry(releases)).Mods);
        var error = Assert.Throws<InvalidDataException>(() => SelectReleases(mod, "1.1.0"));
        Assert.Contains("newest tagged version 1.1.0", error.Message);
    }

    [Fact]
    public void SignsExactWrittenBytesWithPkcs1Sha256AndBase64WithoutNewline()
    {
        using var key = RSA.Create(3072);
        var (privatePath, publicPath) = WriteKey(key);
        WriteManifest(_root, new List<PublishedMod>(), privatePath, publicPath);

        var bytes = File.ReadAllBytes(Path.Combine(_root, "manifest.json"));
        var signatureText = File.ReadAllText(Path.Combine(_root, "manifest.json.sig"));
        var signature = Convert.FromBase64String(signatureText);
        Assert.Equal(Convert.ToBase64String(signature), signatureText);
        using var publicKey = RSA.Create();
        publicKey.ImportSubjectPublicKeyInfo(Convert.FromBase64String(File.ReadAllText(publicPath)), out _);
        Assert.True(publicKey.VerifyData(bytes, signature, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1));
        bytes[0] ^= 1;
        Assert.False(publicKey.VerifyData(bytes, signature, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1));
    }

    [Fact]
    public void WithoutSigningVariableWritesNoSignatureAndNeedsNoPublicKey()
    {
        WriteManifest(_root, new List<PublishedMod>(), null, Path.Combine(_root, "missing-public-key.txt"));
        Assert.True(File.Exists(Path.Combine(_root, "manifest.json")));
        Assert.False(File.Exists(Path.Combine(_root, "manifest.json.sig")));
    }

    [Fact]
    public void RejectsPrivateKeyThatDoesNotMatchReleasePublicKey()
    {
        using var key = RSA.Create(2048);
        var (privatePath, publicPath) = WriteKey(key);
        using var otherKey = RSA.Create(2048);
        File.WriteAllText(publicPath, Convert.ToBase64String(otherKey.ExportSubjectPublicKeyInfo()));
        var error = Assert.Throws<InvalidDataException>(() => WriteManifest(_root, new List<PublishedMod>(), privatePath, publicPath));
        Assert.Contains("does not match", error.Message);
        Assert.False(File.Exists(Path.Combine(_root, "manifest.json.sig")));
    }

    [Fact]
    public void RejectsMissingReleasePublicKey()
    {
        using var key = RSA.Create(2048);
        var (privatePath, publicPath) = WriteKey(key);
        File.Delete(publicPath);
        var error = Assert.Throws<InvalidDataException>(() => WriteManifest(_root, new List<PublishedMod>(), privatePath, publicPath));
        Assert.Contains("public key is missing", error.Message);
        Assert.False(File.Exists(Path.Combine(_root, "manifest.json.sig")));
    }

    [Fact]
    public void RejectsPrivateKeyThatIsNotPkcs8Pem()
    {
        using var key = RSA.Create(2048);
        var (privatePath, publicPath) = WriteKey(key);
        File.WriteAllText(privatePath, key.ExportRSAPrivateKeyPem());
        var error = Assert.Throws<InvalidDataException>(() => WriteManifest(_root, new List<PublishedMod>(), privatePath, publicPath));
        Assert.Contains("PKCS#8 PEM", error.Message);
    }

    private (string PrivatePath, string PublicPath) WriteKey(RSA key)
    {
        var privatePath = Path.Combine(_root, "private.pem");
        var publicPath = Path.Combine(_root, "public.txt");
        File.WriteAllText(privatePath, key.ExportPkcs8PrivateKeyPem());
        File.WriteAllText(publicPath, Convert.ToBase64String(key.ExportSubjectPublicKeyInfo()));
        return (privatePath, publicPath);
    }

    private static string Registry(string releases) => $$"""
        {
          "schemaVersion": 1,
          "mods": [{
            "id": "test-mod",
            "project": "TestMod",
            "name": "Test Mod",
            "description": "Test description.",
            "releases": {{releases}}
          }]
        }
        """;

    public void Dispose() => Directory.Delete(_root, recursive: true);
}
