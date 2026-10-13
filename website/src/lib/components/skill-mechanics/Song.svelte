<script lang="ts">
  import {
    EXAMPLE_SONG_BONUS,
    songDuration,
  } from "$lib/skills/worked-examples";
  import * as fmt from "$lib/calculation/format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
  const songSeconds = $derived(
    fmt.atRank(
      {
        base_value: skill.duration_base,
        bonus_per_level: skill.duration_per_level,
      },
      skill.max_level,
    ),
  );
</script>

<!-- Source: PlayerSkills.cs:911-917,1169-1180 -->
<!-- Source: server-scripts/PlayerSkills.cs:1271,1618-1628 — learned song-duration bonuses add, then multiply the base duration. -->
<div class="space-y-1">
  <h3 class="font-semibold">Song Aura</h3>
  <p class="text-muted-foreground">
    The song lasts {fmt.formatSeconds(songSeconds)}{skill.duration_per_level &&
    skill.max_level > 1
      ? ` at rank ${skill.max_level}`
      : ""}. Learned song-duration bonuses lengthen it by their total
    percentage, so with a {fmt.formatPercent(EXAMPLE_SONG_BONUS)} bonus it lasts {fmt.formatSeconds(
      songDuration(songSeconds, EXAMPLE_SONG_BONUS),
    )}.
  </p>
</div>
<!-- Source: PlayerSkills.cs:937-950,1156-1167. Current exported Polyphony data sets additional_active_bard_songs to 1. -->
<div class="space-y-1">
  <h3 class="font-semibold">Active Song Limit</h3>
  <p class="text-muted-foreground">
    <span class="block">A Bard can sustain two songs by default.</span>
    <span class="block">Learning Polyphony raises the limit to three.</span>
    <span class="block"
      >Starting another song at the limit ends the oldest active song.</span
    >
  </p>
</div>
