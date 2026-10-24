<script lang="ts">
  import { statName, formatStat } from "$lib/stats";
  import * as fmt from "$lib/calculation/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
  const amount = $derived(fmt.atRank(skill.accuracy_bonus!, skill.max_level));
</script>

<!-- Source: server-scripts/Combat.cs:accuracy,GetProbResistMeleeDamage,GetProbResistMeleeDebuff,GetProbResistMagic — subtract the attacker's Accuracy from the victim's avoidance roll. -->
<div class="space-y-1">
  <h3 class="font-semibold">{statName("accuracy")}</h3>
  <p class="text-muted-foreground">
    <span class="block"
      >{amount < 0 ? "Subtracts" : "Adds"}
      {formatStat("accuracy", Math.abs(amount))}
      {amount < 0 ? "from" : "to"} the affected character's Accuracy at rank
      {skill.max_level}{skill.scales_with_charisma
        ? ", before Charisma scaling"
        : ""}. This {amount < 0
        ? "adds the same amount to"
        : "subtracts the same amount from"}
      the chance that its attacks and debuffs are blocked or resisted.</span
    >
    <span class="block"
      >Total Accuracy is limited to a value between -50% and 100%. See
      <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#avoidance">resistance and avoidance</a
      >
      for each roll's limits.</span
    >
  </p>
</div>
