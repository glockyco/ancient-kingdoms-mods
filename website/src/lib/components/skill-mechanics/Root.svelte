<script lang="ts">
  import { getMechanicsContext } from "./context";

  const mechanics = getMechanicsContext();
  const { skill, facts } = $derived(mechanics);
  const targetsMonsters = $derived(
    skill.player_classes.length > 0 ||
      skill.is_scroll ||
      facts.usedByMercenary ||
      facts.usedByCompanion ||
      facts.usedByFamiliar,
  );
</script>

<!-- Source: server-scripts/Monster.cs:UpdateServer_IDLE; Npc.cs:UpdateServer_IDLE; Pet.cs:UpdateServer_IDLE — monsters roll every 2 seconds using Magic Resist; NPCs and pets roll every second at 10%. -->
<!-- Source: server-scripts/TargetDebuffSkill.cs:144-180; AreaDebuffSkill.cs:155-191; BuffSkill.cs:169-190 — bosses and elites automatically resist base speed bonuses below -10 unless IgnoreImmuneDebuff passes. Pure damage over time passes for both. Non-boss elites also accept resistance-decrease skills and positive Health Regeneration. -->
<div class="space-y-1">
  <h3 class="font-semibold">Root</h3>
  <p class="text-muted-foreground">
    <span class="block"
      >Root stops movement and does not break when the target takes damage.</span
    >
    {#if targetsMonsters}
      <span class="block"
        >Every 2 seconds, a rooted monster rolls to break free. Each point of
        its Magic Resist adds 0.1% to that chance, which stays between 5% and
        95%.</span
      >
      <span class="block"
        >A rooted NPC has a 10% chance to break free every second.</span
      >
      {#if (skill.speed_bonus?.base_value ?? 0) < -10}
        <span class="block"
          >Bosses and elite monsters always resist this debuff.</span
        >
      {/if}
      <span class="block"
        >A rooted monster still attacks and casts at targets within its reach.</span
      >
    {/if}
    {#if facts.usedByMonster}
      <span class="block"
        >A rooted companion or mercenary has a 10% chance to break free every
        second.</span
      >
      <!-- Source: server-scripts/Player.cs:RemoveRoot; TargetBuffSkill.cs:Apply — Charge removes player roots; Player has no timed break-free roll. -->
      <span class="block"
        >A rooted player has no automatic break-free roll.</span
      >
    {/if}
  </p>
</div>
