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

<!-- Source: server-scripts/PlayerSkills.cs:CompleteBardSongCast,BeginBardSong,GetBardSongDurationMultiplier — the selected song repeats, renewing its duration on each completed cast. -->
<div class="space-y-1">
  <h3 class="font-semibold">Song Aura</h3>
  <p class="text-muted-foreground">
    The song you select keeps recasting itself. Each cast takes
    {fmt.formatSeconds(fmt.atRank(skill.cast_time!, skill.max_level))},
    shortened by Spell Casting Haste. Each completed cast renews the song for
    {fmt.formatSeconds(songSeconds)}{skill.duration_per_level &&
    skill.max_level > 1
      ? ` at rank ${skill.max_level}`
      : ""}. After you select another song, this one lasts the rest of its
    duration. A learned song-duration bonus such as
    <a
      href="/skills/lingering_melody"
      class="text-blue-600 dark:text-blue-400 hover:underline"
      >Lingering Melody</a
    >
    lengthens it, so with a {fmt.formatPercent(EXAMPLE_SONG_BONUS)} bonus it lasts
    {fmt.formatSeconds(songDuration(songSeconds, EXAMPLE_SONG_BONUS))}.
  </p>
</div>
<!-- Source: server-scripts/PlayerSkills.cs:GetMaximumActiveBardSongs,BeginBardSong; server-scripts/UICharacterInfo.cs:Update — default limit is two, Polyphony removes it, and renewals move songs to the end of the active list. -->
<div class="space-y-1">
  <h3 class="font-semibold">Active Song Limit</h3>
  <p class="text-muted-foreground">
    <span class="block"
      >A Bard sustains two songs by default (the Active Songs value in your
      character window).</span
    >
    <span class="block"
      >Starting another song at the limit ends the song you renewed longest ago.</span
    >
    <span class="block"
      >Learning
      <a
        href="/skills/polyphony"
        class="text-blue-600 dark:text-blue-400 hover:underline">Polyphony</a
      >
      removes the limit.</span
    >
    See
    <a
      href="/mechanics/bard#songs"
      class="text-blue-600 dark:text-blue-400 hover:underline">Bard Songs</a
    >.
  </p>
</div>
