using System.Collections.Generic;
using System.Linq;
using BossMod.Core.Alerts;
using BossMod.Core.Catalog;
using BossMod.Core.Effects;
using BossMod.Core.Tracking;
using Xunit;

namespace BossMod.Core.Tests;

public class AlertEngineTests
{
    private const uint NetId = 42;
    private const string Boss = "infernal_skeleton";
    private const string Skill = "inferno_blast";

    private static SkillCatalog MakeCatalog(ThreatTier auto = ThreatTier.High)
    {
        var cat = new SkillCatalog();
        cat.Skills[Skill] = new SkillRecord { Id = Skill, DisplayName = "Inferno Blast" };
        cat.Bosses[Boss] = new BossRecord
        {
            Id = Boss, DisplayName = "Infernal Skeleton",
            Skills = { [Skill] = new BossSkillRecord { AutoThreat = auto } },
        };
        return cat;
    }

    private static BossState State(double now, CastInfo? cast = null, List<SkillCooldown>? cooldowns = null)
    {
        return new BossState
        {
            NetId = NetId, BossId = Boss, DisplayName = "Infernal Skeleton",
            ServerTime = now, ActiveCast = cast,
            Cooldowns = cooldowns ?? new List<SkillCooldown>(),
        };
    }

    [Fact]
    public void CastStart_FiresOnce_WhenActiveCastTransitionsFromNull()
    {
        var engine = new AlertEngine(MakeCatalog(), new TierDefaults());
        var prev = State(now: 100);
        var curr = State(now: 100.05, cast: new CastInfo(1, Skill, "Inferno Blast", 103, 3f));

        var events = engine.Process(prev, curr).ToList();

        var e = Assert.Single(events);
        Assert.Equal(AlertTrigger.CastStart, e.Trigger);
        Assert.Equal(Skill, e.SkillId);
        Assert.Equal(ThreatTier.High, e.EffectiveThreat);
    }

    [Fact]
    public void CastStart_DoesNotFire_OnSubsequentFramesOfSameCast()
    {
        var engine = new AlertEngine(MakeCatalog(), new TierDefaults());
        var s1 = State(now: 100);
        var s2 = State(now: 100.05, cast: new CastInfo(1, Skill, "Inferno Blast", 103, 3f));
        var s3 = State(now: 100.15, cast: new CastInfo(1, Skill, "Inferno Blast", 103, 3f));

        engine.Process(s1, s2).ToList();
        var second = engine.Process(s2, s3).ToList();

        Assert.Empty(second);
    }

    [Fact]
    public void CastFinish_Fires_WhenCastEndsNaturally()
    {
        var engine = new AlertEngine(MakeCatalog(), new TierDefaults());
        // Cast ends at 103; current frame is at 103.1 (past the deadline).
        var prev = State(now: 102.99, cast: new CastInfo(1, Skill, "Inferno Blast", 103, 3f));
        var curr = State(now: 103.1, cast: null);

        var events = engine.Process(prev, curr).ToList();
        var e = Assert.Single(events);
        Assert.Equal(AlertTrigger.CastFinish, e.Trigger);
    }

    [Fact]
    public void CastFinish_DoesNotFire_WhenCastWasCanceled()
    {
        var engine = new AlertEngine(MakeCatalog(), new TierDefaults());
        // Skills.CancelCast sets castTimeEnd into the past; previous frame had a cast
        // with castTimeEnd in the past — that's the cancel signature.
        var prev = State(now: 102, cast: new CastInfo(1, Skill, "Inferno Blast", 100 /* deadline already past */, 3f));
        var curr = State(now: 102.1, cast: null);

        var events = engine.Process(prev, curr).ToList();
        Assert.Empty(events);
    }

    [Fact]
    public void CooldownReady_Fires_OnFirstFramePastDeadline()
    {
        var engine = new AlertEngine(MakeCatalog(), new TierDefaults());
        var prev = State(now: 99.9,  cooldowns: new() { new SkillCooldown(1, Skill, "Inferno Blast", 100, 12f) });
        var curr = State(now: 100.1, cooldowns: new() { new SkillCooldown(1, Skill, "Inferno Blast", 100, 12f) });

        var events = engine.Process(prev, curr).ToList();
        var e = Assert.Single(events);
        Assert.Equal(AlertTrigger.CooldownReady, e.Trigger);
    }

    [Fact]
    public void CooldownReady_FiresOnce_PerCooldownInstance()
    {
        var engine = new AlertEngine(MakeCatalog(), new TierDefaults());
        var s1 = State(now: 99.9,  cooldowns: new() { new SkillCooldown(1, Skill, "Inferno Blast", 100, 12f) });
        var s2 = State(now: 100.1, cooldowns: new() { new SkillCooldown(1, Skill, "Inferno Blast", 100, 12f) });
        var s3 = State(now: 100.2, cooldowns: new() { new SkillCooldown(1, Skill, "Inferno Blast", 100, 12f) });

        engine.Process(s1, s2).ToList();
        var second = engine.Process(s2, s3).ToList();

        Assert.Empty(second);
    }

    [Fact]
    public void CooldownReady_FiresAgain_AfterNewCooldownCycle()
    {
        var engine = new AlertEngine(MakeCatalog(), new TierDefaults());
        var s1 = State(now: 99.9,  cooldowns: new() { new SkillCooldown(1, Skill, "Inferno Blast", 100, 12f) });
        var s2 = State(now: 100.1, cooldowns: new() { new SkillCooldown(1, Skill, "Inferno Blast", 100, 12f) });
        // Boss recasts, cooldown deadline moves forward.
        var s3 = State(now: 110.0, cooldowns: new() { new SkillCooldown(1, Skill, "Inferno Blast", 122, 12f) });
        var s4 = State(now: 122.5, cooldowns: new() { new SkillCooldown(1, Skill, "Inferno Blast", 122, 12f) });

        engine.Process(s1, s2).ToList();
        engine.Process(s2, s3).ToList();
        var ready2 = engine.Process(s3, s4).ToList();

        var e = Assert.Single(ready2);
        Assert.Equal(AlertTrigger.CooldownReady, e.Trigger);
    }

    [Fact]
    public void Resolved_SoundAndTextAreBakedIntoEvent()
    {
        var cat = MakeCatalog();
        cat.Bosses[Boss].Skills[Skill].Sound = "klaxon";
        cat.Bosses[Boss].Skills[Skill].AlertText = "RUN";

        var engine = new AlertEngine(cat, new TierDefaults());
        var prev = State(now: 100);
        var curr = State(now: 100.05, cast: new CastInfo(1, Skill, "Inferno Blast", 103, 3f));

        var e = Assert.Single(engine.Process(prev, curr).ToList());
        Assert.Equal("klaxon", e.EffectiveSound);
        Assert.Equal("RUN", e.EffectiveAlertText);
    }

    [Fact]
    public void UnknownSkill_DoesNotEmit()
    {
        // BossState refers to a skill not in the catalog; engine drops it silently.
        var engine = new AlertEngine(new SkillCatalog(), new TierDefaults());
        var prev = State(now: 100);
        var curr = State(now: 100.05, cast: new CastInfo(1, "unknown_skill", "Unknown", 103, 3f));

        Assert.Empty(engine.Process(prev, curr).ToList());
    }

    [Fact]
    public void MutedSkill_StillEmitsEvent_WithMutedFlagTrue()
    {
        // Engine emits regardless; consumer (audio) is what mutes.
        var cat = MakeCatalog();
        cat.Skills[Skill].Muted = true;

        var engine = new AlertEngine(cat, new TierDefaults());
        var prev = State(now: 100);
        var curr = State(now: 100.05, cast: new CastInfo(1, Skill, "Inferno Blast", 103, 3f));

        var e = Assert.Single(engine.Process(prev, curr).ToList());
        Assert.True(e.Muted);
    }
}
