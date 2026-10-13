<script lang="ts">
  import {
    EXAMPLE_SONG_SECONDS,
    passiveSongDuration,
  } from "$lib/skills/worked-examples";
  import * as fmt from "$lib/calculation/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: PassiveSkill.cs:15-27 and PlayerSkills.cs:1169-1180 -->
<!-- Source: server-scripts/PlayerSkills.cs:1271,1618-1628 — learned song-duration bonuses add, then multiply the base duration. -->
<div class="space-y-1">
  <h3 class="font-semibold">Song Duration Bonus</h3>
  <p class="text-muted-foreground">
    Each rank lengthens your songs by {fmt.formatPercent(
      skill.bard_song_duration_bonus_per_level,
    )}, so at rank {skill.max_level} a {fmt.formatSeconds(EXAMPLE_SONG_SECONDS)} song
    lasts {fmt.formatSeconds(
      passiveSongDuration(
        skill.bard_song_duration_bonus_per_level,
        skill.max_level,
      ),
    )}. Learned song-duration bonuses add together.
  </p>
</div>
