<!-- Source: server-scripts/Monster.cs and Pet.cs (root/full-stop threshold speed <= -10f, timerRoot 2s, RemoveRoot) -->
<!-- Source: server-scripts/Npc.cs (root/full-stop threshold speed <= -10f, timerRoot 1s, 10% fixed) -->
<!-- Source: server-scripts/TargetDebuffSkill.cs:141 (boss/elite auto-resist speedBonus < -10) -->
<div class="space-y-1">
  <h3 class="font-semibold">Root</h3>
  <p class="text-muted-foreground">
    <span class="block"
      >Root stops movement and does not break when the target takes damage.</span
    >
    <span class="block"
      >Every 2 seconds, a rooted monster rolls to break free. Each point of its
      Magic Resist adds 0.1 percentage points to that chance, which stays
      between 5% and 95%.</span
    >
    <span class="block"
      >A rooted NPC has a 10% chance to break free every second.</span
    >
    <span class="block"
      >Bosses and elite monsters always resist this debuff.</span
    >
  </p>
</div>
