using System;
using System.Linq;
using System.Text;
using AncientKingdomsMods.Shared.Updates;
using Xunit;

namespace PocketCompendium.Tests.Updates;

public sealed class ModListTests
{
    [Theory]
    [InlineData("1.0.3", 1, 0, 3)]
    [InlineData("10.20.30", 10, 20, 30)]
    public void A_version_reads_major_minor_and_patch(string text, int major, int minor, int patch)
    {
        Assert.True(ModVersion.TryParse(text, out var version));
        Assert.Equal(new ModVersion(major, minor, patch), version);
        Assert.Equal(text, version.ToString());
    }

    [Theory]
    [InlineData("1.0")]
    [InlineData("1.0.0.0")]
    [InlineData("1.0.x")]
    [InlineData("-1.0.0")]
    [InlineData("1.0.0-beta")]
    [InlineData(" 1.0.0")]
    [InlineData("")]
    [InlineData(null)]
    public void Anything_but_three_plain_numbers_is_no_version(string? text)
    {
        Assert.False(ModVersion.TryParse(text, out _));
    }

    [Fact]
    public void Versions_compare_by_number_not_by_text()
    {
        Assert.True(ModVersion.Parse("1.0.10") > ModVersion.Parse("1.0.9"));
        Assert.True(ModVersion.Parse("1.1.0") > ModVersion.Parse("1.0.99"));
        Assert.True(ModVersion.Parse("2.0.0") > ModVersion.Parse("1.9.9"));
        Assert.Equal(ModVersion.Parse("1.0.2"), ModVersion.Parse("1.0.2"));
    }

    [Fact]
    public void The_list_names_pocket_compendium_with_its_releases_newest_first()
    {
        var list = ModList.Parse(UpdateTestData.ListBytes());

        var mod = list.Find(ModList.PocketCompendiumId);
        Assert.NotNull(mod);
        Assert.Equal(ModVersion.Parse("1.0.3"), mod.Version);
        Assert.Equal("/mods/PocketCompendium.dll", mod.DownloadPath);
        Assert.Equal(UpdateTestData.Sha256(UpdateTestData.DllV103), mod.Sha256);
        Assert.Equal(new[] { "1.0.3", "1.0.2" }, mod.Releases.Select(release => release.Version.ToString()));
        Assert.Equal("Fixes the stutter while walking.", Assert.Single(mod.Releases[1].Changes));
    }

    [Fact]
    public void A_mod_without_releases_has_none()
    {
        var list = ModList.Parse(UpdateTestData.ListBytes());

        Assert.Empty(list.Find("field-default-value-hook-fix")!.Releases);
    }

    [Theory]
    [InlineData("not json")]
    [InlineData("{}")]
    [InlineData("""{ "mods": [ { "id": "pocket-compendium", "version": "one" } ] }""")]
    public void A_list_of_another_shape_is_a_format_error(string json)
    {
        Assert.Throws<FormatException>(() => ModList.Parse(Encoding.UTF8.GetBytes(json)));
    }

    [Fact]
    public void Only_the_signed_bytes_verify_with_the_signing_key()
    {
        using var key = new UpdateTestData.Key();
        using var other = new UpdateTestData.Key();
        byte[] list = UpdateTestData.ListBytes();
        string signature = key.Sign(list);

        Assert.True(ListSignature.Verifies(list, signature, key.Public));

        byte[] changed = (byte[])list.Clone();
        changed[^3] ^= 1;
        Assert.False(ListSignature.Verifies(changed, signature, key.Public));
        Assert.False(ListSignature.Verifies(list, signature, other.Public));
        Assert.False(ListSignature.Verifies(list, "not base64!", key.Public));
        Assert.False(ListSignature.Verifies(list, signature, "not a key"));
    }
}
