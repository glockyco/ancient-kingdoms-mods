<script lang="ts">
  import { formatPercent } from "$lib/utils/format";
  import * as fmt from "$lib/calculation/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

{#if skill.health_max_percent_bonus}
  {@const bonus = skill.health_max_percent_bonus}
  <!-- Source: server-scripts/Skills.cs:GetHealthPercentBonus — owner's learned isPetSkill PassiveSkill.healthMaxPercentBonus goes to non-mercenary, non-familiar pets, not the owner. -->
  <div class="space-y-2">
    <h3 class="font-semibold">Companion Maximum Health</h3>
    <p class="text-muted-foreground">
      Your companion receives {formatPercent(
        fmt.atRank(bonus, skill.max_level),
        { decimals: 2, preserveNonzero: true },
      )} more maximum Health{fmt.scalesWithRank(bonus, skill.max_level)
        ? ` at rank ${skill.max_level}`
        : ""}. {fmt.describeRankGrowth(bonus, skill.max_level, (value) =>
        formatPercent(value, { decimals: 2, preserveNonzero: true }),
      )} This passive does not increase your own maximum Health, and does not affect
      familiars or mercenaries.
    </p>
  </div>
{/if}
