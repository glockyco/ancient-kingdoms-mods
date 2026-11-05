using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using AncientKingdomsMods.Shared.Updates;
using Xunit;

namespace PocketCompendium.Tests.Updates;

public sealed class StagingTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "pc-staging-" + Guid.NewGuid().ToString("N"));
    private readonly string _mods;
    private readonly UpdateFiles _files;

    // The tests name a DLL's version by its content, which the real reader takes from MelonInfo.
    private readonly Dictionary<string, ModVersion> _versions = new();

    public StagingTests()
    {
        _mods = Path.Combine(_root, "Mods");
        _files = new UpdateFiles(Path.Combine(_root, "UserData"), _mods, Path.Combine(_root, "Plugins"));
        Directory.CreateDirectory(_mods);
    }

    public void Dispose() => Directory.Delete(_root, recursive: true);

    private ModVersion? VersionOf(string path) =>
        _versions.TryGetValue(File.ReadAllText(path), out var version) ? version : null;

    private void Install(string content, string version)
    {
        File.WriteAllText(_files.Installed, content);
        _versions[content] = ModVersion.Parse(version);
    }

    // A copy under another name counts only when it names itself Pocket Compendium, as this test
    // assembly does. Its version comes from the content written over it afterwards.
    private string InstallAs(string fileName, string content, string version)
    {
        string path = Path.Combine(_mods, fileName);
        File.Copy(typeof(StagingTests).Assembly.Location, path);
        _versions[content] = ModVersion.Parse(version);
        return path;
    }

    private ModVersion? VersionWith(string renamed, string content, string path) =>
        path == renamed ? _versions[content] : VersionOf(path);

    private void Stage(string content, string version)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(content);
        Staging.Stage(_files, bytes, UpdateTestData.Sha256(bytes));
        _versions[content] = ModVersion.Parse(version);
    }

    [Fact]
    public void A_higher_waiting_version_replaces_the_installed_one()
    {
        Install("old", "1.0.2");
        Stage("new", "1.0.3");

        var settled = Staging.Settle(_files, VersionOf);

        Assert.True(settled.Updated);
        Assert.Equal(ModVersion.Parse("1.0.3"), settled.Installed);
        Assert.Equal(ModVersion.Parse("1.0.2"), settled.Replaced);
        Assert.Equal("new", File.ReadAllText(_files.Installed));
        Assert.False(Staging.HasStaged(_files));
    }

    [Theory]
    [InlineData("1.0.3")]
    [InlineData("1.0.4")]
    public void A_waiting_version_no_higher_than_the_installed_one_is_dropped(string installed)
    {
        Install("dev build", installed);
        Stage("new", "1.0.3");

        var settled = Staging.Settle(_files, VersionOf);

        Assert.False(settled.Updated);
        Assert.Equal("dev build", File.ReadAllText(_files.Installed));
        Assert.False(Staging.HasStaged(_files));
    }

    [Fact]
    public void A_removed_mod_is_not_put_back()
    {
        Stage("new", "1.0.3");

        var settled = Staging.Settle(_files, VersionOf);

        Assert.False(settled.Updated);
        Assert.False(File.Exists(_files.Installed));
        Assert.False(Staging.HasStaged(_files));
    }

    [Fact]
    public void A_mod_saved_under_another_name_moves_to_the_usual_name()
    {
        string renamed = InstallAs("PocketCompendium (1).dll", "renamed", "1.0.2");

        var settled = Staging.Settle(_files, path => VersionWith(renamed, "renamed", path));

        Assert.False(settled.Updated);
        Assert.Equal(ModVersion.Parse("1.0.2"), settled.Installed);
        Assert.True(File.Exists(_files.Installed));
        Assert.False(File.Exists(renamed));
    }

    [Fact]
    public void A_mod_saved_under_another_name_is_updated_under_the_usual_name()
    {
        string renamed = InstallAs("PocketCompendium (1).dll", "renamed", "1.0.2");
        Stage("new", "1.0.3");

        var settled = Staging.Settle(_files, path => VersionWith(renamed, "renamed", path));

        Assert.True(settled.Updated);
        Assert.Equal("new", File.ReadAllText(_files.Installed));
        Assert.False(File.Exists(renamed));
    }

    [Fact]
    public void The_newest_of_two_copies_stays_under_the_usual_name()
    {
        // MelonLoader loads only the first copy by name, here the older "(1)" one.
        string renamed = InstallAs("PocketCompendium (1).dll", "renamed", "1.0.2");
        Install("manual", "1.0.3");

        var settled = Staging.Settle(_files, path => VersionWith(renamed, "renamed", path));

        Assert.False(settled.Updated);
        Assert.Equal(ModVersion.Parse("1.0.3"), settled.Installed);
        Assert.Equal("manual", File.ReadAllText(_files.Installed));
        Assert.False(File.Exists(renamed));
    }

    [Fact]
    public void A_newer_copy_under_another_name_replaces_the_usual_one()
    {
        string renamed = InstallAs("PocketCompendium (1).dll", "renamed", "1.0.4");
        Install("old", "1.0.3");

        var settled = Staging.Settle(_files, path => VersionWith(renamed, "renamed", path));

        Assert.Equal(ModVersion.Parse("1.0.4"), settled.Installed);
        Assert.Equal(File.ReadAllBytes(typeof(StagingTests).Assembly.Location), File.ReadAllBytes(_files.Installed));
        Assert.False(File.Exists(renamed));
    }

    [Fact]
    public void A_broken_usual_file_is_replaced_by_a_waiting_version()
    {
        File.WriteAllText(_files.Installed, "not a mod");
        Stage("new", "1.0.3");

        var settled = Staging.Settle(_files, VersionOf);

        Assert.True(settled.Updated);
        Assert.Null(settled.Replaced);
        Assert.Equal("new", File.ReadAllText(_files.Installed));
    }

    [Fact]
    public void A_waiting_file_that_changed_after_download_is_thrown_away()
    {
        Install("old", "1.0.2");
        Stage("new", "1.0.3");
        File.WriteAllText(_files.Staged, "tampered");

        var settled = Staging.Settle(_files, VersionOf);

        Assert.False(settled.Updated);
        Assert.NotNull(settled.Discarded);
        Assert.Equal("old", File.ReadAllText(_files.Installed));
        Assert.False(Staging.HasStaged(_files));
    }

    [Fact]
    public void A_waiting_file_without_its_hash_is_thrown_away()
    {
        Install("old", "1.0.2");
        Stage("new", "1.0.3");
        File.Delete(_files.StagedHash);

        var settled = Staging.Settle(_files, VersionOf);

        Assert.False(settled.Updated);
        Assert.Equal("old", File.ReadAllText(_files.Installed));
        Assert.False(Staging.HasStaged(_files));
    }

    [Fact]
    public void The_answer_and_last_version_survive_a_restart()
    {
        var settings = new UpdateSettings { Answer = UpdateAnswer.Tell, LastVersion = ModVersion.Parse("1.0.2") };
        settings.Save(_files.Settings);

        var loaded = UpdateSettings.Load(_files.Settings);

        Assert.Equal(UpdateAnswer.Tell, loaded.Answer);
        Assert.Equal(ModVersion.Parse("1.0.2"), loaded.LastVersion);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("not json")]
    [InlineData("""{ "answer": "sometimes" }""")]
    public void A_missing_or_unreadable_answer_means_the_question_comes_back(string? content)
    {
        if (content != null)
        {
            Directory.CreateDirectory(_files.Folder);
            File.WriteAllText(_files.Settings, content);
        }

        Assert.Null(UpdateSettings.Load(_files.Settings).Answer);
    }
}
