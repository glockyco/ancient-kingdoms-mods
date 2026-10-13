<script lang="ts">
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/BardSongSkill.cs:TryApplyAuraBuff,GetStackingStrength -->
<div class="space-y-1">
  <h3 class="font-semibold">Song Category: {skill.buff_category}</h3>
  <p>
    Song strength adds its movement speed, physical damage percentage, magic
    damage percentage, Haste, spell haste and Accuracy bonuses.
  </p>
  <p class="text-muted-foreground">
    <span class="block"
      >A target keeps one song of each category, including songs from other
      Bards and Bard mercenaries.</span
    >
    <span class="block"
      >A stronger song replaces a song in the same category.</span
    >
    <span class="block">At equal strength, the song already active stays.</span>
  </p>
</div>
