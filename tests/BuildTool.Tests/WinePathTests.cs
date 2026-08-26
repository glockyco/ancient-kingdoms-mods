using System;
using System.IO;
using BuildTool.Game;
using Xunit;

namespace BuildTool.Tests;

/// <summary>
/// The game runs under Wine and reports Windows paths. A check against an untranslated path
/// answers "absent" for a file that exists, which would silently disable scratch reuse, so
/// the translation is pinned here.
/// </summary>
public sealed class WinePathTests : IDisposable
{
    private readonly string _prefix = Directory.CreateTempSubdirectory("ak-wine").FullName;

    public void Dispose() => Directory.Delete(_prefix, recursive: true);

    [Fact]
    public void TranslatesADriveCPathIntoThePrefix()
    {
        var host = WinePath.ToHost(
            "C:/Program Files (x86)/Steam/game.dat", _prefix);

        Assert.Equal(
            Path.Combine(_prefix, "drive_c", "Program Files (x86)", "Steam", "game.dat"),
            host);
    }

    [Fact]
    public void AcceptsBackslashes()
    {
        Assert.Equal(
            WinePath.ToHost("C:/Steam/game.dat", _prefix),
            WinePath.ToHost(@"C:\Steam\game.dat", _prefix));
    }

    [Fact]
    public void IsCaseInsensitiveAboutTheDriveLetter()
        => Assert.Equal(
            WinePath.ToHost("C:/Steam/game.dat", _prefix),
            WinePath.ToHost("c:/Steam/game.dat", _prefix));

    [Fact]
    public void PassesAHostPathThrough()
        => Assert.Equal("/Users/me/game.dat", WinePath.ToHost("/Users/me/game.dat", _prefix));

    [Theory]
    [InlineData("D:/elsewhere/game.dat")]   // a drive this mapping does not cover
    [InlineData("")]
    [InlineData(null)]
    public void RefusesWhatItCannotTranslate(string? reported)
        => Assert.Null(WinePath.ToHost(reported, _prefix));

    [Fact]
    public void RefusesWithoutAPrefix()
        => Assert.Null(WinePath.ToHost("C:/Steam/game.dat", ""));

    [Fact]
    public void FindsAFileThatExistsBehindAReportedPath()
    {
        var host = Path.Combine(_prefix, "drive_c", "Steam");
        Directory.CreateDirectory(host);
        File.WriteAllText(Path.Combine(host, "game.dat"), "db");

        Assert.True(WinePath.ExistsOnHost("C:/Steam/game.dat", _prefix));
    }

    [Fact]
    public void ReportsAbsentWhenTheTranslatedFileIsMissing()
        => Assert.False(WinePath.ExistsOnHost("C:/Steam/game.dat", _prefix));

    [Fact]
    public void ReportsAbsentForAnUntranslatablePath()
        => Assert.False(WinePath.ExistsOnHost("D:/Steam/game.dat", _prefix));
}
