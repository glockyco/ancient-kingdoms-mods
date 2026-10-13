<script lang="ts">
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
  <h3 class="font-semibold">Critical Chance</h3>
  <p class="text-muted-foreground">
    <span class="block"
      >{amount < 0 ? "Lowers" : "Raises"} the affected character's Critical Chance
      by {fmt.formatNumber(Math.abs(amount) * 100)} percentage points at rank
      {skill.max_level}{skill.scales_with_charisma
        ? ", before Charisma scaling"
        : ""},
      {amount < 0 ? "to at least 0%" : "to at most 70%"}.</span
    >
    <span class="block"
      >See the <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#damage-pipeline">damage pipeline</a
      > for critical-hit scaling.</span
    >
  </p>
</div>
