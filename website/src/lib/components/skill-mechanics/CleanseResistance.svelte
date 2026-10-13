<script lang="ts">
  import { formatPercent } from "$lib/skills/skill-format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/Buff.cs:19 (3 counters); BuffSkill.cs:518-540 (GetCleanseCountersRemoved); TargetBuffSkill.cs:137-161 (HasMatchingCleanseDebuff), 239-432 (Apply cleanse branch); Skills.cs:1866-1872 (DoT per-counter scaling) -->
<div class="space-y-1">
  <h3 class="font-semibold">Cleanse Resistance</h3>
  {#if skill.prob_ignore_cleanse >= 1}
    <p class="text-muted-foreground">This debuff cannot be cleansed.</p>
  {:else if skill.prob_ignore_cleanse <= 0}
    <p class="text-muted-foreground">
      A matching cleanse removes this debuff completely in a single cast.
    </p>
  {:else}
    <p class="text-muted-foreground">
      <span class="block"
        >This debuff has three layers, and cleansing it removes the debuff only
        after all three are gone.</span
      >
      <span class="block">A matching cleanse always removes one layer.</span>
      <span class="block"
        >It rolls twice more to remove one additional layer per roll.</span
      >
      <span class="block"
        >Each extra-layer roll starts at {formatPercent(
          1 - skill.prob_ignore_cleanse,
        )}. Accuracy increases that chance. See
        <a
          class="text-blue-600 dark:text-blue-400 hover:underline"
          href="/mechanics/combat#cleanse">cleanse calculations</a
        >.</span
      >
      {#if skill.healing_per_second_bonus}
        <span class="block"
          >While layers remain, each damage tick deals 85% of its full damage at
          two layers or 70% at one layer.</span
        >
      {/if}
    </p>
  {/if}
</div>
