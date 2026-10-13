<script lang="ts">
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
  <!-- Source: server-scripts/Skills.cs:1903-1938 — a positive summed execute bonus multiplies the tick, which then rounds before critical ticks. -->
  <div class="space-y-2">
    <h3 class="font-semibold">Damage-over-Time Execute</h3>
    <p class="text-muted-foreground">
      While the target is below 30% of its maximum Health, your damage-over-time
      ticks deal {fmt.formatPercent(fmt.atRank(execute, skill.max_level))} more damage,
      rounded, so a {fmt.formatNumber(EXAMPLE_HIT)}-damage tick deals {fmt.formatNumber(
        executeTick(execute, skill.max_level),
      )}{fmt.scalesWithRank(execute, skill.max_level)
        ? ` at rank ${skill.max_level}`
        : ""}. {fmt.describeRankGrowth(
        execute,
        skill.max_level,
        fmt.formatPercent,
      )} Learned execute bonuses add together. See
      <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#debuffs">damage over time</a
      > for the full tick.
    </p>
    <RoundingDefinition />
    <p class="text-muted-foreground">
      You must remain in the game as the player who applied the debuff to
      another character. Ticks from pets and monsters receive no bonus.
    </p>
  </div>
{/if}
