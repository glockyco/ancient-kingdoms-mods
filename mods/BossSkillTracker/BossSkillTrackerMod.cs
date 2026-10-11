using System.Collections.Generic;
using BossSkillTracker.Game;
using BossSkillTracker.Model;
using BossSkillTracker.Ui;
using MelonLoader;
using UnityEngine;

[assembly: MelonInfo(typeof(BossSkillTracker.BossSkillTrackerMod), "BossSkillTracker", "0.1.0", "AncientKingdomsMods")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace BossSkillTracker;

public sealed class BossSkillTrackerMod : MelonMod
{
    private Config _config;
    private HudRoot _hud;
    private EnemyDiscovery _discovery;
    private readonly List<EnemyInfo> _enemies = new();
    private float _scanTimer;
    private bool _reportedMissingNetworkManager;

    public override void OnInitializeMelon()
    {
        _config = new Config();
        _hud = new HudRoot(_config);
        _discovery = new EnemyDiscovery();
        LoggerInstance.Msg("BossSkillTracker initialized");
    }

    public override void OnUpdate()
    {
        if (!GameAccess.InWorld || GameAccess.LocalPlayer == null)
        {
            _hud.SetVisible(false);
            return;
        }

        // Every cooldown and gate deadline is in server time, so without the network manager's
        // offset the panel would show wrong figures; it stays hidden instead.
        var networkManager = GameAccess.NetworkManagerMmo;
        if (networkManager == null)
        {
            if (!_reportedMissingNetworkManager)
            {
                LoggerInstance.Error("NetworkManager.singleton is not a NetworkManagerMMO, so server time is unknown. The panel stays hidden.");
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

    public override void OnDeinitializeMelon() => _hud?.Dispose();

    public override void OnSceneWasUnloaded(int buildIndex, string sceneName)
    {
        if (sceneName == "World") _hud?.SetVisible(false);
    }
}
