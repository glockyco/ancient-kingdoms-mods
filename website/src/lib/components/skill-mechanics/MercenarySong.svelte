<script lang="ts">
  import { formatDuration } from "$lib/skills/skill-format";
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill } = $derived(mechanics);
</script>

<!-- Source: server-scripts/BardMercenarySkills.cs:OnStartServer,LateUpdate,RefreshAura,MaximumCombatSongs -->
<!-- Source: server-scripts/UIEquipmentMercenary.cs:Update — the mercenary window shows active songs and its combat-song limit. -->
<div class="space-y-1">
  <h3 class="font-semibold">Mercenary Song Aura</h3>
  <p>
    The <a
      href="/mercenaries/bard_mercenary"
      class="text-blue-600 dark:text-blue-400 hover:underline">Bard mercenary</a
    >
    keeps the song running automatically, renewing its aura every 2.5 seconds. Each
    renewal lasts {formatDuration(
      skill.duration_base,
      skill.duration_per_level,
    )}. A recipient loses the effect when it leaves range. When combat starts or
    ends, the previous set stops renewing and lasts its remaining duration.
  </p>
  <p class="text-muted-foreground">
    <span class="block"
      >Out of combat, it keeps only
      <a
        href="/skills/mercenary_wayfarers_rhythm"
        class="text-blue-600 dark:text-blue-400 hover:underline"
        >Mercenary Wayfarer's Rhythm</a
      >
      active.</span
    >
    <span class="block"
      >In combat, it keeps
      <a
        href="/skills/mercenary_grand_symphony"
        class="text-blue-600 dark:text-blue-400 hover:underline"
        >Mercenary Grand Symphony</a
      >
      and
      <a
        href="/skills/mercenary_march_of_celerity"
        class="text-blue-600 dark:text-blue-400 hover:underline"
        >Mercenary March of Celerity</a
      >
      active.</span
    >
    <span class="block"
      >From level 40, it also keeps
      <a
        href="/skills/mercenary_anthem_of_focus"
        class="text-blue-600 dark:text-blue-400 hover:underline"
        >Mercenary Anthem of Focus</a
      >
      active.</span
    >
    <span class="block">It starts one song at a time.</span>
    <span class="block"
      >All song effects end immediately when you or the mercenary die, or when
      the mercenary is stunned, feared, or asleep.</span
    >
  </p>
</div>
<div class="space-y-1">
  <h3 class="font-semibold">Active Song Limit</h3>
  <p>
    The mercenary sustains two combat songs below level 40 and three from level
    40 onward (the Active Songs value in the mercenary equipment window).
  </p>
  <p class="text-muted-foreground">
    <a
      href="/skills/polyphony"
      class="text-blue-600 dark:text-blue-400 hover:underline">Polyphony</a
    >
    and learned song-duration bonuses do not apply to the mercenary. See
    <a
      href="/mechanics/bard#songs"
      class="text-blue-600 dark:text-blue-400 hover:underline">Bard Songs</a
    >.
  </p>
</div>
