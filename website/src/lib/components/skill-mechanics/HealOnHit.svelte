<script lang="ts">
  import { statName, formatStat } from "$lib/stats";
  import RoundingDefinition from "$lib/components/RoundingDefinition.svelte";
  import * as fmt from "$lib/calculation/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

{#if skill.heal_on_hit_percent}
  {@const share = skill.heal_on_hit_percent}
  <!-- Source: server-scripts/Combat.cs:894-908 — positive effects on the victim heal the attacker for each qualifying damage-skill hit before Ward, capped at missing Health. -->
  <div class="space-y-2">
    <h3 class="font-semibold">{statName("heal_on_hit")}</h3>
    <p class="text-muted-foreground">
      Anyone who hits the affected target in melee heals {formatStat(
        "heal_on_hit",
        fmt.atRank(share, skill.max_level),
      )} of the hit's damage at rank {skill.max_level}, rounded. Healing counts
      damage absorbed by the target's Ward.
    </p>
    <p class="text-muted-foreground">
      Applies to non-spell melee skills with a base range below 2 yd. Multiple
      healing effects add together.
    </p>
    <RoundingDefinition />
  </div>
{/if}
