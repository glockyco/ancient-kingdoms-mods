<script lang="ts">
  import { formatPercent } from "$lib/utils/format";
  import {
    EXAMPLE_SONG_SECONDS,
    passiveSongDuration,
  } from "$lib/skills/worked-examples";
  import * as fmt from "$lib/calculation/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/PlayerSkills.cs:BeginBardSong,GetBardSongDurationMultiplier — learned passive bonuses multiply each renewal's duration. -->
<div class="space-y-1">
  <h3 class="font-semibold">Song Duration Bonus</h3>
  <p class="text-muted-foreground">
    Each rank lengthens your songs by {formatPercent(
      skill.bard_song_duration_bonus_per_level,
      { decimals: 2, preserveNonzero: true },
    )}, so at rank {skill.max_level} a {fmt.formatSeconds(EXAMPLE_SONG_SECONDS)} song
    lasts {fmt.formatSeconds(
      passiveSongDuration(
        skill.bard_song_duration_bonus_per_level,
        skill.max_level,
      ),
    )}.
  </p>
</div>
