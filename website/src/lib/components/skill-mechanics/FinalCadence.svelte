<script lang="ts">
  import Calculation from "$lib/components/Calculation.svelte";
  import { cadenceCalculation } from "$lib/skills/damage-calculations";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
  const { usedByBardMercenary } = $derived(mechanics.facts);
</script>

<!-- Source: server-scripts/BardFinalCadenceSkill.cs:HasMaximumSongsActive,Apply,FindEnemies,HealNearbyAllies; PlayerSkills.cs:ConsumeFinalCadenceRepertoireBonus -->
<div class="space-y-1">
  <h3 class="font-semibold">Final Cadence</h3>
  <p>
    {#if usedByBardMercenary}
      The mercenary casts it only from level 50, while it sustains its full
      combat song limit.
    {:else}
      You can cast it only while you sustain your full active song limit.
    {/if}
  </p>
  <Calculation calculation={cadenceCalculation(skill, usedByBardMercenary)} />
  <p>Critical heals restore double Health, or triple Health in 10% of cases.</p>
  {#if !usedByBardMercenary}
    <!-- Source: server-scripts/PlayerSkills.cs:1157,1576-1603 — distinct completed manual songs in the preceding 40 seconds are consumed for the Melody bonus. -->
    <p class="text-muted-foreground">
      Songs completed less than 40s ago count. Automatic renewal contributes 0
      songs. Casting Final Cadence clears the Melody bonus.
    </p>
  {/if}
  <!-- Source: server-scripts/BardFinalCadenceSkill.cs:Apply and BardFinalCadenceSkill.cs:HealNearbyAllies — a Bard mercenary uses its own Charisma and critical chance. -->
  <p class="text-muted-foreground">
    <span class="block"
      >The {usedByBardMercenary ? "mercenary's" : "Bard's"} critical chance determines
      one roll shared by every recipient.</span
    >
    <span class="block"
      >Its damage hits living, visible, attackable monsters within range in the
      same zone that have a nonempty aggro list and speed above −50.</span
    >
    <span class="block">Final Cadence does not heal familiars.</span>
    {#if usedByBardMercenary}
      <span class="block"
        >The mercenary damages only enemies that target its owner, a party
        member, or one of their pets.</span
      >
    {/if}
  </p>
  <!-- Source: server-scripts/Combat.cs:654-661,844-861,1539-1580 — Magic Resist reduces magic damage by 0.0005 per point, at most 90%, and adds 0.0005 per point to the resist chance. -->
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
</div>
