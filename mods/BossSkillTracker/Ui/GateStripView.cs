using BossSkillTracker.Model;
using UnityEngine;
using UnityEngine.UI;

namespace BossSkillTracker.Ui;

/// <summary>
/// Shows the gate as a span. The filled part runs to the exact deadline the game holds; the lighter
/// tail is the basic attack cycle the monster still has to finish before it can select a skill.
/// </summary>
public sealed class GateStripView
{
    public readonly GameObject Root;
    private readonly Image _statusBox;
    private readonly Label _status;
    private readonly Label _readout;
    private readonly RectTransform _track;
    private readonly Image _lockedFill;
    private readonly Image _windowZone;
    private readonly Image _deadlineTick;
    private readonly Image _marker;

    public GateStripView(Transform parent)
    {
        Root = HudFactory.Rect("Gate", parent);

        var label = HudFactory.Label("label", Root.transform, Tuning.SmallSize, Theme.Muted, Align.Left);
        label.Value = "next special";
        HudFactory.Place(label.Go.GetComponent<RectTransform>(), new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(Tuning.Pad, -22f), new Vector2(-(Tuning.GateStatusWidth + Tuning.GateReadoutWidth + Tuning.Pad * 3f), -4f));

        _statusBox = HudFactory.Box("statusBox", Root.transform, Theme.Header);
        HudFactory.Place(_statusBox, new Vector2(1f, 1f), new Vector2(1f, 1f), new Vector2(-(Tuning.GateStatusWidth + Tuning.GateReadoutWidth + Tuning.Pad * 2f), -22f), new Vector2(-(Tuning.GateReadoutWidth + Tuning.Pad * 2f), -4f));

        _status = HudFactory.Label("status", Root.transform, Tuning.SmallSize, Theme.Muted, Align.Center);
        HudFactory.Place(_status.Go.GetComponent<RectTransform>(), new Vector2(1f, 1f), new Vector2(1f, 1f), new Vector2(-(Tuning.GateStatusWidth + Tuning.GateReadoutWidth + Tuning.Pad * 2f), -22f), new Vector2(-(Tuning.GateReadoutWidth + Tuning.Pad * 2f), -4f));

        _readout = HudFactory.Label("readout", Root.transform, Tuning.SmallSize, Theme.Text, Align.Right, monospaced: true);
        HudFactory.Place(_readout.Go.GetComponent<RectTransform>(), new Vector2(1f, 1f), new Vector2(1f, 1f), new Vector2(-(Tuning.GateReadoutWidth + Tuning.Pad), -22f), new Vector2(-Tuning.Pad, -4f));

        var track = HudFactory.Box("track", Root.transform, Theme.Track);
        _track = HudFactory.Place(track, new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(Tuning.Pad, -(28f + Tuning.GateTrackHeight)), new Vector2(-Tuning.Pad, -28f));

        _windowZone = HudFactory.Box("window", track.transform, Theme.WindowZone);
        _lockedFill = HudFactory.Box("locked", track.transform, Theme.Steel);
        _deadlineTick = HudFactory.Box("deadline", track.transform, Theme.Marker);
        _marker = HudFactory.Box("marker", track.transform, Theme.Marker);
    }

    public void Update(GateVm gate, double now)
    {
        bool hasSpan = gate.Status is not (GateStatus.Inactive or GateStatus.Unknown);
        _track.gameObject.SetActive(hasSpan);
        _windowZone.gameObject.SetActive(hasSpan);
        _lockedFill.gameObject.SetActive(hasSpan);
        _deadlineTick.gameObject.SetActive(hasSpan);
        _marker.gameObject.SetActive(hasSpan);

        if (hasSpan)
        {
            float width = _track.rect.width;
            float deadlineFrac = CooldownMath.Progress(gate.LockStart, gate.LatestAt, gate.ReadyAt);
            float nowFrac = CooldownMath.Progress(gate.LockStart, gate.LatestAt, now);
            PlaceX(_windowZone, width * deadlineFrac, width * (1f - deadlineFrac));
            WidthFrac(_lockedFill, nowFrac);
            PlaceX(_deadlineTick, width * deadlineFrac - 1f, 2f);
            PlaceX(_marker, width * nowFrac - 1f, 2f);
        }

        _statusBox.color = gate.Status == GateStatus.Armed ? Theme.CastBg : Theme.Header;

        switch (gate.Status)
        {
            case GateStatus.Inactive:
                _status.Value = "OUT OF FIGHT";
                _readout.Value = "no gate";
                break;
            case GateStatus.Unknown:
                _status.Value = "UNKNOWN";
                _readout.Value = "no cast seen";
                break;
            case GateStatus.Warmup:
                _status.Value = "WARMUP";
                _readout.Value = Span(gate, now);
                break;
            case GateStatus.BasicOnly:
                _status.Value = "BASICS ONLY";
                _readout.Value = Span(gate, now);
                break;
            case GateStatus.Held:
                _status.Value = "HELD";
                _readout.Value = Span(gate, now);
                break;
            case GateStatus.Locked:
                _status.Value = "LOCKED";
                _readout.Value = Span(gate, now);
                break;
            case GateStatus.Armed:
                _status.Value = "ARMED";
                _readout.Value = now < gate.LatestAt
                    ? Readout.UpTo(gate.LatestAt - now, Approximate(gate))
                    : "any moment";
                break;
            default:
                _status.Value = "IDLE";
                _readout.Value = "no skill ready";
                break;
        }
    }

    private static string Span(GateVm gate, double now)
        => Readout.Span(gate.ReadyAt - now, gate.LatestAt - now, Approximate(gate));

    /// <summary>An observed window states what the game allows, not what this monster scheduled.</summary>
    private static bool Approximate(GateVm gate) => gate.Provenance == GateProvenance.Observed;

    private static void WidthFrac(Image image, float frac)
    {
        var rect = image.GetComponent<RectTransform>();
        rect.anchorMin = new Vector2(0f, 0f);
        rect.anchorMax = new Vector2(frac, 1f);
        rect.offsetMin = Vector2.zero;
        rect.offsetMax = Vector2.zero;
    }

    private static void PlaceX(Image image, float x, float width)
    {
        var rect = image.GetComponent<RectTransform>();
        rect.anchorMin = new Vector2(0f, 0f);
        rect.anchorMax = new Vector2(0f, 1f);
        rect.offsetMin = new Vector2(x, 0f);
        rect.offsetMax = new Vector2(x + width, 0f);
    }
}
