<!-- Source: server-scripts/Skills.cs:1592-1597 (BreakMezz — entity.speed <= -50f) -->
<!-- Source: server-scripts/Combat.cs:DealDamageAt (any damage > 0 calls BreakMezz) -->
<!-- Source: server-scripts/Monster.cs:1539-1553 (monster self-break roll every 6s) -->
<!-- Source: server-scripts/TargetDebuffSkill.cs:141 (boss/elite auto-resist speedBonus < -10) -->
<!-- Source: server-scripts/Skills.cs:251-256 — NecromancerReaperFormSkill recovery drain skips BreakMezz. -->
<div class="space-y-1">
  <h3 class="font-semibold">Sleep</h3>
  <p class="text-muted-foreground">
    <span class="block"
      >Sleep stops movement, but direct damage or ordinary damage-over-time
      ticks wake the target. Reaper Form health drain does not.</span
    >
    <span class="block">Bosses and elite monsters always resist sleep.</span>
    <span class="block"
      >Every 6 seconds, a sleeping monster rolls to wake. Each point of its
      Magic Resist adds 0.1 percentage points to that chance, which stays
      between 5% and 95%.</span
    >
  </p>
</div>
