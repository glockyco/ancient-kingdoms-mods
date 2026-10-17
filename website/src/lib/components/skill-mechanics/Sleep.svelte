<!-- Source: server-scripts/Skills.cs:BreakMezz,GetHealthRecoveryPerSecond; Combat.cs:DealDamageAt — positive direct damage and ordinary DoT ticks wake targets, but Reaper Form's drain does not. -->
<!-- Source: server-scripts/Monster.cs:UpdateServer_IDLE,UpdateServer_CASTING; Npc.cs:UpdateServer_IDLE; Pet.cs:UpdateServer_IDLE — sleep stops action/casts and uses a Magic Resist break roll every 6 seconds. -->
<!-- Source: server-scripts/TargetDebuffSkill.cs:Apply; AreaDebuffSkill.cs:Apply; Pet.cs:UserCode_CmdAttackTarget__NetworkIdentity — applying a damage-over-time debuff or ordering a pet to attack also wakes sleeping monsters/NPCs. -->
<div class="space-y-1">
  <h3 class="font-semibold">Sleep</h3>
  <p class="text-muted-foreground">
    <span class="block"
      >Sleep stops movement and action, cancels a monster's cast and makes it
      drop its target. Direct damage, ordinary damage-over-time ticks and
      applying a damage-over-time debuff wake the target. Ordering your pet to
      attack a sleeping monster or NPC also wakes it. Reaper Form Hit Points
      drain does not.</span
    >
    <span class="block">Bosses and elite monsters always resist sleep.</span>
    <span class="block"
      >Every 6 seconds, a sleeping monster, NPC or pet rolls to wake. Each point
      of its Magic Resist adds 0.1 percentage points to that chance, which stays
      between 5% and 95%.</span
    >
  </p>
</div>
