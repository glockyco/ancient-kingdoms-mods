using System.Linq;
using PocketCompendium.Features.BestiaryPages.Model;
using Xunit;

namespace PocketCompendium.Tests.BestiaryPages;

public class SkillCardTextTests
{
    [Theory]
    [InlineData("nyxarion", "fear", "Nyxarion", "Fears everyone within 10 yd for 4 to 8 s.")]
    [InlineData("nyxarion", "knockback", "Nyxarion", "1,625 physical damage to the target. 75% chance to knock it back 1.5 yd.")]
    [InlineData("nyxarion", "dragon_ice_breath", "Nyxarion", "4,650 cold damage to everyone in a 5 yd square in front. 75% chance to stun for 1.5 s.")]
    [InlineData("nyxarion", "summon_player", "Nyxarion", "Summons its target from 3 to 15 yd away to Nyxarion and stuns it for 2 s.")]
    [InlineData("scaleblight", "blightstorm", "Scaleblight", "Everyone within 10 yd takes 1,800 disease damage per second and loses 1 speed for 30 s. 40% Cleanse Resist.")]
    [InlineData("scaleblight", "withering_scourge", "Scaleblight", "Removes the buffs of everyone within 10 yd.")]
    [InlineData("scaleblight", "dragon_disease_breath", "Scaleblight", "7,500 disease damage to everyone in a 5 yd square in front, which heals Scaleblight by the damage dealt. 75% chance to stun for 1.5 s.")]
    public void ApprovedSentencesMatchRuntimeFacts(string monster, string id, string name, string expected)
    {
        var c = SkillEffectFormatterTests.LoadCases().Single(c => c.monster_id == monster && c.skill_id == id);
        Assert.Equal(expected, SkillCardText.Sentence(new MonsterSkillFacts(c.input, c.delivery!), name));
    }

    [Fact]
    public void BasicAttackLineIncludesNameAndApprovedSentence()
    {
        var c = SkillEffectFormatterTests.LoadCases().Single(c => c.monster_id == "nyxarion" && c.skill_id == "dragon_claw_attack");
        Assert.Equal("Dragon Claw Attack: 1,720 physical damage to the target. 5% chance to stun for 2 s.",
            SkillCardText.Line(new MonsterSkillFacts(c.input, c.delivery!), "Dragon Claw Attack", "Nyxarion"));
    }

    [Fact]
    public void ThreatsAreOrderedAndDeduplicatedWithoutNumbers()
    {
        var skills = SkillEffectFormatterTests.LoadCases().Where(c => c.monster_id == "nyxarion")
            .Select(c => new MonsterSkillFacts(c.input, c.delivery!)).ToArray();
        Assert.Equal("Summons you, breath in front, fear, knockback and stuns", SkillCardText.Threats(new MonsterSkillSummary(skills.Concat(skills).ToArray())));
        Assert.Equal("", SkillCardText.Threats(new MonsterSkillSummary(System.Array.Empty<MonsterSkillFacts>())));
    }

    [Fact]
    public void ListFormattingJoinsReadOnlyListsWithoutPrintingTheirType()
    {
        Assert.Equal("", SkillText.JoinAnd(System.Array.Empty<string>()));
        Assert.Equal("fear", SkillText.JoinAnd(new[] { "fear" }));
        Assert.Equal("fear and stuns", SkillText.JoinAnd(new[] { "fear", "stuns" }));
        Assert.Equal("fear, stuns and knockback", SkillText.JoinAnd(new System.Collections.Generic.List<string> { "fear", "stuns", "knockback" }));
    }

    [Theory]
    [InlineData("fire_whirlwind", "12 random ground zones and 1 on the target within 12 yd, each 2 yd wide, with 1.75 s warning.")]
    [InlineData("ice_lance", "damage to a random target within 12 yd.")]
    [InlineData("ice_lance", "The projectile follows a random target.")]
    [InlineData("grievous_wounds", "No cleanse removes this debuff.")]
    [InlineData("chains_of_valaark", "Roots everyone within 10 yd, and they lose 600 Armor Class for 10 s.")]
    [InlineData("sundering_maw", "5% chance to stun for 2 s. Otherwise it knocks the target back 1.5 yd.")]
    [InlineData("arcane_regeneration", "below 75% health.")]
    [InlineData("rampage", "deals 50% to 75% more non-spell damage.")]
    public void OtherMechanicsKeepTheirActionableFacts(string id, string fragment)
    {
        var c = SkillEffectFormatterTests.LoadCases().First(c => c.monster_id != null && c.skill_id == id);
        Assert.Contains(fragment, SkillCardText.Sentence(new MonsterSkillFacts(c.input, c.delivery!), "Monster"));
    }

    [Fact]
    public void EveryMonsterSkillHasPlainPunctuatedText()
    {
        var cases = SkillEffectFormatterTests.LoadCases().Where(c => c.monster_id != null).ToArray();
        Assert.NotEmpty(cases);
        foreach (var c in cases)
        {
            var sentence = SkillCardText.Sentence(new MonsterSkillFacts(c.input, c.delivery!), "Monster");
            Assert.False(string.IsNullOrWhiteSpace(sentence), c.monster_id + "/" + c.skill_id);
            Assert.EndsWith(".", sentence);
            foreach (var forbidden in new[] { "{", "  ", ";", "dmg", "lvl", " hp", " AC " })
                Assert.DoesNotContain(forbidden, sentence);
        }
    }
}
