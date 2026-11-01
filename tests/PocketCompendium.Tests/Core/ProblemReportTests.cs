using System;
using PocketCompendium.Core.Feedback;
using Xunit;

namespace PocketCompendium.Tests.Core;

public sealed class ProblemReportTests
{
    private static SetupFacts Facts() => new()
    {
        ModVersion = "1.0.0",
        Build = "30cf29e",
        GameVersion = "0.10.1.3",
        MelonLoaderVersion = "0.7.1",
        System = "Wine 9.0 on macOS",
        Language = "en",
        Setting = PlaySetting.Joined,
        OtherMods = { ("BossTracker", "2.3.0") },
        SwitchedOff = { "Alerts" },
        Stopped = { ("Map pins", "NullReferenceException at C:\\Users\\Jane Doe\\AppData\\x.cs:12\n   at Next.Frame()") },
    };

    [Fact]
    public void Details_name_the_setup_in_a_fixed_order()
    {
        string details = ProblemReport.Details(Facts());
        string[] labels = { "Pocket Compendium: 1.0.0 (build 30cf29e)", "Game: 0.10.1.3", "MelonLoader: 0.7.1", "System: Wine 9.0 on macOS", "Language: en", "Playing: in a world someone else hosts", "Other mods: BossTracker 2.3.0", "Switched off: Alerts", "Stopped after an error:", "- Map pins: NullReferenceException" };
        int position = -1;
        foreach (string label in labels)
        {
            int next = details.IndexOf(label, StringComparison.Ordinal);
            Assert.True(next > position, $"'{label}' is missing or out of order in:\n{details}");
            position = next;
        }
    }

    [Fact]
    public void Errors_keep_their_first_line_without_paths()
    {
        string details = ProblemReport.Details(Facts());
        Assert.DoesNotContain("Jane Doe", details);
        Assert.DoesNotContain("Users", details);
        Assert.Contains("x.cs:12", details);
        Assert.DoesNotContain("Next.Frame", details);
        Assert.Equal("failed in Feature.cs:3", ProblemReport.Impersonal("failed in /home/jane/mods/Feature.cs:3"));
    }

    [Fact]
    public void Link_fills_the_details_field_of_the_problem_form()
    {
        var link = new Uri(ProblemReport.Link(Facts()));
        Assert.Equal("/glockyco/ancient-kingdoms-mods/issues/new", link.AbsolutePath);
        Assert.Contains("template=" + ProblemReport.FormFile, link.Query);
        string details = Uri.UnescapeDataString(link.Query.Substring(link.Query.IndexOf("details=", StringComparison.Ordinal) + "details=".Length));
        Assert.Equal(ProblemReport.Details(Facts()), details);
    }

    [Fact]
    public void Long_errors_are_shortened_until_the_link_fits()
    {
        var facts = Facts();
        facts.Stopped.Clear();
        for (int index = 0; index < 8; index++) facts.Stopped.Add(("Feature " + index, new string('x', 2000)));

        string link = ProblemReport.Link(facts);
        Assert.True(link.Length <= ProblemReport.MaxLinkLength);
        Assert.Contains("Feature%207", link);
        Assert.Contains("shortened", link);
        Assert.Contains(new string('x', 2000), ProblemReport.Details(facts));
    }
}
