using System;
using PocketCompendium.Core.Feedback;
using Xunit;

namespace PocketCompendium.Tests.Core;

public sealed class ProblemReportTests
{
    // Logged by the game on 2026-11-02 after Map pins touched a pin that the game had destroyed.
    private const string Il2CppFailure = """
        Il2CppInterop.Runtime.Il2CppException: System.NullReferenceException: Object reference not set to an instance of an object.
        --- BEGIN IL2CPP STACK TRACE ---
        System.NullReferenceException: Object reference not set to an instance of an object.
          at UnityEngine.Bindings.ThrowHelper.ThrowNullReferenceException (System.Object obj) [0x00000] in <00000000000000000000000000000000>:0 
          at UnityEngine.Component.get_gameObject () [0x00000] in <00000000000000000000000000000000>:0 
        --- END IL2CPP STACK TRACE ---

           at Il2CppInterop.Runtime.Il2CppException.RaiseExceptionIfNecessary(IntPtr returnedException) in /Users/glockyco/src/github.com/glockyco/ancient-kingdoms-mods/.local/tmp/Il2CppInterop/Il2CppInterop.Runtime/Il2CppException.cs:line 36
           at UnityEngine.Component.get_gameObject()
           at PocketCompendium.Features.MapPins.MapPinsFeature.Update() in /_/mods/PocketCompendium/Features/MapPins/MapPinsFeature.cs:line 90
           at PocketCompendium.Core.Features.FeatureRegistry.Update() in /_/mods/PocketCompendium/Core/Features/FeatureRegistry.cs:line 52
        """;

    private const string ManagedFailure = """
        System.InvalidOperationException: Nullable object must have a value.
           at System.Nullable`1.get_Value()
           at PocketCompendium.Core.Tracking.StateText.Value(TrackedState state, Double now) in C:\Users\Jane Doe\src\mods\PocketCompendium\Core\Tracking\StateText.cs:line 41
           at PocketCompendium.Features.BestiaryCountdown.RespawnPlate.Show(TrackedMonster monster, Double now) in C:\Users\Jane Doe\src\mods\PocketCompendium\Features\BestiaryCountdown\BestiaryCountdownFeature.cs:line 270
           at PocketCompendium.Features.BestiaryCountdown.BestiaryCountdownFeature.UpdatePage(Tracker tracker, UIBestiaryDetail detail, Boolean refresh) in C:\Users\Jane Doe\src\mods\PocketCompendium\Features\BestiaryCountdown\BestiaryCountdownFeature.cs:line 126
           at PocketCompendium.Features.BestiaryCountdown.BestiaryCountdownFeature.Update() in C:\Users\Jane Doe\src\mods\PocketCompendium\Features\BestiaryCountdown\BestiaryCountdownFeature.cs:line 84
           at PocketCompendium.Core.Features.FeatureRegistry.Update() in C:\Users\Jane Doe\src\mods\PocketCompendium\Core\Features\FeatureRegistry.cs:line 52
        """;

    private static SetupFacts Facts() => new()
    {
        ModVersion = "1.0.0",
        Build = "30cf29e",
        GameVersion = "0.10.1.3",
        MelonLoaderVersion = "0.7.1",
        System = "Wine 9.0 on macOS",
        Language = "en",
        Setting = PlaySetting.Joined,
        WorldsEntered = 2,
        OtherMods = { ("BossTracker", "2.3.0") },
        SwitchedOff = { "Alerts" },
        Errors = { new LoggedError { Message = "Map pins stopped after an error", Exception = Il2CppFailure, Setting = PlaySetting.Joined, Worlds = 2 } },
        ErrorCount = 1,
    };

    [Fact]
    public void Details_name_the_setup_in_a_fixed_order()
    {
        string details = ProblemReport.Details(Facts());
        string[] labels = { "Pocket Compendium: 1.0.0 (build 30cf29e)", "Game: 0.10.1.3", "MelonLoader: 0.7.1", "System: Wine 9.0 on macOS", "Language: en", "Playing: in a world someone else hosts", "Worlds entered: 2", "Other mods: BossTracker 2.3.0", "Switched off: Alerts", "Errors:", "- Map pins stopped after an error (world 2, joined)", "Il2CppInterop.Runtime.Il2CppException: System.NullReferenceException", "at UnityEngine.Component.get_gameObject()" };
        int position = -1;
        foreach (string label in labels)
        {
            int next = details.IndexOf(label, StringComparison.Ordinal);
            Assert.True(next > position, $"'{label}' is missing or out of order in:\n{details}");
            position = next;
        }
    }

    [Fact]
    public void An_il2cpp_failure_names_the_unity_member_and_the_mods_frame()
    {
        Assert.Equal(
            new[]
            {
                "at UnityEngine.Component.get_gameObject()",
                "at PocketCompendium.Features.MapPins.MapPinsFeature.Update() in MapPinsFeature.cs:line 90",
            },
            ProblemReport.Frames(Il2CppFailure));
    }

    [Fact]
    public void A_managed_failure_names_where_it_was_thrown_and_three_mod_frames()
    {
        Assert.Equal(
            new[]
            {
                "at System.Nullable`1.get_Value()",
                "at PocketCompendium.Core.Tracking.StateText.Value(TrackedState state, Double now) in StateText.cs:line 41",
                "at PocketCompendium.Features.BestiaryCountdown.RespawnPlate.Show(TrackedMonster monster, Double now) in BestiaryCountdownFeature.cs:line 270",
                "at PocketCompendium.Features.BestiaryCountdown.BestiaryCountdownFeature.UpdatePage(Tracker tracker, UIBestiaryDetail detail, Boolean refresh) in BestiaryCountdownFeature.cs:line 126",
            },
            ProblemReport.Frames(ManagedFailure));
    }

    [Fact]
    public void Errors_lose_their_directories()
    {
        var facts = Facts();
        facts.Errors.Add(new LoggedError { Message = "Bestiary countdown stopped after an error", Exception = ManagedFailure, Setting = PlaySetting.Joined, Worlds = 2 });
        string details = ProblemReport.Details(facts);
        Assert.DoesNotContain("Jane Doe", details);
        Assert.DoesNotContain("Users", details);
        Assert.DoesNotContain("glockyco", details);
        Assert.Contains("MapPinsFeature.cs:line 90", details);
        Assert.Equal("failed in Feature.cs:3", ProblemReport.Impersonal("failed in /home/jane/mods/Feature.cs:3"));
    }

    [Fact]
    public void Each_error_says_where_the_player_was()
    {
        var facts = Facts();
        facts.Errors.Clear();
        facts.Errors.Add(new LoggedError { Message = "Respawn tracking stopped after an error", Setting = PlaySetting.NotInWorld, Worlds = 0 });
        facts.Errors.Add(new LoggedError { Message = "Bestiary countdown stopped after an error", Setting = PlaySetting.NotInWorld, Worlds = 1 });
        facts.Errors.Add(new LoggedError { Message = "Map pins stopped after an error", Setting = PlaySetting.Hosting, Worlds = 3 });

        string details = ProblemReport.Details(facts);
        Assert.Contains("- Respawn tracking stopped after an error (before any world)", details);
        Assert.Contains("- Bestiary countdown stopped after an error (after world 1)", details);
        Assert.Contains("- Map pins stopped after an error (world 3, hosting)", details);
    }

    [Fact]
    public void Errors_beyond_those_kept_are_counted()
    {
        var facts = Facts();
        facts.ErrorCount = 7;
        Assert.EndsWith("- 6 more errors in the log", ProblemReport.Details(facts));

        facts.Errors.Clear();
        facts.ErrorCount = 0;
        Assert.EndsWith("Errors: none", ProblemReport.Details(facts));
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
    public void Long_errors_are_shortened_and_lose_their_frames_until_the_link_fits()
    {
        var facts = Facts();
        facts.Errors.Clear();
        string frame = "   at PocketCompendium.Feature.Update(" + new string('y', 1500) + ")";
        for (int index = 0; index < 5; index++)
            facts.Errors.Add(new LoggedError { Message = "Feature " + index + " stopped after an error", Exception = new string('x', 2000) + "\n" + frame, Setting = PlaySetting.Alone, Worlds = 1 });
        facts.ErrorCount = 5;

        string link = ProblemReport.Link(facts);
        Assert.True(link.Length <= ProblemReport.MaxLinkLength);
        Assert.Contains("Feature%204", link);
        Assert.Contains("shortened", link);
        Assert.DoesNotContain(new string('y', 1500), link);

        string details = ProblemReport.Details(facts);
        Assert.Contains(new string('x', 2000), details);
        Assert.Contains(new string('y', 1500), details);
    }
}
