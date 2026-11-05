using System.Collections.Generic;
using PocketCompendium.Core.Features;
using UnityEngine;

namespace PocketCompendium.Core.Feedback;

/// <summary>
/// The report action: gathers the setup's details, copies them and opens the problem form with them
/// filled in. The About page, a stopped feature's card and its settings row share it, so every
/// report carries the same details.
/// </summary>
internal static class ReportAction
{
    private static string _version = string.Empty;
    private static string _build = string.Empty;
    private static IReadOnlyList<Feature> _features = new List<Feature>();

    public static void Configure(string version, string build, IReadOnlyList<Feature> features)
    {
        _version = version;
        _build = build;
        _features = features;
    }

    public static void Open()
    {
        var facts = SetupReader.Read(_version, _build, _features);
        GUIUtility.systemCopyBuffer = ProblemReport.Details(facts);
        Application.OpenURL(ProblemReport.Link(facts));
    }
}
