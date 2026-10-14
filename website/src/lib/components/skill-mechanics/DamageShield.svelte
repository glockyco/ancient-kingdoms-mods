<script lang="ts">
  import { mechanicsSections } from "$lib/skills/mechanics-sections";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
  const hasBuffScaling = $derived(
    mechanicsSections(mechanics).includes("buff-scaling"),
  );
</script>

<!-- Source: server-scripts/Combat.cs:DealDamageAt — shield damage is its own amount plus a rounded attribute bonus; each shield mitigates separately, then summed damage varies. -->
<div class="space-y-1">
  <h3 class="font-semibold">Damage Shield</h3>
  <p class="text-muted-foreground">
    <span class="block"
      >When a non-spell, single-target attack with a base cast range below 1.5
      yd hits the wearer, the attacker takes the Damage Shield amount, not a
      share of the incoming hit.</span
    >
    <span class="block"
      >Scroll skills and weapon effects triggered on hit cannot trigger it.</span
    >
    {#if hasBuffScaling}
      <span class="block">
        The amount includes the caster's attribute bonus from Buff Scaling
        above, fixed when the buff is applied.
      </span>
    {/if}
    {#if skill.damage_shield_type && skill.damage_shield_type !== "Unknown"}
      <span class="block">
        The attacker's {skill.damage_shield_type === "Physical"
          ? "Armor Class"
          : `${skill.damage_shield_type} Resist`}
        reduces this shield's damage by 5% per 100 points, at most 90%, with the reduction
        rounded up.
      </span>
    {:else}
      <span class="block"
        >Armor Class and resist stats do not reduce this shield's damage.</span
      >
    {/if}
    <span class="block">
      Several shields add together after their individual reductions. The total
      then varies at random by up to 10% in either direction, with the 10%
      rounded up, so a 95-damage total ranges from 85 to 105. See <a
        href="/mechanics/combat#damage-shields"
        class="text-blue-600 dark:text-blue-400 hover:underline"
        >damage shields</a
      >.
    </span>
  </p>
</div>
