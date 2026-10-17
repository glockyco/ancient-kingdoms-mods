<script lang="ts">
  import { formatPercent, formatNumber } from "$lib/utils/format";
  import RoundingDefinition from "$lib/components/RoundingDefinition.svelte";
  import { EXAMPLE_HIT, executeTick } from "$lib/skills/worked-examples";
  import * as fmt from "$lib/calculation/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

{#if skill.damage_over_time_execute_bonus}
  {@const execute = skill.damage_over_time_execute_bonus}
  <!-- Source: server-scripts/Skills.cs:ApplyDamageOverTimeBonuses — after the NecromancerReaperFormSkill multiplier, below 0.3 health.max, sums learned source-player PassiveSkill damageOverTimeExecuteBonus. -->
  <!-- Source: server-scripts/Skills.cs:ApplyDamageOverTimeBonuses — a positive summed execute bonus multiplies the tick, which then rounds before critical ticks. -->
  <div class="space-y-2">
    <h3 class="font-semibold">Damage-over-Time Execute</h3>
    <p class="text-muted-foreground">
      While the target is below 30% of its maximum Hit Points, your
      damage-over-time ticks deal {formatPercent(
        fmt.atRank(execute, skill.max_level),
        {
          decimals: 2,
          preserveNonzero: true,
        },
      )} more damage, rounded, so a {formatNumber(EXAMPLE_HIT)}-damage tick
      deals {formatNumber(
        executeTick(execute, skill.max_level),
      )}{fmt.scalesWithRank(execute, skill.max_level)
        ? ` at rank ${skill.max_level}`
        : ""}. {fmt.describeRankGrowth(execute, skill.max_level, (value) =>
        formatPercent(value, { decimals: 2, preserveNonzero: true }),
      )} Learned execute bonuses add together. See
      <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#damage-over-time">damage over time</a
      > for the full tick.
    </p>
    <RoundingDefinition />
    <p class="text-muted-foreground">
      Only damage-over-time effects you apply to another character get the
      bonus, and only while you are still in the game. Ticks from companions,
      mercenaries and monsters get none.
    </p>
  </div>
{/if}
