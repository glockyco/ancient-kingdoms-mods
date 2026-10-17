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
      >{amount < 0 ? "Lowers" : "Raises"} the affected character's Accuracy by
      {formatStat("accuracy", Math.abs(amount)).replace("%", "")} percentage points
      at rank
      {skill.max_level}{skill.scales_with_charisma
        ? ", before Charisma scaling"
        : ""}. The chance that its attacks and debuffs are blocked or resisted {amount <
      0
        ? "rises"
        : "falls"} by the same number of percentage points, within each roll's limits.</span
    >
    <span class="block"
      >Total Accuracy is limited to a value between −50% and 100%.</span
    >
  </p>
</div>
