<script lang="ts">
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/BardSongSkill.cs:TryApplyAuraBuff,GetStackingStrength -->
<!-- Source: server-scripts/Buff.cs:ScaleWithCharisma,speedBonus; server-scripts/Skills.cs:AddOrRefreshBuff — percentage bonuses scale with the singer's Charisma; non-song buffs also overwrite a matching category. -->
<div class="space-y-1">
  <h3 class="font-semibold">Song Category: {skill.buff_category}</h3>
  {#if skill.buff_category === "Ward"}
    <p>
      Ward capacity does not count toward song strength, so this song's strength
      is 0. At equal strength, the song already active stays.
    </p>
    <p class="text-muted-foreground">
      Ward is also an overwrite group for other buffs. This song replaces a
      non-song Ward buff, and another Ward buff can replace this song,
      regardless of ward capacity.
    </p>
  {:else}
    <p>
      Songs in one category compare strength: the sum of their movement speed,
      physical damage, magic damage, Haste, spell haste and Accuracy bonuses.
      Each bonus except movement speed counts after the singer's Charisma
      scaling.
    </p>
    <p class="text-muted-foreground">
      A target keeps one song of each category, including songs from other Bards
      and Bard mercenaries. A stronger song replaces a song in the same
      category. At equal strength, the song already active stays.
    </p>
  {/if}
  <p class="text-muted-foreground">
    See
    <a
      href="/mechanics/bard#songs"
      class="text-blue-600 dark:text-blue-400 hover:underline">Bard Songs</a
    >.
  </p>
</div>
