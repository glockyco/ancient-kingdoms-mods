<script lang="ts">
  import Calculation from "$lib/components/Calculation.svelte";
  import { cadenceCalculation } from "$lib/skills/damage-calculations";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
  const { usedByBardMercenary } = $derived(mechanics.facts);
</script>

<!-- Source: server-scripts/BardFinalCadenceSkill.cs:HasRequiredSongsActive,Apply,FindEnemies,HealNearbyAllies; PlayerSkills.cs:GetFinalCadenceSongBonus -->
<div class="space-y-1">
  <h3 class="font-semibold">Final Cadence</h3>
  <p>
    {#if usedByBardMercenary}
      <!-- Source: server-scripts/BardMercenarySkills.cs:CanUseFinalCadence,MaximumCombatSongs — the level-50 cadence needs all three combat songs. -->
      The mercenary casts it only from level 50, while it sustains all three of its
      combat songs.
    {:else}
      <!-- Source: server-scripts/BardFinalCadenceSkill.cs:HasRequiredSongsActive — a player Bard needs at least three active songs. -->
      You can cast it only while at least three of your songs are active.
    {/if}
  </p>
  <Calculation calculation={cadenceCalculation(skill, usedByBardMercenary)} />
  {#if usedByBardMercenary && skill.max_level > 1}
    <!-- Source: server-scripts/PetSkills.cs:RefreshSkillLevels — the player's level and veteran points determine the mercenary's skill rank. -->
    <p class="text-muted-foreground">
      Use the rank from Mercenary Skill Rank on this page. The examples use the
      same character level and veteran points.
    </p>
  {/if}
  <p>
    A critical heal restores double Hit Points, or triple in 10% of critical
    heals.
  </p>
  {#if !usedByBardMercenary}
    <!-- Source: server-scripts/BardFinalCadenceSkill.cs:Apply; PlayerSkills.cs:GetFinalCadenceSongBonus — Apply reads the active song count when the cast finishes. -->
    <p class="text-muted-foreground">
      Melody counts your active songs when the cast finishes.
    </p>
  {/if}
  <!-- Source: server-scripts/BardFinalCadenceSkill.cs:HealNearbyAllies,FindEnemies,IsEngagedWithParty — one roll covers all allied healing; sleeping monsters are excluded and Pet targets map to their owner. -->
  <p class="text-muted-foreground">
    <span class="block"
      >Healing is critical for every ally or none. The chance is the {usedByBardMercenary
        ? "mercenary's"
        : "Bard's"} Critical Strike.</span
    >
    <span class="block"
      >Damages visible monsters in range that are already fighting, but leaves
      sleeping monsters alone.</span
    >
    <span class="block">Final Cadence does not heal familiars.</span>
    {#if usedByBardMercenary}
      <span class="block"
        >The mercenary damages only enemies that target you, any party member,
        or one of their companions or mercenaries.</span
      >
    {/if}
  </p>
  <!-- Source: server-scripts/BardFinalCadenceSkill.cs:HealNearbyAllies,AddHealingAggro — actual healing divided by six rounds up and adds threat to nearby monsters fighting the healed ally. -->
  <p class="text-muted-foreground">
    For each ally healed, healing adds threat equal to a sixth of the Hit Points
    restored, rounded up, on monsters within {2 * skill.cast_range!.base_value} yd
    of the caster that are fighting that ally.
  </p>
  <!-- Source: server-scripts/Combat.cs:665-672,855-872,1550-1591 — Magic Resist reduces magic damage by 0.0005 per point, at most 90%, and adds 0.0005 per point to the resist chance. -->
  <p class="text-muted-foreground">
    The target's Magic Resist reduces this damage by 0.05% per point, up to 90%,
    and gives a 0.05% chance per point to resist it outright. Each 1% of the
    caster's Accuracy lowers that chance by 1%. A higher-level target gets 0.5%
    more per level and a lower-level one 0.5% less, up to 10% either way. The
    chance stays between 0% and 90%. See the <a
      class="text-blue-600 dark:text-blue-400 hover:underline"
      href="/mechanics/combat#damage-pipeline">damage steps</a
    >,
    <a
      class="text-blue-600 dark:text-blue-400 hover:underline"
      href="/mechanics/combat#resistance">resistance</a
    >
    and
    <a
      class="text-blue-600 dark:text-blue-400 hover:underline"
      href="/mechanics/combat#combat-advantage">combat advantage</a
    >.
  </p>
  <p class="text-muted-foreground">
    See <a
      href="/mechanics/bard#cadence"
      class="text-blue-600 dark:text-blue-400 hover:underline"
      >Final Cadence and Melody</a
    >.
  </p>
</div>
