using System.Collections.Generic;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Ui;
using UnityEngine;

namespace PocketCompendium.Core.Feedback;

/// <summary>
/// The report action: gathers the setup's details, copies them and opens the About page on the
/// places to report, whose GitHub row opens the problem form with the details filled in. The About
/// page, a stopped feature's card and its settings row share it, so every report carries the same
/// details and offers the same places.
/// </summary>
internal static class ReportAction
{
    private static AboutPage _page;
    private static string _version = string.Empty;
    private static string _build = string.Empty;
    private static IReadOnlyList<Feature> _features = new List<Feature>();

    public static void Configure(AboutPage page, string version, string build, IReadOnlyList<Feature> features)
    {
        _page = page;
        _version = version;
        _build = build;
        _features = features;
    }

    public static void Open()
    {
        var facts = SetupReader.Read(_version, _build, _features);
        GUIUtility.systemCopyBuffer = ProblemReport.Details(facts);
        _page.ShowProblemPlaces(ProblemReport.Link(facts));
        SettingsWindow.Current.OpenPage(_page, toEnd: true);
    }
}
