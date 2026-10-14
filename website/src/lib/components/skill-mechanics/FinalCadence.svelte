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
    <!-- Source: server-scripts/PetSkills.cs:RefreshSkillLevels — the owner determines the mercenary's skill rank. -->
    <p class="text-muted-foreground">
      Use the rank from Mercenary Skill Rank on this page. The examples use the
      same owner level and veteran points.
    </p>
  {/if}
  <p>Critical heals restore double Health, or triple Health in 10% of cases.</p>
  {#if !usedByBardMercenary}
    <!-- Source: server-scripts/BardFinalCadenceSkill.cs:Apply; PlayerSkills.cs:GetFinalCadenceSongBonus — Apply reads the active song count when the cast finishes. -->
    <p class="text-muted-foreground">
      Melody counts your active songs when the cast finishes.
    </p>
  {/if}
  <!-- Source: server-scripts/BardFinalCadenceSkill.cs:HealNearbyAllies,FindEnemies,IsEngagedWithParty — one roll covers all allied healing; sleeping monsters are excluded and Pet targets map to their owner. -->
  <p class="text-muted-foreground">
    <span class="block"
      >One critical roll, with a chance equal to the {usedByBardMercenary
        ? "mercenary's"
        : "Bard's"}
      Critical Strike, applies to the healing of every ally.</span
    >
    <span class="block"
      >Its damage hits living, visible, attackable monsters within range in the
      same zone that are already in combat and are not asleep.</span
    >
    <span class="block">Final Cadence does not heal familiars.</span>
    {#if usedByBardMercenary}
      <span class="block"
        >The mercenary damages only enemies that target its owner, any party
        member, or one of their companions or mercenaries.</span
      >
    {/if}
  </p>
  <!-- Source: server-scripts/BardFinalCadenceSkill.cs:HealNearbyAllies,AddHealingAggro — actual healing divided by six rounds up and adds threat to nearby monsters fighting the healed ally. -->
  <p class="text-muted-foreground">
    For each ally healed, healing adds threat equal to a sixth of the Health
    restored, rounded up, on monsters within {2 * skill.cast_range!.base_value} yd
    of the caster that are fighting that ally.
  </p>
  <!-- Source: server-scripts/Combat.cs:656-663,846-863,1541-1582 — Magic Resist reduces magic damage by 0.0005 per point, at most 90%, and adds 0.0005 per point to the resist chance. -->
  <p class="text-muted-foreground">
    The target's Magic Resist reduces the damage by 5% per 100 points, at most
    90%, and gives 5 percentage points of chance per 100 points to resist it
    entirely. See the <a
      class="text-blue-600 dark:text-blue-400 hover:underline"
      href="/mechanics/combat#damage-pipeline">damage pipeline</a
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
