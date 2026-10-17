<script lang="ts">
  import { formatPercent } from "$lib/utils/format";
  import { atRank } from "$lib/calculation/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/Combat.cs:fearResistChance,DealDamageAt — a successful fear roll is followed by the victim's separate Fear Resist roll; total Fear Resist is clamped 0–100%. -->
<div class="space-y-1">
  <h3 class="font-semibold">Fear Resist</h3>
  <p class="text-muted-foreground">
    <!-- Source: server-scripts/Combat.cs:fearResistChance; BuffSkill.cs:ScaleFearResistChanceBonus — signed buff bonuses add to total Fear Resist; songs scale this amount with Charisma. -->
    {#if skill.fear_resist_chance_bonus}
      <span class="block">
        The affected character receives {formatPercent(
          atRank(skill.fear_resist_chance_bonus, skill.max_level),
          { decimals: 2, preserveNonzero: true },
        ).replace("%", "")} percentage points of Fear Resist at rank
        {skill.max_level}{skill.scales_with_charisma
          ? ", before Charisma scaling"
          : ""}.
      </span>
    {/if}
    <span class="block"
      >When a fear roll succeeds, the target can still resist the fear, with a
      chance equal to its Fear Resist.</span
    >
    {#if skill.fear_resist_chance_bonus_cap > 0}
      <span class="block"
        >This skill adds at most {formatPercent(
          skill.fear_resist_chance_bonus_cap,
          { decimals: 2, preserveNonzero: true },
        ).replace("%", "")} percentage points to that chance after Charisma scaling.</span
      >
    {/if}
    <span class="block"
      >Total Fear Resist from all sources is capped at 100%.</span
    >
    <span class="block">At 100%, the target resists every fear effect.</span>
  </p>
</div>
