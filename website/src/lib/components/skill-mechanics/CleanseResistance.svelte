<script lang="ts">
  import { formatPercent } from "$lib/utils/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/Buff.cs:.ctor; BuffSkill.cs:GetCleanseCountersRemoved; TargetBuffSkill.cs:HasMatchingCleanseDebuff,Apply; AreaBuffSkill.cs:Apply; Skills.cs:GetFinalDamageDoT — elemental type matching, three layers, cleanser Accuracy and rounded-up 85%/70% DoT ticks. -->
<div class="space-y-1">
  <h3 class="font-semibold">Cleanse Resistance</h3>
  {#if !skill.is_disease_debuff && !skill.is_poison_debuff && !skill.is_cold_debuff && !skill.is_fire_debuff && !skill.is_magic_debuff}
    <p class="text-muted-foreground">No cleanse can remove this debuff.</p>
  {:else if skill.prob_ignore_cleanse >= 1}
    <p class="text-muted-foreground">This debuff cannot be cleansed.</p>
  {:else if skill.prob_ignore_cleanse <= 0}
    <p class="text-muted-foreground">
      A matching cleanse removes this debuff completely in a single cast.
    </p>
  {:else}
    <p class="text-muted-foreground">
      <span class="block"
        >This debuff has {formatPercent(skill.prob_ignore_cleanse, {
          decimals: 2,
          preserveNonzero: true,
        })} Cleanse Resist and three layers. Cleansing removes the debuff only after
        all three are gone.</span
      >
      <span class="block">A matching cleanse always removes one layer.</span>
      <span class="block"
        >It rolls twice more to remove one additional layer per roll.</span
      >
      <span class="block"
        >Each of those rolls succeeds at {formatPercent(
          1 - skill.prob_ignore_cleanse,
          { decimals: 2, preserveNonzero: true },
        )} × (100% + the cleansing caster's Accuracy), limited to 0–100%. At 100%,
        one cast removes all three layers. See
        <a
          class="text-blue-600 dark:text-blue-400 hover:underline"
          href="/mechanics/combat#cleanse">cleanse calculations</a
        >.</span
      >
      {#if (skill.healing_per_second_bonus?.base_value ?? 0) < 0}
        <span class="block"
          >After a cleanse removes layers, each damage tick deals 85% with two
          layers left and 70% with one, rounded up.</span
        >
      {/if}
    </p>
  {/if}
</div>
