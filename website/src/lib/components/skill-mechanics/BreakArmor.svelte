<script lang="ts">
  import { formatPercent } from "$lib/calculation/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/Combat.cs:DealDamageAt — Break Armor rolls after avoidance, chooses one equipment slot, and removes 1–4 durability from a remaining-durability item. -->
<div class="space-y-1">
  <h3 class="font-semibold">Break Armor</h3>
  <p class="text-muted-foreground">
    <span class="block"
      >Each hit that is not blocked, missed or resisted has a
      {formatPercent(skill.break_armor_prob)} chance to trigger Break Armor.</span
    >
    <span class="block"
      >When it triggers, the game picks one random equipment slot on the target.</span
    >
    <span class="block"
      >If that slot contains an item with durability remaining, the item loses
      1–4 <a
        href="/mechanics/inventory#durability-and-repair"
        class="text-blue-600 dark:text-blue-400 hover:underline">durability</a
      >.</span
    >
    <span class="block">Break Armor affects players and mercenaries.</span>
  </p>
</div>
