<script lang="ts">
  import { formatPercent, formatNumber } from "$lib/utils/format";
  import { EXAMPLE_HIT, lifetapWithBonus } from "$lib/skills/worked-examples";
  import * as fmt from "$lib/calculation/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

{#if skill.lifetap_healing_percent_bonus}
  {@const bonus = skill.lifetap_healing_percent_bonus}
  <!-- Source: server-scripts/Combat.cs:1212-1227 — active or isPermanent attacker buffs sum lifetapHealingPercentBonus for FloorToInt lifetap healing. -->
  <div class="space-y-2">
    <h3 class="font-semibold">Lifetap Healing Bonus</h3>
    <p class="text-muted-foreground">
      Your lifetap healing is {formatPercent(
        fmt.atRank(bonus, skill.max_level),
        { decimals: 2, preserveNonzero: true },
      )} higher, so a lifetap that would heal {formatNumber(EXAMPLE_HIT)} heals
      {formatNumber(
        lifetapWithBonus(bonus, skill.max_level),
      )}{fmt.scalesWithRank(bonus, skill.max_level)
        ? ` at rank ${skill.max_level}`
        : ""}. {fmt.describeRankGrowth(bonus, skill.max_level, (value) =>
        formatPercent(value, { decimals: 2, preserveNonzero: true }),
      )} Lifetap damage is unchanged. Bonuses from your active buffs, permanent ones
      included, add together. See
      <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#lifetap">lifetap</a
      >.
    </p>
  </div>
{/if}
