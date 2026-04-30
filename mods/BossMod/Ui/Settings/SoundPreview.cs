using System;
using BossMod.Audio;
using BossMod.Core.Persistence;

namespace BossMod.Ui.Settings;

public sealed class SoundPreview
{
    private readonly SoundPlayer _player;
    private readonly Func<Globals> _globals;

    public SoundPreview(SoundPlayer player, Func<Globals> globals)
    {
        _player = player;
        _globals = globals;
    }

    public void Play(string soundName) => _player.PlayPreview(soundName, _globals());
}
