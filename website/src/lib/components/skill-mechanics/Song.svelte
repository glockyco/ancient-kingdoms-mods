<script lang="ts">
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
    Your selected song repeats automatically, renewing its duration after each
    cast. Spell Casting Haste speeds up these casts. The song lasts
    {fmt.formatSeconds(songSeconds)}{skill.duration_per_level &&
    skill.max_level > 1
      ? ` at rank ${skill.max_level}`
      : ""} after its last cast, even when you switch songs.
    <a
      href="/skills/lingering_melody"
      class="text-blue-600 dark:text-blue-400 hover:underline"
      >Lingering Melody</a
    >
    lengthens this duration.
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
