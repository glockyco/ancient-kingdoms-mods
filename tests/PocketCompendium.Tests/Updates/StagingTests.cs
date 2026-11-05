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
    private readonly UpdateFiles _files;

    // The tests name a DLL's version by its content, which the real reader takes from MelonInfo.
    private readonly Dictionary<string, ModVersion> _versions = new();

    public StagingTests()
    {
        _files = new UpdateFiles(Path.Combine(_root, "UserData"), Path.Combine(_root, "Mods"), Path.Combine(_root, "Plugins"));
        Directory.CreateDirectory(Path.Combine(_root, "Mods"));
    }

    public void Dispose() => Directory.Delete(_root, recursive: true);

    private ModVersion? VersionOf(string path) =>
        _versions.TryGetValue(File.ReadAllText(path), out var version) ? version : null;

    private void Install(string content, string version)
    {
        File.WriteAllText(_files.Installed, content);
        _versions[content] = ModVersion.Parse(version);
    }

    private void Stage(string content, string version)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(content);
        Staging.Stage(_files, bytes, UpdateTestData.Sha256(bytes));
        _versions[content] = ModVersion.Parse(version);
    }

    [Fact]
    public void A_higher_staged_version_replaces_the_installed_one()
    {
        Install("old", "1.0.2");
        Stage("new", "1.0.3");

        var moved = Staging.Apply(_files, VersionOf);

        Assert.Equal((ModVersion.Parse("1.0.2"), ModVersion.Parse("1.0.3")), moved);
        Assert.Equal("new", File.ReadAllText(_files.Installed));
        Assert.False(Staging.HasStaged(_files));
    }

    [Theory]
    [InlineData("1.0.3")]
    [InlineData("1.0.4")]
    public void A_staged_version_no_higher_than_the_installed_one_is_dropped(string installed)
    {
        Install("dev build", installed);
        Stage("new", "1.0.3");

        Assert.Null(Staging.Apply(_files, VersionOf));
        Assert.Equal("dev build", File.ReadAllText(_files.Installed));
        Assert.False(Staging.HasStaged(_files));
    }

    [Fact]
    public void A_removed_mod_is_not_put_back()
    {
        Stage("new", "1.0.3");

        Assert.Null(Staging.Apply(_files, VersionOf));
        Assert.False(File.Exists(_files.Installed));
        Assert.False(Staging.HasStaged(_files));
    }

    [Fact]
    public void A_mod_saved_under_another_name_is_updated_in_place()
    {
        // A browser saves a second download as "PocketCompendium (1).dll", and MelonLoader loads it.
        string renamed = Path.Combine(_root, "Mods", "PocketCompendium (1).dll");
        File.Copy(typeof(StagingTests).Assembly.Location, renamed);
        var files = new UpdateFiles(Path.Combine(_root, "UserData"), Path.Combine(_root, "Mods"), Path.Combine(_root, "Plugins"));
        byte[] staged = Encoding.UTF8.GetBytes("new");
        Staging.Stage(files, staged, UpdateTestData.Sha256(staged));

        var moved = Staging.Apply(files, path => path == renamed ? ModVersion.Parse("1.0.2") : ModVersion.Parse("1.0.3"));

        Assert.Equal(renamed, files.Installed);
        Assert.Equal((ModVersion.Parse("1.0.2"), ModVersion.Parse("1.0.3")), moved);
        Assert.Equal("new", File.ReadAllText(renamed));
    }

    [Fact]
    public void A_staged_file_that_changed_after_download_is_refused()
    {
        Install("old", "1.0.2");
        Stage("new", "1.0.3");
        File.WriteAllText(_files.Staged, "tampered");
        _versions["tampered"] = ModVersion.Parse("9.9.9");

        Assert.Throws<UpdateException>(() => Staging.Apply(_files, VersionOf));
        Assert.Equal("old", File.ReadAllText(_files.Installed));
        Assert.False(Staging.HasStaged(_files));
    }

    [Fact]
    public void The_answer_and_last_version_survive_a_restart()
    {
        var saved = new UpdateSettings { Answer = UpdateAnswer.Tell, LastVersion = ModVersion.Parse("1.0.3") };
        saved.Save(_files.Settings);

        var loaded = UpdateSettings.Load(_files.Settings);

        Assert.Equal(UpdateAnswer.Tell, loaded.Answer);
        Assert.Equal(ModVersion.Parse("1.0.3"), loaded.LastVersion);
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
