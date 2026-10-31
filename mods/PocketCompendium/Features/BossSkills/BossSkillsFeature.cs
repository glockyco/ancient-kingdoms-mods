using System.Collections.Generic;
using PocketCompendium.Core;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Ui;
using PocketCompendium.Core.Game;
using PocketCompendium.Features.BossSkills.Game;
using PocketCompendium.Features.BossSkills.Model;
using PocketCompendium.Features.BossSkills.Ui;
using UnityEngine;

namespace PocketCompendium.Features.BossSkills;

/// <summary>The skill cards of the bosses, elites and fabled monsters the player fights.</summary>
public sealed class BossSkillsFeature : Feature
{
    private readonly BossSkillsSettings _settings;
    private readonly List<EnemyInfo> _enemies = new();
    private HudRoot _hud;
    private EnemyDiscovery _discovery;
    private float _scanTimer;
    private bool _reportedMissingNetworkManager;

    public BossSkillsFeature()
        : base("BossSkills", "Boss skills", "Shows the skill cooldowns of the bosses, elites and fabled monsters you fight.")
    {
        _settings = new BossSkillsSettings(Settings);
    }

    public override Sprite Icon => Icons.Swords;

    protected internal override void Enable()
    {
        _hud = new HudRoot(_settings, this);
        _discovery = new EnemyDiscovery();
        _scanTimer = 0f;
    }

    protected internal override void Disable()
    {
        _hud?.Dispose();
        _hud = null;
        _discovery = null;
        _enemies.Clear();
    }

    protected internal override void Update()
    {
        if (!GameAccess.InWorld || GameAccess.LocalPlayer == null)
        {
            _hud.SetVisible(false);
            return;
        }

        // Every cooldown and gate deadline is in server time, so without the network manager's
        // offset the panel would show wrong figures. It stays hidden instead.
        var networkManager = GameAccess.NetworkManagerMmo;
        if (networkManager == null)
        {
            if (!_reportedMissingNetworkManager)
            {
                Log.Error("NetworkManager.singleton is not a NetworkManagerMMO, so server time is unknown. The skill panel stays hidden.");
                _reportedMissingNetworkManager = true;
            }
            _hud.SetVisible(false);
            return;
        }

        double now = GameAccess.ServerTime(networkManager);
        _scanTimer += Time.deltaTime;
        if (_scanTimer >= Tuning.ScanIntervalSeconds)
        {
            _scanTimer = 0f;
            bool shouldShow = _discovery.Discover(now, _enemies);
            _hud.Reconcile(_enemies);
            _hud.SetVisible(shouldShow && _enemies.Count > 0);
        }

        _hud.RenderTick(now);
    }

    protected internal override void OnSceneUnloaded(string sceneName)
    {
        if (sceneName == "World") _hud?.SetVisible(false);
    }
}
