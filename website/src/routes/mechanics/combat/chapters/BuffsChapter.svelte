<script lang="ts">
  import { statName } from "$lib/stats";
  import RoundedTerm from "$lib/components/RoundedTerm.svelte";
  import Chapter from "$lib/components/reference/Chapter.svelte";
  import Formula from "$lib/components/reference/Formula.svelte";
  import RefTable from "$lib/components/reference/RefTable.svelte";
  import SeeAlso from "$lib/components/reference/SeeAlso.svelte";
  import Topic from "$lib/components/reference/Topic.svelte";
  import VariantPicker from "$lib/components/reference/VariantPicker.svelte";
  import {
    BUFF_EFFECTS,
    buffCalculation,
    songCalculation,
    type BuffEffect,
  } from "$lib/calculation/combat";
  import {
    cleanseCalculation,
    damageOverTimeCalculation,
    dispelCalculation,
  } from "$lib/calculation/combat-rules";
  import { formatSeconds as seconds } from "$lib/calculation/format";

  let buffEffect = $state<BuffEffect>("defense");
  const buffEffectOptions = (
    Object.entries(BUFF_EFFECTS) as [BuffEffect, string][]
  ).map(([value, label]) => ({ value, label }));
</script>

<Chapter id="buffs-and-debuffs">
  <Topic id="duration-and-stacking">
    <!-- Source: server-scripts/Buff.cs:Buff; Skills.cs:AddOrRefreshBuff — effects have a timed end, and reapplying the same effect restarts it. -->
    <p>
      A buff or debuff lasts its listed duration unless something removes it.
      Reapplying the same effect replaces it and restarts its duration.
    </p>
    <!-- Source: server-scripts/FoodItem.cs:Use; BuffSkill.cs:GetBuffDurationMultiplier; PlayerSkills.cs:GetBardSongDurationMultiplier; PassiveSkill.cs:GetBardSongDurationBonus,GetFoodAndDrinkBuffDurationBonus; website/data/compendium.db skills.bard_song_duration_bonus_per_level,food_and_drink_buff_duration_bonus_per_level — food and drink buffs and a player's Bard songs last longer by the summed passive bonus per rank. -->
    <p>
      The Bard passive <a href="/skills/lingering_melody">Lingering Melody</a>
      lengthens your Bard songs by 4% per rank, and
      <a href="/skills/tavern_spirit">Tavern Spirit</a> lengthens your food and drink
      buffs by 10% per rank.
    </p>
    <!-- Source: server-scripts/Skills.cs:AddOrRefreshBuff -->
    <p>
      Buffs and debuffs in the same group replace each other, even when the new
      effect is weaker. <a href="/skills/divine_shield">Divine Shield</a>
      and
      <a href="/skills/shield_of_faith">Shield of Faith</a> share a group, so each
      replaces the other.
    </p>
    <!-- Source: server-scripts/Skills.cs:AddOrRefreshBuff -->
    <ul>
      <li>Effects in different groups, or without a group, stack.</li>
      <li>
        Area buffs from mercenaries, companions and familiars do not replace
        existing buffs in the same group. Player casts do.
      </li>
      <li>Different damage-over-time skills stack their layers separately.</li>
    </ul>
    <!-- Source: server-scripts/BardSongSkill.cs:TryApplyAuraBuff; PlayerSkills.cs:RefreshBardSongAura: categorized songs compare strength, while other songs replace another Bard's copy by name at each cast. -->
    <SeeAlso links={[{ href: "/mechanics/bard#songs", label: "Bard songs" }]} />
  </Topic>

  <Topic id="buffs">
    <p>
      Non-song buffs add part of an attribute from their caster to each effect.
      The tables below show which attribute each caster uses and how much it
      adds.
    </p>
    <!-- Source: server-scripts/BuffSkill.cs:GetBuffPowerAttribute; TargetBuffSkill.cs:Apply; AreaBuffSkill.cs:Apply — players and mercenaries use Wisdom or Intelligence, Rangers triple it for targeted buffs, and other casters add nothing. -->
    <RefTable caption="Buff attribute by caster">
      <thead>
        <tr>
          <th scope="col">Caster or buff</th>
          <th scope="col">Buff attribute</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Players and mercenaries</th>
          <td>Wisdom, or Intelligence for buffs that scale with it</td>
        </tr>
        <tr>
          <th scope="row">A player Ranger's targeted buffs</th>
          <td>Triple Wisdom or Intelligence</td>
        </tr>
        <!-- Source: server-scripts/AreaBuffSkill.cs:Apply,GetLeadershipAttributeBonus — player mercenary-area buffs halve and round Wisdom plus Constitution, adding Charisma before halving for Leadership. -->
        <tr>
          <th scope="row">
            A player's area buffs for mercenaries, such as
            <a href="/skills/blessing_of_the_zealot">Blessing of the Zealot</a>
          </th>
          <td>(Wisdom + Constitution) ÷ 2, <RoundedTerm /></td>
        </tr>
        <tr>
          <th scope="row"><a href="/skills/leadership">Leadership</a></th>
          <td>(Wisdom + Constitution + Charisma) ÷ 2, <RoundedTerm /></td>
        </tr>
        <!-- Source: server-scripts/AreaBuffSkill.cs:Apply — relic area buffs use caster level × 10 as their stored attribute. -->
        <tr>
          <th scope="row">
            Relic area buffs, such as
            <a href="/skills/staff_of_flowers">Staff of Flowers</a>
          </th>
          <td>10 × your level</td>
        </tr>
        <tr>
          <th scope="row">Monsters, NPCs, companions and familiars</th>
          <td>None</td>
        </tr>
      </tbody>
    </RefTable>
    <!-- Source: server-scripts/Buff.cs:47-228; Wisdom.cs:116-127; Combat.cs:969-982 — positive non-song effects add the selected attribute, with per-effect rounding. -->
    <!-- Source: server-scripts/Buff.cs:damageBonus,magicDamageBonus — Leadership adds its stored buff attribute to both listed damage bonuses. -->
    <!-- Source: server-scripts/Buff.cs:healthMaxBonus; TargetBuffSkill.cs:Apply; AreaBuffSkill.cs:Apply — the calculated Health value is a maximum-Health bonus, while Ward uses the calculated value as its capacity. -->
    <RefTable caption="What the buff attribute adds to each effect">
      <thead>
        <tr>
          <th scope="col">Effect</th>
          <th scope="col">Value received</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Maximum {statName("health")} bonus</th>
          <td>Listed bonus + 200% of buff attribute</td>
        </tr>
        <tr>
          <th scope="row">Ward capacity</th>
          <td>Listed capacity + 200% of buff attribute</td>
        </tr>
        <tr>
          <th scope="row">Armor Class and each resist</th>
          <td>Listed bonus + 15% of buff attribute, <RoundedTerm /></td>
        </tr>
        <tr>
          <th scope="row">Damage Shield</th>
          <td>Listed damage + 75% of buff attribute, <RoundedTerm /></td>
        </tr>
        <tr>
          <th scope="row">
            Attack Power and Spell Power from
            <a href="/skills/leadership">Leadership</a>
          </th>
          <td>Listed bonus + 100% of buff attribute</td>
        </tr>
        <tr>
          <th scope="row">
            Healing each second, base duration below {seconds(60)}
          </th>
          <td>
            Listed healing + listed healing × 0.4% per buff attribute point
            above 0, at most +500%, with the extra healing <RoundedTerm />
          </td>
        </tr>
        <tr>
          <th scope="row">
            Healing each second, base duration at least {seconds(60)}
          </th>
          <td
            >Listed healing + 30% of buff attribute above 0, <RoundedTerm /></td
          >
        </tr>
      </tbody>
    </RefTable>
    <VariantPicker
      label="Effect"
      options={buffEffectOptions}
      bind:value={buffEffect}
    />
    {#key buffEffect}
      <Formula calculation={buffCalculation(buffEffect)} />
    {/key}
  </Topic>

  <Topic id="songs">
    <!-- Source: server-scripts/BardSongSkill.cs:Apply and BardMercenarySkills.cs:RefreshAura — a song buff from a Bard or Bard mercenary carries that singer's Charisma. -->
    <!-- Source: server-scripts/Buff.cs:ScaleWithCharisma and Skills.cs:GetFinalHealOverTime — Charisma-scaled song values skip the Wisdom additions. -->
    <p>
      Both beneficial and harmful Bard songs grow stronger with the singer's
      Charisma. This applies to Bard mercenaries too.
    </p>
    <!-- Source: server-scripts/uMMORPG.Scripts.PlayerAttributes/Charisma.cs:GetBardPowerMultiplier; Buff.cs:ScaleWithCharisma; BuffSkill.cs:ScaleFearResistChanceBonus,ScaleHealingPerSecondBonus — song power scales whole-number and percentage effects, but not Movement Speed or primary attributes. -->
    <Formula calculation={songCalculation()} />
    <RefTable caption="What song power changes">
      <thead>
        <tr>
          <th scope="col">Effect</th>
          <th scope="col">Examples</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Whole numbers, <RoundedTerm /></th>
          <td>
            Ward, Armor Class, resists, flat Attack Power and Spell Power, flat
            Mana Regeneration and Rage Regeneration
          </td>
        </tr>
        <tr>
          <th scope="row">Percentages</th>
          <td>
            Attack Power, Spell Power, Accuracy, Critical Strike, Haste, Spell
            Casting Haste, percentage Mana Regeneration and Rage Regeneration
          </td>
        </tr>
        <tr>
          <th scope="row">Not changed</th>
          <td>Movement Speed, primary attributes</td>
        </tr>
      </tbody>
    </RefTable>
    <ul>
      <!-- Source: server-scripts/BuffSkill.cs:ScaleFearResistChanceBonus — scaled Fear Resist stops at the song's fearResistChanceBonusCap. -->
      <li>
        Fear Resist from <a href="/skills/ballad_of_courage"
          >Ballad of Courage</a
        >
        stops at the song's listed limit.
      </li>
      <!-- Source: server-scripts/BuffSkill.cs:ScaleHealingPerSecondBonus — Cacophony's stored Charisma coefficient adds damage after rounding and treats negative Charisma as zero. -->
      <li>
        <a href="/skills/cacophony">Cacophony</a> deals its listed damage each
        second plus 75% of Charisma above 0, <RoundedTerm />.
      </li>
    </ul>
  </Topic>

  <Topic id="debuff-landing">
    <!-- Source: server-scripts/TargetDebuffSkill.cs:Apply; AreaDebuffSkill.cs:Apply — debuffs and dispels roll the matching resist chance before applying. -->
    <p>
      A debuff or dispel with a damage type lands only if the target fails the
      <a href="#avoidance">resist roll</a> for that type.
      <a href="#resistance">Defense by Damage Type</a> shows which stat resists each
      type.
    </p>
    <!-- Source: server-scripts/TargetDebuffSkill.cs:Apply; AreaDebuffSkill.cs:Apply — isDecreaseResistsSkill subtracts 30 percentage points. -->
    <p>
      <a href="/skills/malosi">Malosi</a>,
      <a href="/skills/spellrend">Spellrend</a>,
      <a href="/skills/withering_hex">Withering Hex</a>,
      <a href="/skills/crippling_refrain">Crippling Refrain</a> and
      <a href="/skills/refrain_of_frailty">Refrain of Frailty</a> subtract 30% from
      the target's chance to resist them, to at least 0%. Other debuffs that lower
      resists get no such bonus.
    </p>
    <!-- Source: server-scripts/TargetDebuffSkill.cs:Apply; AreaDebuffSkill.cs:Apply; BuffSkill.cs:IgnoreImmuneDebuff — on a boss, immunity lets through only debuffs that deal damage over time and change nothing else besides Movement Speed; on other monsters it lets through resistance-decrease skills. -->
    <p>
      Monsters whose pages list Immune to Debuffs ignore debuffs, with two
      exceptions:
    </p>
    <ul>
      <li>
        The five skills above still affect such a monster unless it is a boss.
      </li>
      <li>
        A boss still takes debuffs whose only effects are damage over time and
        optionally a slow, such as <a href="/skills/immolate">Immolate</a> and
        <a href="/skills/venom_of_the_grave">Venom of the Grave</a>. It ignores
        the slow.
      </li>
    </ul>
    <SeeAlso
      links={[{ href: "#root", label: "Root, for bosses and slowing debuffs" }]}
    />
  </Topic>

  <Topic id="debuffs">
    <p>
      Your Strength, Dexterity or Intelligence strengthens your debuffs,
      depending on their damage type. Bard debuff songs use song power.
    </p>
    <!-- Source: server-scripts/BuffSkill.cs:GetDebuffPowerAttribute — Charisma-scaled debuffs use Charisma, melee debuffs Strength, poison and disease debuffs that do not scale with Intelligence Dexterity, and others Intelligence; non-mercenary casters other than players add nothing. -->
    <RefTable caption="Debuff attribute by debuff type">
      <thead>
        <tr>
          <th scope="col">Debuff type</th>
          <th scope="col">Debuff attribute</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">
            Physical, such as <a href="/skills/hurt">Hurt</a> and
            <a href="/skills/rupture">Rupture</a>
          </th>
          <td>Strength</td>
        </tr>
        <tr>
          <th scope="row">Poison and disease that scale with Intelligence</th>
          <td>Intelligence</td>
        </tr>
        <tr>
          <th scope="row">Other poison and disease</th>
          <td>Dexterity</td>
        </tr>
        <tr>
          <th scope="row">Magic, fire, cold and no damage type</th>
          <td>Intelligence</td>
        </tr>
        <tr>
          <th scope="row">Bard debuff songs</th>
          <td><a href="#songs">Song power</a> instead</td>
        </tr>
      </tbody>
    </RefTable>
    <!-- Source: server-scripts/BuffSkill.cs:GetDebuffPowerAttribute — mercenaries choose Strength, Dexterity or Intelligence by the same rules, and other non-player casters return 0. -->
    <p>
      Players and mercenaries use their own attributes. Debuffs from monsters,
      NPCs, companions and familiars add nothing.
    </p>
    <!-- Source: server-scripts/Buff.cs:69-228; BuffSkill.cs:488-530; Skills.cs:GetFinalDamageDoT — reductions use the selected debuff attribute, and physical ticks round their Strength addition. -->
    <!-- Source: server-scripts/BuffSkill.cs:14-31,523-530 — damageOverTimeBonusPerIntelligencePoint defaults to 1.25 and each skill can override it, while scalesWithCharisma effects skip the separate addition. -->
    <RefTable caption="What the debuff attribute adds to each effect">
      <thead>
        <tr>
          <th scope="col">Effect</th>
          <th scope="col">Value applied</th>
        </tr>
      </thead>
      <tbody>
        <tr><th colspan="2" scope="rowgroup">Reductions</th></tr>
        <tr>
          <th scope="row">Armor Class</th>
          <td>
            Listed reduction + 50% of debuff attribute for physical debuffs, or
            40% for others, <RoundedTerm />
          </td>
        </tr>
        <tr>
          <th scope="row">Each resist</th>
          <td>Listed reduction + 40% of debuff attribute, <RoundedTerm /></td>
        </tr>
        <tr>
          <th scope="row">Attack Power and Spell Power</th>
          <td>Listed reduction + 50% of debuff attribute, <RoundedTerm /></td>
        </tr>
      </tbody>
      <tbody>
        <tr><th colspan="2" scope="rowgroup">Damage each second</th></tr>
        <tr>
          <th scope="row">Physical</th>
          <td>Listed damage + 50% of Strength, <RoundedTerm /></td>
        </tr>
        <tr>
          <th scope="row">Poison and disease that scale with Dexterity</th>
          <td>Listed damage + 150% of Dexterity, <RoundedTerm /></td>
        </tr>
        <tr>
          <th scope="row">Every other type</th>
          <td>
            Listed damage + 125% of Intelligence, <RoundedTerm />.
            <a href="/skills/ensnare">Ensnare</a> adds 115%
          </td>
        </tr>
      </tbody>
    </RefTable>
  </Topic>

  <Topic id="damage-over-time">
    <p>
      <a href="#resistance">Defense by Damage Type</a> shows which stat reduces damage-over-time
      ticks.
    </p>
    <Formula calculation={damageOverTimeCalculation} />
    <!-- Source: server-scripts/Skills.cs:ApplyDamageOverTimeBonuses,ApplyCriticalToOverTime — Reaper Form and execute require a different, online player caster, while critical chance is captured when the buff starts. -->
    <ul>
      <li>
        <a href="/skills/reaper_form">Reaper Form</a> and
        <a href="/skills/deathly_focus">Deathly Focus</a> add their bonuses only to
        ticks of a debuff a player applied, and only while that player is online.
      </li>
      <li>
        The chance of a critical tick is the caster's Critical Strike when the
        debuff starts.
      </li>
      <!-- Source: server-scripts/Skills.cs:ApplyCriticalToOverTime,GetFinalDamageDoT — the critical threshold uses damage after mitigation, layers and bonuses. -->
      <li>
        Only debuffs with a base duration below 30 seconds can tick critically,
        and only for more than 3 damage after reduction, layers and bonuses.
      </li>
      <!-- Source: server-scripts/Skills.cs:GetFinalDamageDoT — the maximum-Health percentage is added after the bonuses and the critical check. -->
      <li>
        Damage based on a percentage of the target's maximum Hit Points gets
        neither bonus and is never critical.
      </li>
      <!-- Source: server-scripts/Skills.cs:GetFinalDamageDoT,ApplyWardToDoTDamage: Ward absorbs the final tick after percentage-of-maximum-Health damage is added. -->
      <li>Ward absorbs the final tick before the target loses Hit Points.</li>
    </ul>
  </Topic>

  <Topic id="cleanse">
    <!-- Source: server-scripts/Buff.cs:Buff; BuffSkill.cs:GetCleanseCountersRemoved; TargetBuffSkill.cs:Apply; AreaBuffSkill.cs:Apply — each debuff starts with three layers; the four 10-yd player area cleanses affect living, visible players and pets, without a party gate; Remedy is targeted. -->
    <!-- Source: server-scripts/TargetBuffSkill.cs:HasMatchingCleanseDebuff — a cleanse matches debuffs that share one of its disease, poison, cold, fire or magic flags. -->
    <p>
      A cleanse removes layers from debuffs of the types it lists: disease,
      poison, cold, fire or magic. Physical debuffs, which Armor Class resists,
      cannot be cleansed. Each debuff starts with three layers and ends when the
      last one is removed.
    </p>
    <!-- Source: server-scripts/Skills.cs:1885-1888 — ticks with two or one remaining layers deal 85% or 70%, rounded up. -->
    <p>
      A debuff deals 85% of its <a href="#damage-over-time">damage over time</a>
      with two layers left and 70% with one, rounded up.
    </p>
    <!-- Source: website/data/compendium.db skills.player_classes — Cleanse is Cleric, Purify and Remedy are Druid, Purifying Winds is Ranger and Nullify Magic is Wizard. -->
    <ul>
      <li>
        <a href="/skills/cleanse">Cleanse</a> (Cleric),
        <a href="/skills/purify">Purify</a> (Druid),
        <a href="/skills/purifying_winds">Purifying Winds</a> (Ranger) and
        <a href="/skills/nullify_magic">Nullify Magic</a> (Wizard) affect you and
        every visible player, mercenary, companion and familiar within 10 yd, in your
        party or not.
      </li>
      <li>
        The Druid's <a href="/skills/remedy">Remedy</a> is cast on yourself or an
        ally.
      </li>
      <li>
        A limited-use cleanse item works only on a target with a matching debuff
        it can remove. A cleanse skill can be cast without one.
      </li>
    </ul>
    <Formula calculation={cleanseCalculation} />
    <p>
      A debuff's skill page shows its Cleanse Resist and whether one cast
      removes it.
    </p>
  </Topic>

  <Topic id="dispel">
    <!-- Source: server-scripts/TargetDebuffSkill.cs:Apply; AreaDebuffSkill.cs:Apply — dispel uses its landing roll, then removes TargetBuffSkill and AreaBuffSkill, preserving player Rest and all BardSongSkill buffs. -->
    <p>
      Dispels remove beneficial buffs unless the target
      <a href="#debuff-landing">resists them</a>. Bard songs cannot be
      dispelled.
    </p>
    <RefTable caption="What a dispel removes">
      <thead>
        <tr>
          <th scope="col">Target</th>
          <th scope="col">Buffs removed</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Player</th>
          <td>
            Every targeted and area buff except <a href="/skills/rest">Rest</a>
          </td>
        </tr>
        <tr>
          <th scope="row">Mercenary, companion or familiar</th>
          <td>Every targeted and area buff, including Rest</td>
        </tr>
        <tr>
          <th scope="row">Monster</th>
          <td>Each targeted and area buff that passes its own removal roll</td>
        </tr>
      </tbody>
    </RefTable>
    <Formula calculation={dispelCalculation} />
    <!-- Source: server-scripts/TargetDebuffSkill.cs:Apply; ScrollItem.cs:UseAfterCast — single-target scroll dispels use the cast rank calculated from Scroll Mastery. -->
    <p>
      A single-target dispel scroll uses the rank set by
      <a href="/professions/scroll_mastery">Scroll Mastery</a>.
    </p>
  </Topic>
</Chapter>
