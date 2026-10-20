<script lang="ts">
  import Calculation from "$lib/components/Calculation.svelte";
  import { aggroCalculation } from "$lib/skills/effect-calculations";
  import { atRank, describeRankScaling } from "$lib/calculation/format";
  import { formatNumber } from "$lib/utils/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
  const { usedByMercenary } = $derived(mechanics.facts);
  const negativeThreat = $derived(
    skill.aggro !== null && atRank(skill.aggro, 1) < 0,
  );
</script>

<div class="space-y-2">
  <h3 class="font-semibold">Threat</h3>
  {#if negativeThreat && skill.aggro}
    <!-- Source: server-scripts/Combat.cs:DealDamageAt — negative skill threat lowers existing monster threat to at least 1 and ignores the hit's damage. -->
    <p class="text-muted-foreground">
      Each hit on a monster lowers the attacker's threat by
      {describeRankScaling(
        {
          base_value: -skill.aggro.base_value,
          bonus_per_level: -skill.aggro.bonus_per_level,
        },
        skill.max_level,
        formatNumber,
      )}, but not below 1. The hit's damage adds no threat.
    </p>
    <!-- Source: server-scripts/Combat.cs:DealDamageAt — NPC threat adds signed skill threat plus damage and crowd-control contributions, limited to the NPC's current Health. -->
    <p class="text-muted-foreground">
      Against an NPC, the hit's damage and crowd-control threat offset the
      reduction, and the attacker's threat can fall below 1.
    </p>
  {:else}
    <Calculation
      calculation={aggroCalculation(
        skill,
        skill.player_classes.length > 0
          ? "player"
          : usedByMercenary
            ? "mercenary"
            : "other",
      )}
    />
  {/if}
  <p class="text-muted-foreground">
    See <a
      href="/mechanics/combat#threat"
      class="text-blue-600 dark:text-blue-400 hover:underline">threat</a
    >.
  </p>
</div>
