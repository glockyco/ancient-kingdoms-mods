using System.Linq;
using PocketCompendium.Features.BestiaryPages.Model;
using Xunit;

namespace PocketCompendium.Tests.BestiaryPages;

public class SkillCardDetailsTests
{
    private static MonsterSkillFacts Skill(string monster, string skill)
    {
        var c = SkillEffectFormatterTests.LoadCases().Single(c => c.monster_id == monster && c.skill_id == skill);
        return new MonsterSkillFacts(c.input, c.delivery!);
    }

    [Fact]
    public void DragonIceBreathMatchesTheApprovedHover()
    {
        Assert.Equal(
            "<b>Dragon Ice Breath</b>\nHits everyone in a 5 yd square in front of Nyxarion.\n\n"
            + "Skill Damage: 4,650 cold. Each point of your Cold Resist removes 0.05% of it, up to 90%, and adds 0.05% to your chance to resist it outright.\n\n"
            + "Stun: 75% chance for 1.5 s. A feared target cannot be stunned, and a shorter stun cannot shorten an existing stun. Stuns dismount you.\n\n"
            + "The cast bar shows while Nyxarion is your target.",
            SkillCardDetails.Hover(Skill("nyxarion", "dragon_ice_breath"), "Dragon Ice Breath", "Nyxarion"));
    }

    [Fact]
    public void SummonPlayerMatchesTheApprovedHover()
    {
        Assert.Equal(
            "<b>Summon Player</b>\nSummons Nyxarion's target from 3 to 15 yd away and stuns it for 2 s. The 0.1 s cast is too short for a cast bar. Nyxarion cannot summon a target within 3 yd.",
            SkillCardDetails.Hover(Skill("nyxarion", "summon_player"), "Summon Player", "Nyxarion"));
    }

    [Fact]
    public void EveryMonsterSkillProducesPlainCompleteHoverText()
    {
        var cases = SkillEffectFormatterTests.LoadCases().Where(c => c.monster_id != null).ToArray();
        Assert.NotEmpty(cases);
        foreach (var c in cases)
        {
            var text = SkillCardDetails.Hover(new MonsterSkillFacts(c.input, c.delivery!), c.skill_id, c.monster_id!);
            Assert.StartsWith("<b>", text);
            Assert.DoesNotContain("{", text);
            Assert.DoesNotContain(";", text);
            Assert.DoesNotContain("  ", text);
            Assert.DoesNotContain("dmg", text);
            Assert.DoesNotContain("lvl", text);
            Assert.DoesNotContain('\u2013', text);
            Assert.DoesNotContain('\u2014', text);
        }
    }

    [Fact]
    public void PhysicalDamageUsesArmorClassAndBasicAttacksHaveNoCastBarText()
    {
        var text = SkillCardDetails.Hover(Skill("nyxarion", "dragon_claw_attack"), "Dragon Claw Attack", "Nyxarion");
        Assert.Contains("Armor Class", text);
        Assert.Contains("blocked or missed", text);
        Assert.DoesNotContain("cast bar", text);
    }

    [Fact]
    public void GroundZonesHaveTheirWarningAndTargetZone()
    {
        var text = SkillCardDetails.Hover(Skill("zorvath", "fire_whirlwind"), "Fire Whirlwind", "Zorvath");
        Assert.Contains("12 random ground zones within 12 yd", text);
        Assert.Contains("1 on its target", text);
        Assert.Contains("2 yd wide and warns for 1.75 s", text);
    }

    [Fact]
    public void CleanseLayersAndDamageTickReductionAreExplained()
    {
        var c = SkillEffectFormatterTests.LoadCases().First(c => c.monster_id != null && c.skill_id == "blightstorm");
        var text = SkillCardDetails.Hover(new MonsterSkillFacts(c.input, c.delivery!), "Blightstorm", "Scaleblight");
        Assert.Contains("40% Cleanse Resist and three layers", text);
        Assert.Contains("60% multiplied by (100% + the cleansing caster's Accuracy)", text);
        Assert.Contains("85% with two layers left and 70% with one, rounded up", text);
        Assert.Contains("Disease Resist reduces each damage tick by 0.05%, up to 90%", text);
    }

    [Fact]
    public void RootAndUncleanseableDebuffExplainThePlayersOptions()
    {
        var text = SkillCardDetails.Hover(Skill("valaark", "grievous_wounds"), "Grievous Wounds", "Valaark");
        Assert.Contains("No cleanse can remove this debuff", text);
        text = SkillCardDetails.Hover(Skill("valaark", "chains_of_valaark"), "Chains of Valaark", "Valaark");
        Assert.Contains("A rooted player has no automatic break-free roll", text);
    }

    [Fact]
    public void HealingAndEnrageKeepTheirDifferentHealthGates()
    {
        var text = SkillCardDetails.Hover(Skill("arcane_sentinel", "arcane_regeneration"), "Arcane Regeneration", "Arcane Sentinel");
        Assert.Contains("100 health per second", text);
        Assert.Contains("only below 75% health", text);
        text = SkillCardDetails.Hover(Skill("ancient_cyclops", "rampage"), "Rampage", "Ancient Cyclops");
        Assert.Contains("Below 10% health", text);
        Assert.Contains("more non-spell damage", text);
        Assert.DoesNotContain("cast bar", text);
    }

    [Fact]
    public void FearAndKnockbackKeepTheirSeparateRestrictions()
    {
        var fear = SkillCardDetails.Hover(Skill("nyxarion", "fear"), "Fear", "Nyxarion");
        Assert.Contains("100% chance for 4 to 8 s", fear);
        Assert.Contains("Every boss", fear);
        Assert.Contains("Fear Resist is a separate chance", fear);
        Assert.Contains("Reapplying fear can shorten it", fear);
        var knockback = SkillCardDetails.Hover(Skill("nyxarion", "knockback"), "Knockback", "Nyxarion");
        Assert.Contains("75% chance to push the target back 1.5 yd", knockback);
        Assert.Contains("stun it for 0.25 s", knockback);
        Assert.Contains("1.25% of the damage just dealt", knockback);
        Assert.Contains("unless the attacker is a boss", knockback);
    }

    [Fact]
    public void HomingProjectilesAndLifetapExplainTheFullDamagePath()
    {
        var projectile = SkillCardDetails.Hover(Skill("seer_kzhal", "arcane_bolt"), "Arcane Bolt", "Seer Kzhal");
        Assert.Contains("Projectiles home in on their targets", projectile);
        var lifetap = SkillCardDetails.Hover(Skill("scaleblight", "dragon_disease_breath"), "Dragon Disease Breath", "Scaleblight");
        Assert.Contains("after the target's defenses, Ward and Mana Shield, rounded down", lifetap);
        Assert.Contains("Damage beyond the target's remaining health still counts", lifetap);
    }

    [Fact]
    public void RandomAreaSkillsDoNotClaimToHitEveryone()
    {
        var cases = SkillEffectFormatterTests.LoadCases()
            .Where(c => c.monster_id != null && c.input.affects_random_target).ToArray();
        Assert.NotEmpty(cases);
        foreach (var c in cases)
        {
            var text = SkillCardDetails.Hover(new MonsterSkillFacts(c.input, c.delivery!), c.skill_id, c.monster_id!);
            Assert.Contains("Hits one random target within", text);
            Assert.DoesNotContain("Hits everyone", text);
        }
    }
}
