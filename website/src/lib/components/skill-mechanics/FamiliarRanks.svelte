<script lang="ts">
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
  const { familiarSummonSkills } = $derived(mechanics.facts);
</script>

<!-- Source: server-scripts/SummonSkill.cs:99; PetSkills.cs:114-116 — familiar level is its summoning rank, and skill rank is capped at its maximum. -->
<p class="text-muted-foreground">
  This skill's rank equals the rank of the skill that summoned the familiar, up
  to rank {skill.max_level}.
  {#if familiarSummonSkills.length > 0}
    Summoned by
    {#each familiarSummonSkills as summon, index (summon.id)}
      {#if index > 0},{/if}
      <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/skills/{summon.id}">{summon.name}</a
      >{/each}.
  {/if}
</p>
