<script lang="ts">
  import { formatPercent } from "$lib/skills/skill-format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/Combat.cs:278-290 — fearResistChance property -->
<div class="space-y-1">
  <h3 class="font-semibold">Fear Resist</h3>
  <p class="text-muted-foreground">
    <span class="block"
      >When fear would apply, the target has a chance to resist it.</span
    >
    {#if skill.fear_resist_chance_bonus_cap > 0}
      <span class="block"
        >This skill adds at most {formatPercent(
          skill.fear_resist_chance_bonus_cap,
        ).replace("%", "")} percentage points to that chance after Charisma scaling.</span
      >
    {/if}
    <span class="block"
      >Total Fear Resist from all sources is capped at 100%.</span
    >
    <span class="block">At 100%, the target resists every fear effect.</span>
  </p>
</div>
