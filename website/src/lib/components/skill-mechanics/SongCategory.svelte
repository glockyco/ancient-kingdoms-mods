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
    <p>Another Ward song cannot replace this song while it is active.</p>
    <p class="text-muted-foreground">
      Non-song Ward buffs and this song replace each other, regardless of
      capacity.
    </p>
  {:else}
    <p class="text-muted-foreground">
      A target keeps one song of each category, including songs from other Bards
      and Bard mercenaries. A stronger song replaces a song in the same
      category. At equal strength, the song already active stays.
    </p>
    <p class="text-muted-foreground">
      Strength is the sum of the song's movement speed, Attack Power, Spell
      Power, Haste, Spell Casting Haste and Accuracy bonuses. All except
      movement speed include the singer's Charisma scaling.
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
