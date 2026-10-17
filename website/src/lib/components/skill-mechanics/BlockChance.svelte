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
      >{amount < 0 ? "Lowers" : "Raises"} the affected character's Block Chance by
      {formatStat("block_chance", Math.abs(amount)).replace("%", "")} percentage points
      at rank
      {skill.max_level}{skill.scales_with_charisma
        ? ", before Charisma scaling"
        : ""},
      {amount < 0 ? "to at least 0%" : "to at most 80%"}. Block Chance applies
      only to physical hits.</span
    >
    <span class="block"
      >Block Chance is capped at 80% before Accuracy and level difference are
      applied.</span
    >
    <span class="block"
      >The final chance for an attack to miss is capped at 90%.</span
    >
  </p>
</div>
