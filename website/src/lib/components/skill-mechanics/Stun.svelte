<script lang="ts">
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { facts } = $derived(mechanics);
</script>

<!-- Source: server-scripts/Combat.cs:1077-1114 — DealDamageAt stun branch: one roll per hit, skipped while the victim is feared; the stun ends at the later of the new and the current end; a Bear mount resists 90%; a stunned player dismounts. -->
<div class="space-y-1">
  <h3 class="font-semibold">Stun</h3>
  <p class="text-muted-foreground">
    <span class="block">A feared target cannot be stunned.</span>
    <span class="block">A shorter stun cannot shorten an existing stun.</span>
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
