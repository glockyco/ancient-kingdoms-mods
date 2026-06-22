using System;
using BossSkillTracker.Model;
using UnityEngine;
using UnityEngine.UI;

namespace BossSkillTracker.Ui;

public sealed class GateStripView
{
    public readonly GameObject Root;
    private readonly Image _statusBox;
    private readonly Label _status;
    private readonly Label _readout;
    private readonly Label _tickMinLabel;
    private readonly Label _tickMaxLabel;
    private readonly RectTransform _track;
    private readonly Image _lockedFill;
    private readonly Image _windowZone;
    private readonly Image _tickMin;
    private readonly Image _tickMax;
    private readonly Image _marker;

    private static readonly float Span = (float)Tuning.GateMax;
    private static readonly float LockFrac = (float)(Tuning.GateMin / Tuning.GateMax);

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

        _readout = HudFactory.Label("readout", Root.transform, Tuning.SmallSize, Theme.Text, Align.Right);
        HudFactory.Place(_readout.Go.GetComponent<RectTransform>(), new Vector2(1f, 1f), new Vector2(1f, 1f), new Vector2(-(Tuning.GateReadoutWidth + Tuning.Pad), -22f), new Vector2(-Tuning.Pad, -4f));

        var track = HudFactory.Box("track", Root.transform, Theme.Track);
        _track = HudFactory.Place(track, new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(Tuning.Pad, -(28f + Tuning.GateTrackHeight)), new Vector2(-Tuning.Pad, -28f));

        _lockedFill = HudFactory.Box("locked", track.transform, Theme.Steel);
        _windowZone = HudFactory.Box("window", track.transform, Theme.WindowZone);
        _tickMin = HudFactory.Box("tickMin", track.transform, Theme.Marker);
        _tickMax = HudFactory.Box("tickMax", track.transform, Theme.Marker);
        _marker = HudFactory.Box("marker", track.transform, Theme.Marker);

        _tickMinLabel = HudFactory.Label("tickMinLabel", Root.transform, Tuning.SmallSize, Theme.Muted, Align.Center);
        _tickMinLabel.Value = "+5s";
        _tickMaxLabel = HudFactory.Label("tickMaxLabel", Root.transform, Tuning.SmallSize, Theme.Muted, Align.Right);
        _tickMaxLabel.Value = "+9s";
        HudFactory.Place(_tickMinLabel.Go.GetComponent<RectTransform>(), new Vector2(LockFrac, 1f), new Vector2(LockFrac, 1f), new Vector2(-20f, -55f), new Vector2(20f, -41f));
        HudFactory.Place(_tickMaxLabel.Go.GetComponent<RectTransform>(), new Vector2(1f, 1f), new Vector2(1f, 1f), new Vector2(-44f, -55f), new Vector2(-Tuning.Pad, -41f));
    }

    public void Update(GateVm gate, double now)
    {
        bool hasWindow = gate.Status is GateStatus.Locked or GateStatus.Armed or GateStatus.Idle;
        _windowZone.gameObject.SetActive(hasWindow);
        _tickMin.gameObject.SetActive(hasWindow);
        _tickMax.gameObject.SetActive(hasWindow);
        _marker.gameObject.SetActive(hasWindow);
        _tickMinLabel.SetActive(hasWindow);
        _tickMaxLabel.SetActive(hasWindow);

        float width = _track.rect.width;
        if (hasWindow)
        {
            PlaceX(_windowZone, width * LockFrac, width * (1f - LockFrac));
            PlaceX(_tickMin, width * LockFrac - 1f, 2f);
            PlaceX(_tickMax, width - 2f, 2f);
        }

        _statusBox.color = gate.Status == GateStatus.Armed ? Theme.CastBg : Theme.Header;

        switch (gate.Status)
        {
            case GateStatus.Warmup:
                _status.Value = "WARMUP";
                _readout.Value = "basics only";
                WidthFrac(_lockedFill, 0f);
                break;
            case GateStatus.Unknown:
                _status.Value = "UNKNOWN";
                _readout.Value = "no special";
                WidthFrac(_lockedFill, 0f);
                break;
            default:
                double elapsed = now - (gate.WindowStart - Tuning.GateMin);
                WidthFrac(_lockedFill, Mathf.Clamp01((float)(Math.Min(elapsed, Tuning.GateMin) / Span)));
                PlaceX(_marker, width * Mathf.Clamp01((float)(elapsed / Span)) - 1f, 2f);
                if (gate.Status == GateStatus.Locked)
                {
                    _status.Value = "LOCKED";
                    _readout.Value = $"in {gate.WindowStart - now:0.#}-{gate.WindowEnd - now:0.#}s";
                }
                else if (gate.Status == GateStatus.Armed)
                {
                    _status.Value = "ARMED";
                    _readout.Value = now < gate.WindowEnd ? $"≤ {gate.WindowEnd - now:0.#}s" : "any moment";
                }
                else
                {
                    _status.Value = "IDLE";
                    _readout.Value = "no skill ready";
                }

                break;
        }
    }

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
