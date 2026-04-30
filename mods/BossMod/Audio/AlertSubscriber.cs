using BossMod.Core.Alerts;
using BossMod.Core.Persistence;
using BossMod.Ui;

namespace BossMod.Audio;

public sealed class AlertSubscriber
{
    private readonly SoundPlayer _soundPlayer;
    private readonly AlertOverlay _alertOverlay;

    public AlertSubscriber(SoundPlayer soundPlayer, AlertOverlay alertOverlay)
    {
        _soundPlayer = soundPlayer;
        _alertOverlay = alertOverlay;
    }

    public void Handle(AlertEvent ev, Globals globals)
    {
        if (!ev.AudioMuted) _soundPlayer.Play(ev.EffectiveSound, globals);

        if (string.IsNullOrEmpty(ev.EffectiveAlertText)) return;
        if (globals.Muted && globals.AlertTextMuteOnMasterMute) return;

        _alertOverlay.Push(ev);
    }
}
