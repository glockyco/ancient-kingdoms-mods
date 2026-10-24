<script lang="ts">
  import * as fmt from "$lib/calculation/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill, facts } = $derived(mechanics);
  const duration = $derived(fmt.atRank(skill.fear_time!, skill.max_level));
</script>

<!-- Source: server-scripts/Combat.cs:1310-1351 — DealDamageAt fear branch, reached only when the stun branch is not taken -->
<div class="space-y-1">
  <h3 class="font-semibold">Fear</h3>
  <p class="text-muted-foreground">
    <!-- Source: server-scripts/Combat.cs:DealDamageAt — fear skips bosses and targets whose Combat.fearImmune is set. -->
    <span class="block"
      >Monsters and companions whose pages list Immune to Fear cannot be feared.
      Every boss is immune.</span
    >
    <span class="block"
      >A hit that stuns cannot also cause fear. The target's Fear Resist is a
      separate chance to avoid fear, even when the skill's fear chance succeeds.</span
    >
    <span class="block"
      >Fear lasts a random time from {fmt.formatSeconds(duration / 2)} to
      {fmt.formatSeconds(duration)} at rank {skill.max_level}. Reapplying fear
      can shorten it.</span
    >
    {#if facts.usedByMonster}
      <!-- Source: server-scripts/Combat.cs:DealDamageAt — successful fear dismounts players. -->
      <span class="block">A feared player is dismounted.</span>
    {/if}
    <!-- Source: server-scripts/Combat.cs:1310-1314; Monster.cs:speed; Npc.cs:speed — Necromancer-player fear halves positive monster/NPC movement speed. -->
    <span class="block"
      >A monster or NPC feared by a Necromancer player moves at half its normal
      speed while feared.</span
    >
  </p>
</div>
