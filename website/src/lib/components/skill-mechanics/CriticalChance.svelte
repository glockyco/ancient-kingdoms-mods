<script lang="ts">
  import { statName, formatStat } from "$lib/stats";
  import * as fmt from "$lib/calculation/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
  const amount = $derived(
    fmt.atRank(skill.critical_chance_bonus!, skill.max_level),
  );
</script>

<!-- Source: server-scripts/Combat.cs:criticalChance — sum the signed bonuses and clamp the total to 0–70%. -->
<div class="space-y-1">
  <h3 class="font-semibold">{statName("critical_chance")}</h3>
  <p class="text-muted-foreground">
    <span class="block"
      >{amount < 0 ? "Lowers" : "Raises"} the affected character's Critical Strike
      by {formatStat("critical_chance", Math.abs(amount)).replace("%", "")} percentage
      points at rank
      {skill.max_level}{skill.scales_with_charisma
        ? ", before Charisma scaling"
        : ""}. Total Critical Strike
      {amount < 0 ? "cannot fall below 0%" : "cannot exceed 70%"}.</span
    >
    <span class="block"
      >See <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#critical-hits">critical hits</a
      > for the extra damage.</span
    >
  </p>
</div>
