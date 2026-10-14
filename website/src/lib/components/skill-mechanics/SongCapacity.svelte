<script lang="ts">
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/PlayerSkills.cs:GetMaximumActiveBardSongs,BeginBardSong; UICharacterInfo.cs:Update — the limit starts at two and adds learned passive slots, an unlimited passive removes it and the window shows ∞, and songs still expire by duration. -->
<div class="space-y-1">
  <h3 class="font-semibold">Active Song Limit</h3>
  <p>
    A Bard sustains two songs by default (the Active Songs value in your
    character window).
  </p>
  <p class="text-muted-foreground">
    {#if skill.unlimited_active_bard_songs}
      Learning this passive removes the limit, and Active Songs shows ∞. Each
      song still lasts only its own duration, and starting a song no longer ends
      an older one.
    {:else}
      Learning this passive adds {skill.additional_active_bard_songs} to your Active
      Songs limit.
    {/if}
    See
    <a
      href="/mechanics/bard#songs"
      class="text-blue-600 dark:text-blue-400 hover:underline">Bard Songs</a
    >.
  </p>
</div>
