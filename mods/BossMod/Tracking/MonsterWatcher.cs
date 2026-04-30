using System.Collections.Generic;
using BossMod.Core.Catalog;
using BossMod.Core.Effects;
using BossMod.Core.Persistence;
using BossMod.Core.Tracking;
using Il2Cpp;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace BossMod.Tracking;

/// <summary>
/// Scans the World scene for Monster instances every frame.
/// Produces per-monster BossState snapshots and harvests catalog entries
/// for any unseen ScriptableSkill or Boss.
///
/// The watcher does not itself drive alerts — BossMod.cs (plan 4) wires the
/// watcher's output into AlertEngine.Process with the previous frame's state.
/// </summary>
public sealed class MonsterWatcher
{
    private readonly MelonLogger.Instance _log;
    private readonly SkillCatalog _catalog;
    private readonly Globals _globals;

    private Il2CppSystem.Object[] _cachedMonsters;
    private string _lastSceneName = "";
    private Vector3 _lastPlayerPosition = Vector3.zero;
    private const float TeleportThreshold = 50f;

    private readonly List<BossState> _currentSnapshots = new();
    public IReadOnlyList<BossState> CurrentSnapshots => _currentSnapshots;

    public MonsterWatcher(MelonLogger.Instance log, SkillCatalog catalog, Globals globals)
    {
        _log = log;
        _catalog = catalog;
        _globals = globals;
    }

    /// <summary>Call from MelonMod.OnUpdate. No-ops outside the World scene.</summary>
    public bool Tick()
    {
        var sceneName = SceneManager.GetActiveScene().name;
        if (sceneName != "World")
        {
            if (_lastSceneName == "World")
            {
                _cachedMonsters = null;
                _currentSnapshots.Clear();
            }
            _lastSceneName = sceneName;
            return false;
        }

        var localPlayer = Player.localPlayer;
        if (localPlayer == null) return false;

        // Refresh cache on scene change or teleport (BossTracker pattern).
        var pos = localPlayer.transform.position;
        bool teleported = Vector3.Distance(pos, _lastPlayerPosition) > TeleportThreshold;
        if (_cachedMonsters == null || sceneName != _lastSceneName || teleported)
        {
            _cachedMonsters = Object.FindObjectsOfType(Il2CppType.Of<Monster>());
            _lastSceneName = sceneName;
            _lastPlayerPosition = pos;
        }

        var serverTime = ComputeServerTime();
        _currentSnapshots.Clear();
        bool catalogChanged = false;


        foreach (var obj in _cachedMonsters)
        {
            var monster = obj.Cast<Monster>();
            if (monster == null || (!monster.isBoss && !monster.isElite)) continue;
            if (monster.health == null || monster.health.current <= 0) continue;

            catalogChanged |= HarvestCatalog(monster);

            var state = BuildState(monster, serverTime);
            state.IsActive = Activation.IsActive(monster, localPlayer, _globals.ProximityRadius);
            _currentSnapshots.Add(state);
        }

        return catalogChanged;
    }

    private bool HarvestCatalog(Monster monster)
    {
        bool changed = false;
        var bossId = SanitizeName(monster.name);
        var displayName = string.IsNullOrEmpty(monster.nameEntity) ? bossId : monster.nameEntity;
        var type = monster.typeMonster ?? "";
        var className = monster.classMonster ?? "";
        var zone = monster.zoneMonster ?? "";
        var kind = monster.isFabled ? BossKind.Fabled
                 : monster.isBoss   ? BossKind.Boss
                                    : BossKind.Elite;
        var level = monster.level != null ? monster.level.current : 1;

        bool bossExists = _catalog.Bosses.TryGetValue(bossId, out var existingBoss);
        if (!bossExists ||
            existingBoss.DisplayName != displayName ||
            existingBoss.Type != type ||
            existingBoss.Class != className ||
            existingBoss.ZoneBestiary != zone ||
            existingBoss.Kind != kind ||
            existingBoss.LastSeenLevel != level)
        {
            changed = true;
        }

        var bossRec = _catalog.GetOrCreateBoss(
            bossId, displayName,
            type, className, zone, kind, level);

        // Iterate the live Skill list (carries .level), not skillTemplates which
        // are bare ScriptableSkill assets and don't tell us the boss's per-instance
        // skill level.
        if (monster.skills == null) return changed;
        var skillsList = monster.skills.skills;
        if (skillsList == null) return changed;

        for (int i = 0; i < skillsList.Count; i++)
        {
            var sk = skillsList[i];
            var data = sk.data;
            if (data == null || string.IsNullOrEmpty(data.name)) continue;

            var skillId = data.name;
            var skillDisplay = string.IsNullOrEmpty(data.nameSkill) ? skillId : data.nameSkill;
            bool skillExists = _catalog.Skills.TryGetValue(skillId, out var existingSkill);
            if (!skillExists ||
                existingSkill.DisplayName != skillDisplay ||
                existingSkill.LastSeenInBoss != bossId)
            {
                changed = true;
            }

            var skillRec = _catalog.GetOrCreateSkill(skillId, skillDisplay, bossId);

            var rawSnapshot = SkillSnapshotBuilder.Build(sk);
            if (!SkillSnapshotsEqual(skillRec.RawSnapshot, rawSnapshot))
            {
                skillRec.RawSnapshot = rawSnapshot;
                changed = true;
            }

            bool bossSkillExists = bossRec.Skills.ContainsKey(skillId);
            if (!bossSkillExists) changed = true;

            var bossSkillRec = _catalog.GetOrCreateBossSkill(bossRec, skillId);
            var effectiveSnapshot = EffectiveSnapshotBuilder.Build(sk, monster);
            if (!BossSkillSnapshotsEqual(bossSkillRec.EffectiveSnapshot, effectiveSnapshot))
            {
                bossSkillRec.EffectiveSnapshot = effectiveSnapshot;
                changed = true;
            }

            var autoThreat = ThreatClassifier.Classify(
                rawSnapshot, effectiveSnapshot, _globals.Thresholds);
            if (bossSkillRec.AutoThreat != autoThreat)
            {
                bossSkillRec.AutoThreat = autoThreat;
                changed = true;
            }
        }

        return changed;
    }

    private static bool SkillSnapshotsEqual(SkillSnapshot a, SkillSnapshot b) =>
        a.SkillClass == b.SkillClass &&
        a.IsSpell == b.IsSpell &&
        a.IsAura == b.IsAura &&
        a.CastTime == b.CastTime &&
        a.Cooldown == b.Cooldown &&
        a.CastRange == b.CastRange &&
        a.RawDamage == b.RawDamage &&
        a.RawMagicDamage == b.RawMagicDamage &&
        a.DamagePercent == b.DamagePercent &&
        a.DamageType == b.DamageType &&
        a.AoeRadius == b.AoeRadius &&
        a.AoeDelay == b.AoeDelay &&
        a.Debuffs == b.Debuffs &&
        a.StunChance == b.StunChance &&
        a.StunTime == b.StunTime &&
        a.FearChance == b.FearChance &&
        a.FearTime == b.FearTime;

    private static bool BossSkillSnapshotsEqual(BossSkillSnapshot a, BossSkillSnapshot b) =>
        a.OutgoingDamage == b.OutgoingDamage &&
        a.OutgoingDamageMin == b.OutgoingDamageMin &&
        a.OutgoingDamageMax == b.OutgoingDamageMax &&
        a.AuraDpsApprox == b.AuraDpsApprox &&
        a.CastTimeEffective == b.CastTimeEffective &&
        a.CooldownEffective == b.CooldownEffective;

    private static BossState BuildState(Monster monster, double serverTime)
    {
        var s = new BossState
        {
            NetId = monster.netId,
            BossId = SanitizeName(monster.name),
            DisplayName = string.IsNullOrEmpty(monster.nameEntity) ? monster.name : monster.nameEntity,
            Level = monster.level != null ? monster.level.current : 1,
            Kind = monster.isFabled ? BossKind.Fabled : monster.isBoss ? BossKind.Boss : BossKind.Elite,
            PositionX = monster.transform.position.x,
            PositionY = monster.transform.position.y,
            HealthCurrent = monster.health != null ? monster.health.current : 0,
            HealthMax     = monster.health != null ? monster.health.max     : 0,
            ServerTime = serverTime,
        };

        var skills = monster.skills;

        // Active cast — only when state == "CASTING" and currentSkill > 0.
        if (skills != null && monster.state == "CASTING" && skills.currentSkill > 0)
        {
            int idx = skills.currentSkill;
            var skillsList = skills.skills;
            if (skillsList != null && idx < skillsList.Count)
            {
                var skill = skillsList[idx];
                var data = skill.data;
                if (data != null)
                {
                    var effectiveCast = EffectiveValues.CastTimeEffective(
                        skill.castTime, data.isSpell, skills.GetSpellHasteBonus());
                    s.ActiveCast = new CastInfo(
                        SkillIdx: idx,
                        SkillId: data.name,
                        DisplayName: string.IsNullOrEmpty(data.nameSkill) ? data.name : data.nameSkill,
                        CastTimeEnd: skill.castTimeEnd,
                        TotalCastTime: effectiveCast);
                }
            }
        }

        // Cooldowns — every special skill (idx >= 1).
        if (skills != null && skills.skills != null)
        {
            var skillsList = skills.skills;
            for (int i = 1; i < skillsList.Count; i++)
            {
                var sk = skillsList[i];
                var d = sk.data;
                if (d == null) continue;
                // Server uses RAW cooldown for monster special skills (no haste applied
                // by Skills.FinishCast lines 767-772). Use sk.cooldown directly as the
                // progress-bar denominator.
                s.Cooldowns.Add(new SkillCooldown(
                    SkillIdx: i,
                    SkillId: d.name,
                    DisplayName: string.IsNullOrEmpty(d.nameSkill) ? d.name : d.nameSkill,
                    CooldownEnd: sk.cooldownEnd,
                    TotalCooldown: sk.cooldown));
            }

            // Buffs / auras / debuffs on the monster itself.
            var buffsList = skills.buffs;
            if (buffsList != null)
            {
                for (int i = 0; i < buffsList.Count; i++)
                {
                    var b = buffsList[i];
                    var d = b.data;
                    if (d == null) continue;
                    bool isAura = d.TryCast<AreaBuffSkill>() is { } ab && ab.isAura;
                    bool isDebuff = d.TryCast<AreaDebuffSkill>()   != null
                                 || d.TryCast<TargetDebuffSkill>() != null;
                    s.Buffs.Add(new BuffSnapshot(
                        SkillId: d.name,
                        DisplayName: string.IsNullOrEmpty(d.nameSkill) ? d.name : d.nameSkill,
                        BuffTimeEnd: b.buffTimeEnd,
                        TotalBuffTime: b.buffTime,
                        IsAura: isAura,
                        IsDebuff: isDebuff));
                }
            }
        }

        return s;
    }

    private static double ComputeServerTime()
    {
        var nm = Object.FindObjectOfType(Il2CppType.Of<NetworkManagerMMO>());
        if (nm == null) return 0;
        var manager = nm.Cast<NetworkManagerMMO>();
        return Il2CppMirror.NetworkTime.time + manager.offsetNetworkTime;
    }

    private static string SanitizeName(string raw) => raw.Replace("(Clone)", "").Trim();
}
