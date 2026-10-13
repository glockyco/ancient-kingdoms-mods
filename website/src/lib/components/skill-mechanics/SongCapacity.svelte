<script lang="ts">
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/PlayerSkills.cs:GetMaximumActiveBardSongs — starts at two and adds learned passive bonuses. -->
<div class="space-y-1">
  <h3 class="font-semibold">Active Song Limit</h3>
  <p>
    A Bard sustains two songs by default (the Active Songs value in your
    character window).
  </p>
  <p class="text-muted-foreground">
    Learning this passive adds {skill.additional_active_bard_songs} to your Active
    Songs limit. See
    <a
      href="/mechanics/bard#songs"
      class="text-blue-600 dark:text-blue-400 hover:underline">Bard Songs</a
    >.
  </p>
</div>
