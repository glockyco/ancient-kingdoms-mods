<script lang="ts">
  import { formatNumber } from "$lib/utils/format";
  import { statName, formatStat } from "$lib/stats";
  import RoundingDefinition from "$lib/components/RoundingDefinition.svelte";
  import { EXAMPLE_HIT, healOnHit } from "$lib/skills/worked-examples";
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
      The affected target heals anyone who hits it in melee for {formatStat(
        "heal_on_hit",
        fmt.atRank(share, skill.max_level),
      )} of each hit's damage after defenses and critical hits, before the target's
      Ward absorbs any of it, rounded, up to the attacker's missing Hit Points. A
      {formatNumber(EXAMPLE_HIT)}-damage hit heals {formatNumber(
        healOnHit(share, skill.max_level),
      )}{fmt.scalesWithRank(share, skill.max_level)
        ? ` at rank ${skill.max_level}`
        : ""}. {fmt.describeRankGrowth(share, skill.max_level, (value) =>
        formatStat("heal_on_hit", value),
      )}
    </p>
    <p class="text-muted-foreground">
      A melee hit is a non-spell damage skill with a base cast range below 2 yd.
      Several such effects each round their healing, then add together.
    </p>
    <RoundingDefinition />
  </div>
{/if}
