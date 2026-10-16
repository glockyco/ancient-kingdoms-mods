<script lang="ts">
  import RoundedTerm from "$lib/components/RoundedTerm.svelte";
  import Chapter from "$lib/components/reference/Chapter.svelte";
  import Formula from "$lib/components/reference/Formula.svelte";
  import SeeAlso from "$lib/components/reference/SeeAlso.svelte";
  import Topic from "$lib/components/reference/Topic.svelte";
  import VariantPicker from "$lib/components/reference/VariantPicker.svelte";
  import {
    healingCalculation,
    lifetapCalculation,
  } from "$lib/calculation/combat";

  let healer = $state<"ordinary" | "ranger">("ordinary");
</script>

<Chapter id="healing">
  <Topic id="heal-bonus">
    <!-- Source: server-scripts/TargetHealSkill.cs:GetHealingAmount; AreaHealSkill.cs:Apply — player and mercenary casters add Wisdom healing, and only player Rangers triple Wisdom. -->
    <p>
      Players and mercenaries add a Wisdom bonus to a heal's listed healing.
      Player Rangers use triple Wisdom, while Ranger mercenaries use the
      ordinary bonus. Healing over time from buffs scales differently, as shown
      in <a href="#buffs">Buff Strength</a>.
    </p>
    <VariantPicker
      label="Healer"
      options={[
        { value: "ordinary", label: "Mercenaries and other players" },
        { value: "ranger", label: "Player Ranger" },
      ]}
      bind:value={healer}
    />
    {#key healer}
      <!-- Source: server-scripts/Wisdom.cs:GetHealBonus; TargetHealSkill.cs:GetHealingAmount; AreaHealSkill.cs:Apply — the Wisdom bonus is 0.4% per positive point, capped at 500%, with the extra healing rounded. Player Rangers triple Wisdom. -->
      <Formula calculation={healingCalculation(healer === "ranger")} />
    {/key}
    <ul>
      <!-- Source: server-scripts/TargetHealSkill.cs:GetHealingAmount; AreaHealSkill.cs:Apply — only player and mercenary casters receive Wisdom healing additions. -->
      <li>
        Monsters, NPCs, companions and familiars use listed healing before
        critical checks.
      </li>
      <!-- Source: server-scripts/NecromancerDeathBloomSkill.cs:GetIntelligenceBonus,GetHealingAmount,Apply — Death Bloom uses Intelligence for its healing bonus. -->
      <li><a href="/skills/death_bloom">Death Bloom</a> uses Intelligence.</li>
      <!-- Source: server-scripts/TargetHealSkill.cs:GetHealingAmount,Apply — ordinary scroll heals omit Wisdom, but mercenary-targeted scroll heals use the player caster's Wisdom, tripled for Rangers, and can be critical. -->
      <li>
        <a href="/items/runed_scroll_of_restoration"
          >Runed Scroll of Restoration</a
        >
        (<a href="/skills/major_restoration">Major Restoration</a>) heals your
        mercenary using your Wisdom bonus, tripled for a player Ranger, and can
        be critical. Ordinary scroll heals omit Wisdom.
      </li>
      <!-- Source: server-scripts/BardFinalCadenceSkill.cs:Apply; PlayerSkills.cs:GetFinalCadenceSongBonus — Final Cadence uses Charisma and Melody rather than Wisdom. -->
      <li><a href="/skills/final_cadence">Final Cadence</a> ignores Wisdom.</li>
    </ul>
    <SeeAlso
      links={[
        {
          href: "/mechanics/bard#cadence",
          label: "Final Cadence song power and Melody",
        },
      ]}
    />
  </Topic>

  <Topic id="critical-heals">
    <!-- Source: server-scripts/TargetHealSkill.cs:Apply; AreaHealSkill.cs:Apply — a heal rolls the caster's critical chance. -->
    <p>A heal's critical chance is the caster's Critical Strike.</p>
    <ul>
      <!-- Source: server-scripts/TargetHealSkill.cs:Apply — targeted heals require canHealOthers for a critical heal, including self-targeted casts. -->
      <li>
        A targeted heal can be critical only if the skill can heal other
        characters, even when you cast it on yourself.
      </li>
      <!-- Source: server-scripts/AreaHealSkill.cs:Apply — positive area healing rolls a critical check without a targeting requirement. -->
      <li>Area heals can be critical without that targeting requirement.</li>
      <!-- Source: server-scripts/TargetHealSkill.cs:Apply; AreaHealSkill.cs:Apply; BardFinalCadenceSkill.cs:HealNearbyAllies — critical direct heals double healing on 90% of rolls and triple it on 10%. -->
      <li>
        On a critical heal, 90% of rolls double the healing and 10% triple it.
      </li>
      <!-- Source: server-scripts/BardFinalCadenceSkill.cs:HealNearbyAllies — Final Cadence uses one critical roll based on the Bard's Critical Strike for all recipients. -->
      <li>
        <a href="/skills/final_cadence">Final Cadence</a> uses one roll based on the
        Bard's Critical Strike for all recipients.
      </li>
      <!-- Source: server-scripts/Skills.cs:GetFinalHealOverTime,ApplyCriticalToOverTime — critical healing-over-time ticks multiply healing by 1.5 and round. -->
      <!-- Source: server-scripts/BuffSkill.cs:GetCasterCriticalChance; TargetBuffSkill.cs:Apply; AreaBuffSkill.cs:Apply — buffs store the caster's Critical Strike when applied. -->
      <li>
        A critical healing-over-time tick heals 150% of the normal tick,
        <RoundedTerm />. The chance is the caster's Critical Strike when the
        buff starts.
      </li>
      <!-- Source: server-scripts/Skills.cs:ApplyCriticalToOverTime; NetworkManagerMMO.cs:OnStartServer — critical healing requires more than 3 healing and base duration below 30 seconds, with recovery each second. -->
      <li>
        Only buffs with a base duration below 30 seconds and more than 3 healing
        each second can tick critically.
      </li>
    </ul>
  </Topic>

  <Topic id="lifetap">
    <!-- Source: server-scripts/Combat.cs:1326-1344 — lifetap heals without reducing damage, and damage is not capped by the victim's remaining Health. -->
    <p>
      Lifetap restores Health without reducing the hit's damage. Overkill damage
      counts toward the healing.
    </p>
    <!-- Source: server-scripts/Combat.cs:1326-1344 — lifetap healing rounds down after multiplying remaining damage by its percentage and summed active or permanent healing bonuses. -->
    <Formula calculation={lifetapCalculation()} />
    <!-- Source: server-scripts/Combat.cs:1326-1344; BuffSkill.cs:ToolTip — active and permanent buffs add their listed lifetap healing bonus. -->
    <p>
      <a href="/skills/lich_shroud">Lich Shroud</a> supplies the lifetap healing bonus.
    </p>
  </Topic>
</Chapter>
