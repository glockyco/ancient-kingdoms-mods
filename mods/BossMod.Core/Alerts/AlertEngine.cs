using System.Collections.Generic;
using BossMod.Core.Catalog;
using BossMod.Core.Effects;
using BossMod.Core.Tracking;

namespace BossMod.Core.Alerts;

/// <summary>
/// Stateful: remembers per-(netId, skillIdx) the last castTimeEnd / cooldownEnd
/// it fired for, so subsequent observations of the same instance dedupe.
/// </summary>
public sealed class AlertEngine
{
    private readonly SkillCatalog _catalog;
    private readonly TierDefaults _defaults;

    private readonly Dictionary<(uint, int), double> _firedCastEnds = new();
    private readonly Dictionary<(uint, int), double> _firedCooldownEnds = new();

    public AlertEngine(SkillCatalog catalog, TierDefaults defaults)
    {
        _catalog = catalog;
        _defaults = defaults;
    }

    public void Reset()
    {
        _firedCastEnds.Clear();
        _firedCooldownEnds.Clear();
    }

    public IEnumerable<AlertEvent> Process(BossState prev, BossState curr)
    {
        if (!curr.IsActive) yield break;

        // CastStart: prev has no cast, curr has one.
        if (prev.ActiveCast == null && curr.ActiveCast is { } start)
        {
            var key = (curr.NetId, start.SkillIdx);
            if (!_firedCastEnds.TryGetValue(key, out var last) || last != start.CastTimeEnd)
            {
                _firedCastEnds[key] = start.CastTimeEnd;
                if (TryBuild(curr, start.SkillId, start.DisplayName, AlertTrigger.CastStart, out var ev))
                    yield return ev;
            }
        }

        // CastFinish vs Cancel:
        //   StartCast    sets castTimeEnd = serverTime + castTime
        //   CancelCast   sets castTimeEnd = serverTime - castTime (~castTime in the past)
        // Natural completion: serverTime - castTimeEnd ≈ 0 at transition.
        // Cancel:            serverTime - castTimeEnd ≈ castTime at transition.
        // Use half the cast duration as the bright-line threshold.
        if (prev.ActiveCast is { } finishing && curr.ActiveCast == null)
        {
            double gap = prev.ServerTime - finishing.CastTimeEnd;
            bool natural = gap < finishing.TotalCastTime / 2.0;
            if (natural)
            {
                if (TryBuild(curr, finishing.SkillId, finishing.DisplayName, AlertTrigger.CastFinish, out var ev))
                    yield return ev;
            }
        }

        // CooldownReady: per-skill index, transition from cooldownEnd > prev.ServerTime
        // to <= curr.ServerTime, but only when the cooldownEnd value itself didn't
        // change (otherwise the boss recast and started a new cycle).
        var prevCooldowns = ToDict(prev.Cooldowns);
        foreach (var c in curr.Cooldowns)
        {
            if (!prevCooldowns.TryGetValue(c.SkillIdx, out var prevC)) continue;
            if (prevC.CooldownEnd != c.CooldownEnd) continue;

            bool wasOnCd = prevC.CooldownEnd > prev.ServerTime;
            bool isReady = c.CooldownEnd <= curr.ServerTime;
            if (!wasOnCd || !isReady) continue;

            var key = (curr.NetId, c.SkillIdx);
            if (_firedCooldownEnds.TryGetValue(key, out var last) && last == c.CooldownEnd) continue;
            _firedCooldownEnds[key] = c.CooldownEnd;

            if (TryBuild(curr, c.SkillId, c.DisplayName, AlertTrigger.CooldownReady, out var ev))
                yield return ev;
        }
    }

    private static Dictionary<int, SkillCooldown> ToDict(List<SkillCooldown> cds)
    {
        var d = new Dictionary<int, SkillCooldown>(cds.Count);
        foreach (var c in cds) d[c.SkillIdx] = c;
        return d;
    }

    private bool TryBuild(BossState curr, string skillId, string skillDisplay, AlertTrigger trigger, out AlertEvent ev)
    {
        ev = default;
        if (!_catalog.Skills.TryGetValue(skillId, out var skillRec)) return false;
        if (!_catalog.Bosses.TryGetValue(curr.BossId, out var bossRec)) return false;
        if (!bossRec.Skills.TryGetValue(skillId, out var bossSkillRec)) return false;

        var fireOn = SettingsResolver.ResolveFireOn(skillRec, bossSkillRec);
        if (trigger != fireOn) return false;

        var threat = SettingsResolver.ResolveThreat(skillRec, bossSkillRec);
        var sound = SettingsResolver.ResolveSound(skillRec, bossSkillRec, _defaults);
        var text = SettingsResolver.ResolveAlertText(skillRec, bossSkillRec, skillDisplay);
        var audioMuted = SettingsResolver.ResolveAudioMuted(skillRec, bossSkillRec);

        ev = new AlertEvent(
            trigger,
            curr.NetId,
            curr.BossId, curr.DisplayName,
            skillId, skillDisplay,
            threat, sound, text, audioMuted,
            curr.ServerTime);
        return true;
    }
}
