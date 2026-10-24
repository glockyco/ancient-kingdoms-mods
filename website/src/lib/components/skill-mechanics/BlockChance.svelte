<script lang="ts">
  import { statName, formatStat } from "$lib/stats";
  import * as fmt from "$lib/calculation/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
  const amount = $derived(
    fmt.atRank(skill.block_chance_bonus!, skill.max_level),
  );
</script>

<!-- Source: server-scripts/Combat.cs:blockChance,GetProbResistMeleeDamage — signed Block Chance bonuses affect only physical hits, with a 0–80% stat cap and a 0–90% final avoidance roll. -->
<div class="space-y-1">
  <h3 class="font-semibold">{statName("block_chance")}</h3>
  <p class="text-muted-foreground">
    <span class="block"
      >{amount < 0 ? "Subtracts" : "Adds"}
      {formatStat("block_chance", Math.abs(amount))}
      {amount < 0 ? "from" : "to"} the affected character's Block Chance at rank
      {skill.max_level}{skill.scales_with_charisma
        ? ", before Charisma scaling"
        : ""}. Total Block Chance {amount < 0
        ? "cannot fall below 0%"
        : "cannot exceed 80%"}. It applies only to physical hits.</span
    >
    <span class="block"
      >See <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#avoidance">resistance and avoidance</a
      >
      for how level difference and Accuracy change the final chance.</span
    >
  </p>
</div>
