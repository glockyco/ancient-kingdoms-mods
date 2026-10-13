<script lang="ts">
  import { EXAMPLE_HIT, lifetapFromHit } from "$lib/skills/worked-examples";
  import * as fmt from "$lib/calculation/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

{#if skill.lifetap_percent}
  {@const share = skill.lifetap_percent}
  <!-- Source: server-scripts/Combat.cs:1318-1333 — lifetap heals FloorToInt(share × damage after Ward and Mana Shield × (1 + summed bonuses)); overkill counts. -->
  <div class="space-y-1">
    <h3 class="font-semibold">Lifetap</h3>
    <p class="text-muted-foreground">
      Heals the attacker for {fmt.formatPercent(
        fmt.atRank(share, skill.max_level),
      )} of each hit's damage after the target's defenses, Ward and
      <a
        href="/skills/mana_shield"
        class="text-blue-600 dark:text-blue-400 hover:underline">Mana Shield</a
      >, rounded down, so a {fmt.formatNumber(EXAMPLE_HIT)}-damage hit heals {fmt.formatNumber(
        lifetapFromHit(share, skill.max_level),
      )}{fmt.scalesWithRank(share, skill.max_level)
        ? ` at rank ${skill.max_level}`
        : ""}. {fmt.describeRankGrowth(
        share,
        skill.max_level,
        fmt.formatPercent,
      )} Damage beyond the target's remaining Health still counts. Lifetap healing
      bonuses, such as
      <a
        href="/skills/lich_shroud"
        class="text-blue-600 dark:text-blue-400 hover:underline">Lich Shroud</a
      >'s, multiply the healing. See
      <a
        class="text-blue-600 dark:text-blue-400 hover:underline"
        href="/mechanics/combat#lifetap">lifetap</a
      >.
    </p>
  </div>
{/if}
