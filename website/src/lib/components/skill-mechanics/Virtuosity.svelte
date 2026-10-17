<script lang="ts">
  import { formatPercent } from "$lib/utils/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/BardVirtuositySkill.cs:IsDamageBonusActive,GetAdditionalDamagePercentBonus; Combat.cs:115-362 — the bonus needs three active songs, and each song beyond three adds the per-song bonus to Attack Power and Spell Power. -->
<div class="space-y-1">
  <h3 class="font-semibold">Virtuosity</h3>
  <p>
    Virtuosity's Attack Power and Spell Power bonuses apply while at least three
    of your songs are active.
    {#if skill.additional_damage_percent_per_song}
      Each active song beyond three adds another
      {formatPercent(skill.additional_damage_percent_per_song, {
        decimals: 2,
        preserveNonzero: true,
      })} to both, so five active songs add
      {formatPercent(2 * skill.additional_damage_percent_per_song, {
        decimals: 2,
        preserveNonzero: true,
      })} more.
    {/if}
    See
    <a
      href="/mechanics/bard#songs"
      class="text-blue-600 dark:text-blue-400 hover:underline">Bard Songs</a
    >.
  </p>
</div>
