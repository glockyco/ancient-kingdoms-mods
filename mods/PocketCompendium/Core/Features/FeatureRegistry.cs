using System;
using System.Collections.Generic;
using System.Linq;

namespace PocketCompendium.Core.Features;

/// <summary>
/// Starts and stops features as their switches change, in the order they were added, and keeps a
/// failure in one feature from reaching the others.
/// </summary>
public sealed class FeatureRegistry
{
    private readonly List<Feature> _features = new();

    public IReadOnlyList<Feature> Features => _features;

    public void Add(Feature feature) => _features.Add(feature);

    public string SwitchedOn() =>
        string.Join(", ", _features.Where(feature => feature.Switch.Value).Select(feature => feature.Title));

    /// <summary>Whether a running feature reads the respawn tracker.</summary>
    public bool TrackerWanted
    {
        get
        {
            foreach (var feature in _features)
                if (feature.Running && feature.UsesTracker)
                    return true;
            return false;
        }
    }

    /// <summary>Applies switch changes, then updates every running feature.</summary>
    public void Update()
    {
        foreach (var feature in _features)
        {
            bool wanted = feature.Switch.Value && !feature.Failed;
            if (wanted && !feature.Running)
                Start(feature);
            else if (!wanted && feature.Running)
                Stop(feature, reportFailure: feature.Failed);

            if (!feature.Running) continue;

            try
            {
                feature.Update();
            }
            catch (Exception exception)
            {
                feature.Fail(exception);
                Stop(feature, reportFailure: true);
            }
        }
    }

    public void OnSceneUnloaded(string sceneName)
    {
        foreach (var feature in _features)
        {
            if (!feature.Running) continue;
            try
            {
                feature.OnSceneUnloaded(sceneName);
            }
            catch (Exception exception)
            {
                feature.Fail(exception);
                Stop(feature, reportFailure: true);
            }
        }
    }

    public void StopAll()
    {
        foreach (var feature in _features)
            if (feature.Running)
                Stop(feature, reportFailure: false);
    }

    private static void Start(Feature feature)
    {
        try
        {
            feature.Enable();
            feature.Running = true;
        }
        catch (Exception exception)
        {
            feature.Fail(exception);
            feature.Running = true;
            Stop(feature, reportFailure: true);
        }
    }

    private static void Stop(Feature feature, bool reportFailure)
    {
        if (reportFailure)
            Log.Error($"{feature.Title} stopped after an error and stays off until the game restarts. Every other feature keeps running: {feature.Failure}");

        try
        {
            feature.Disable();
        }
        catch (Exception exception)
        {
            Log.Error($"{feature.Title} could not clean up after stopping: {exception}");
        }

        feature.Running = false;
    }
}
