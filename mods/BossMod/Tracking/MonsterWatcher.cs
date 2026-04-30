using System;
using System.Collections.Generic;
using System.Linq;
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
/// The watcher only snapshots observable boss state. Runtime UI and core policy
/// decide how to display those snapshots.
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

    private readonly Dictionary<uint, double> _engagementStartByNetId = new();
    private readonly Dictionary<uint, double> _lastNonDefaultAbilityByNetId = new();
    private readonly Dictionary<uint, int> _lastCurrentSkillByNetId = new();
    private readonly Dictionary<uint, double> _lastCurrentSkillCastEndByNetId = new();
    private readonly List<BossState> _currentSnapshots = new();
    public IReadOnlyList<BossState> CurrentSnapshots => _currentSnapshots;
    public bool SceneGenerationChanged { get; private set; }

    public MonsterWatcher(MelonLogger.Instance log, SkillCatalog catalog, Globals globals)
    {
        _log = log;
        _catalog = catalog;
        _globals = globals;
    }

    /// <summary>Call from MelonMod.OnUpdate. No-ops outside the World scene.</summary>
    public bool Tick()
    {
        SceneGenerationChanged = false;
        var sceneName = SceneManager.GetActiveScene().name;
        if (sceneName != "World")
        {
            if (_lastSceneName == "World")
            {
                _cachedMonsters = null;
                _currentSnapshots.Clear();
                ClearObservationDictionaries();
            }
            _lastSceneName = sceneName;
            return false;
        }

        var localPlayer = Player.localPlayer;
        if (localPlayer == null)
        {
            _currentSnapshots.Clear();
            ClearObservationDictionaries();
            return false;
        }

        var pos = localPlayer.transform.position;
        bool teleported = Vector3.Distance(pos, _lastPlayerPosition) > TeleportThreshold;
        if (_cachedMonsters == null || sceneName != _lastSceneName || teleported)
        {
            SceneGenerationChanged = _cachedMonsters != null;
            _cachedMonsters = UnityEngine.Object.FindObjectsOfType(Il2CppType.Of<Monster>());
            _lastSceneName = sceneName;
            _lastPlayerPosition = pos;
        }

        var serverTime = ComputeServerTime();
        _currentSnapshots.Clear();
        var seenNetIds = new HashSet<uint>();
        bool catalogChanged = false;

        foreach (var obj in _cachedMonsters)
        {
            var monster = obj.Cast<Monster>();
            if (monster == null || (!monster.isBoss && !monster.isElite)) continue;
            if (monster.health == null || monster.health.current <= 0) continue;

            catalogChanged |= HarvestCatalog(monster);

            var facts = Activation.Evaluate(monster, localPlayer, _globals.ProximityRadius);
            var state = BuildState(monster, localPlayer, serverTime, facts);
            seenNetIds.Add(state.NetId);
            _currentSnapshots.Add(state);
        }

        PruneObservationDictionaries(seenNetIds);
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
            if (!skillExists || existingSkill.DisplayName != skillDisplay)
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

            var autoThreat = ThreatClassifier.Classify(rawSnapshot, effectiveSnapshot, _globals.Thresholds);
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

    private BossState BuildState(Monster monster, Player localPlayer, double serverTime, Activation.ActivationFacts facts)
    {
        var monsterPosition = monster.transform.position;
        var playerPosition = localPlayer.transform.position;
        var s = new BossState
        {
            NetId = monster.netId,
            BossId = SanitizeName(monster.name),
            DisplayName = string.IsNullOrEmpty(monster.nameEntity) ? monster.name : monster.nameEntity,
            Level = monster.level != null ? monster.level.current : 1,
            Kind = monster.isFabled ? BossKind.Fabled : monster.isBoss ? BossKind.Boss : BossKind.Elite,
            PositionX = monsterPosition.x,
            PositionY = monsterPosition.y,
            DistanceToPlayer = Vector2.Distance(
                new Vector2(monsterPosition.x, monsterPosition.y),
                new Vector2(playerPosition.x, playerPosition.y)),
            IsTargeted = facts.IsTargeted,
            IsEngaged = facts.IsEngaged,
            IsProximate = facts.IsProximate,
            IsActive = facts.IsActive,
            HealthCurrent = monster.health != null ? monster.health.current : 0,
            HealthMax = monster.health != null ? monster.health.max : 0,
            ServerTime = serverTime,
        };

        if (facts.IsEngaged)
        {
            if (!_engagementStartByNetId.ContainsKey(monster.netId))
                _engagementStartByNetId[monster.netId] = serverTime;
        }
        else
        {
            ClearObservation(monster.netId);
        }

        var skills = monster.skills;
        var skillsList = skills?.skills;
        if (skills == null || skillsList == null) return s;

        if (facts.IsEngaged)
            TrackCurrentSkill(monster, skills.currentSkill, monster.state == "CASTING", skills.currentSkill > 0 && skills.currentSkill < skillsList.Count ? skillsList[skills.currentSkill].castTimeEnd : 0, skillsList.Count, serverTime);

        var inputs = new List<BossAbilityInput>();
        for (int i = 0; i < skillsList.Count; i++)
        {
            var sk = skillsList[i];
            var data = sk.data;
            if (data == null || string.IsNullOrEmpty(data.name)) continue;

            var snapshot = SkillSnapshotBuilder.Build(sk);
            bool isCurrent = skills.currentSkill == i && monster.state == "CASTING";
            bool isReady = sk.castTimeEnd <= serverTime && sk.cooldownEnd <= serverTime;
            bool combatTargetAvailable = monster.Networktarget != null && monster.Networktarget.health != null && monster.Networktarget.health.current > 0;
            bool hasTarget = HasRequiredTarget(snapshot.SkillClass, combatTargetAvailable);
            float targetDistance = TargetDistance(monster);
            float castRange = CastRange(sk);
            bool targetInRange = TargetInRange(targetDistance, castRange);


            inputs.Add(new BossAbilityInput(
                SkillIndex: i,
                SkillId: data.name,
                DisplayName: string.IsNullOrEmpty(data.nameSkill) ? data.name : data.nameSkill,
                SkillClass: snapshot.SkillClass,
                CastTimeEnd: sk.castTimeEnd,
                TotalCastTime: EffectiveValues.CastTimeEffective(sk.castTime, data.isSpell, skills.GetSpellHasteBonus()),
                CooldownEnd: sk.cooldownEnd,
                TotalCooldown: sk.cooldown,
                IsCurrent: isCurrent,
                IsReady: isReady,
                IsAura: IsAura(data),
                HasTarget: hasTarget,
                TargetInRange: targetInRange,
                TargetDistance: targetDistance,
                CastRange: castRange,
                AreaTargetCount: EstimateAreaTargetCount(monster, sk),
                BossHealthPercent: monster.health == null || monster.health.max <= 0 ? 0f : monster.health.current / (float)monster.health.max,
                ActiveSummonCount: ActiveSummonCount(monster),
                MaxActiveSummons: MaxActiveSummons(data),
                InputsComplete: true));
        }

        s.IsChasingTarget = IsSelectedSpecialOutOfRange(inputs, skills.currentSkill);

        var preliminary = BossAbilityEstimator.Evaluate(new BossAbilityEvaluationInput(
            inputs,
            BossSpecialTimingState.Unknown("Special timing starts on engagement"),
            s.IsChasingTarget));
        var timing = BossSpecialTimingEstimator.Estimate(
            serverTime,
            _engagementStartByNetId.TryGetValue(monster.netId, out var start) ? start : null,
            _lastNonDefaultAbilityByNetId.TryGetValue(monster.netId, out var lastSpecial) ? lastSpecial : null,
            anySpecialIndividuallyReady: preliminary.Abilities.Any(ability => ability.Role == BossAbilityRole.Special && ability.Eligibility == AbilityEligibilityKind.Eligible),
            nextIndividualReadyInSeconds: NextSpecialCooldown(preliminary.Abilities, serverTime));

        var evaluated = BossAbilityEstimator.Evaluate(new BossAbilityEvaluationInput(inputs, timing, s.IsChasingTarget));
        s.Abilities.AddRange(evaluated.Abilities);
        s.SpecialTiming = evaluated.SpecialTiming;
        return s;
    }

    private void TrackCurrentSkill(Monster monster, int currentSkill, bool isCasting, double castTimeEnd, int skillCount, double serverTime)
    {
        if (!isCasting || currentSkill <= 0 || currentSkill >= skillCount)
        {
            _lastCurrentSkillByNetId[monster.netId] = -1;
            _lastCurrentSkillCastEndByNetId[monster.netId] = 0;
            return;
        }

        bool sameSkill = _lastCurrentSkillByNetId.TryGetValue(monster.netId, out var lastCurrent) && lastCurrent == currentSkill;
        bool sameCast = _lastCurrentSkillCastEndByNetId.TryGetValue(monster.netId, out var lastCastTimeEnd) && Math.Abs(lastCastTimeEnd - castTimeEnd) < 0.001;
        if (sameSkill && sameCast) return;

        _lastCurrentSkillByNetId[monster.netId] = currentSkill;
        _lastCurrentSkillCastEndByNetId[monster.netId] = castTimeEnd;
        _lastNonDefaultAbilityByNetId[monster.netId] = serverTime;
    }

    private static bool IsAura(ScriptableSkill skill) =>
        skill.TryCast<AreaBuffSkill>() is { } areaBuff && areaBuff.isAura ||
        skill.TryCast<AreaDebuffSkill>() is { } areaDebuff && areaDebuff.isAura;

    private static bool HasRequiredTarget(string skillClass, bool combatTargetAvailable) =>
        !RequiresCombatTarget(skillClass) || combatTargetAvailable;

    private static bool RequiresCombatTarget(string skillClass) =>
        skillClass is "TargetDamageSkill" or "TargetDebuffSkill" or "TargetProjectileSkill" or "FrontalDamageSkill";

    private static float TargetDistance(Monster monster)
    {
        if (monster.Networktarget == null) return float.PositiveInfinity;
        var targetPosition = monster.Networktarget.transform.position;
        var monsterPosition = monster.transform.position;
        return Vector2.Distance(
            new Vector2(targetPosition.x, targetPosition.y),
            new Vector2(monsterPosition.x, monsterPosition.y));
    }

    private static float CastRange(Skill skill) =>
        skill.data != null ? skill.data.castRange.Get(skill.level) : 0f;

    private static bool TargetInRange(float targetDistance, float castRange)
    {
        if (float.IsPositiveInfinity(targetDistance)) return false;
        if (castRange <= 0f) return true;
        return targetDistance <= castRange + 0.2f;
    }

    private static int EstimateAreaTargetCount(Monster monster, Skill skill)
    {
        if (skill.data == null) return 0;
        if (skill.data.TryCast<AreaDamageSkill>() == null && skill.data.TryCast<AreaDebuffSkill>() == null) return 0;

        float radius = skill.data.castRange.Get(skill.level);
        var hits = Physics2D.OverlapCircleAll(monster.transform.position, radius);
        int count = 0;
        for (int i = 0; i < hits.Length; i++)
        {
            var entity = hits[i].GetComponentInParent<Entity>();
            if (entity == null || entity.IsHidden() || entity.health == null || entity.health.current <= 0) continue;
            if (!monster.CanAttack(entity)) continue;
            count++;
            if (count >= 10) break;
        }

        return count;
    }

    private static int ActiveSummonCount(Monster monster) =>
        monster.listPets != null ? monster.listPets.Count : 0;

    private static int MaxActiveSummons(ScriptableSkill skill) =>
        skill.TryCast<SummonSkillMonsters>() is { } summon ? summon.maxActivePets : 0;

    private static bool IsRollableSpecialInput(BossAbilityInput input) =>
        input.SkillIndex > 0 &&
        !input.IsAura &&
        !input.SkillClass.Contains("Passive", StringComparison.OrdinalIgnoreCase);

    private static bool IsSelectedSpecialOutOfRange(IReadOnlyList<BossAbilityInput> inputs, int currentSkill)
    {
        if (currentSkill <= 0) return false;
        return inputs.Any(input =>
            input.SkillIndex == currentSkill &&
            IsRollableSpecialInput(input) &&
            RequiresCombatTarget(input.SkillClass) &&
            input.HasTarget &&
            !input.TargetInRange);
    }


    private static double? NextSpecialCooldown(IReadOnlyList<BossAbilityState> abilities, double serverTime)
    {
        double? next = null;
        for (int i = 0; i < abilities.Count; i++)
        {
            var ability = abilities[i];
            if (ability.Role != BossAbilityRole.Special || ability.Eligibility != AbilityEligibilityKind.OnCooldown) continue;
            double remaining = Math.Max(0, ability.CooldownEnd - serverTime);
            if (!next.HasValue || remaining < next.Value) next = remaining;
        }
        return next;
    }

    private void ClearObservation(uint netId)
    {
        _engagementStartByNetId.Remove(netId);
        _lastNonDefaultAbilityByNetId.Remove(netId);
        _lastCurrentSkillByNetId.Remove(netId);
        _lastCurrentSkillCastEndByNetId.Remove(netId);
    }

    private void ClearObservationDictionaries()
    {
        _engagementStartByNetId.Clear();
        _lastNonDefaultAbilityByNetId.Clear();
        _lastCurrentSkillByNetId.Clear();
        _lastCurrentSkillCastEndByNetId.Clear();
    }

    private void PruneObservationDictionaries(HashSet<uint> seenNetIds)
    {
        Prune(_engagementStartByNetId, seenNetIds);
        Prune(_lastNonDefaultAbilityByNetId, seenNetIds);
        Prune(_lastCurrentSkillByNetId, seenNetIds);
        Prune(_lastCurrentSkillCastEndByNetId, seenNetIds);
    }

    private static void Prune<T>(Dictionary<uint, T> dictionary, HashSet<uint> seenNetIds)
    {
        if (dictionary.Count == seenNetIds.Count) return;
        var remove = new List<uint>();
        foreach (var netId in dictionary.Keys)
        {
            if (!seenNetIds.Contains(netId)) remove.Add(netId);
        }
        for (int i = 0; i < remove.Count; i++) dictionary.Remove(remove[i]);
    }

    private static double ComputeServerTime()
    {
        var nm = UnityEngine.Object.FindObjectOfType(Il2CppType.Of<NetworkManagerMMO>());
        if (nm == null) return 0;
        var manager = nm.Cast<NetworkManagerMMO>();
        return Il2CppMirror.NetworkTime.time + manager.offsetNetworkTime;
    }

    private static string SanitizeName(string raw) => raw.Replace("(Clone)", "").Trim();
}
