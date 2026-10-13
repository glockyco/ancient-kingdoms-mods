<script lang="ts">
  import { formatDuration } from "$lib/skills/skill-format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/BardMercenarySkills.cs:OnStartServer,LateUpdate,RefreshAura,MaximumCombatSongs -->
<div class="space-y-1">
  <h3 class="font-semibold">Mercenary Song Aura</h3>
  <p>
    The song lasts {formatDuration(
      skill.duration_base,
      skill.duration_per_level,
    )}. The mercenary refreshes its aura every 2.5 seconds while the song stays
    active.
  </p>
  <p class="text-muted-foreground">
    <span class="block">The Bard mercenary sings automatically.</span>
    <span class="block"
      >Out of combat, it keeps only Wayfarer's Rhythm active.</span
    >
    <span class="block"
      >In combat, it keeps Grand Symphony and March of Celerity active.</span
    >
    <span class="block"
      >From level 40, it also keeps Anthem of Focus active.</span
    >
    <span class="block">It starts one song at a time.</span>
    <span class="block"
      >The songs stop when the mercenary or its owner dies, or when the
      mercenary is hidden, stunned, feared, or asleep.</span
    >
  </p>
</div>
<div class="space-y-1">
  <h3 class="font-semibold">Active Song Limit</h3>
  <p>
    The mercenary sustains two combat songs below level 40 and three from level
    40 onward.
  </p>
  <p class="text-muted-foreground">
    Polyphony and learned song-duration bonuses do not apply to the mercenary.
  </p>
</div>
