<script lang="ts">
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { facts } = $derived(mechanics);
</script>

<!-- Source: server-scripts/Combat.cs:1068-1105 — DealDamageAt stun branch: one roll per hit, skipped while the victim is feared; the stun ends at the later of the new and the current end; a Bear mount resists 90%; a stunned player dismounts. -->
<div class="space-y-1">
  <h3 class="font-semibold">Stun</h3>
  <p class="text-muted-foreground">
    <span class="block"
      >Each hit rolls once against the stun chance. A target that is already
      feared cannot be stunned.</span
    >
    <span class="block"
      >A stun on a target that is already stunned ends at whichever end time is
      later, so a shorter stun never cuts an existing one short.</span
    >
    {#if facts.usedByMonster}
      <span class="block"
        >A stunned player is dismounted. A player riding a <a
          class="text-blue-600 dark:text-blue-400 hover:underline"
          href="/items/bear_mount">Bear Mount</a
        > resists 90% of stuns.</span
      >
    {/if}
  </p>
</div>
