<!-- Source: server-scripts/DamageSkill.cs:49-67 (TryConsumeWildStrike) -->
<!-- Source: server-scripts/TargetDamageSkill.cs:244,291 (ApplyDamage) -->
<!-- Source: server-scripts/TargetProjectileSkill.cs:221-222,252-256 (Apply) -->
<!-- Source: server-scripts/Combat.cs:DealDamageAt — Magic Resist reduces the converted hit by 0.0005 per point, at most 90%. -->
<div class="space-y-1">
  <h3 class="font-semibold">Wild Strike</h3>
  <p class="text-muted-foreground">
    Your next melee auto attack (Swift Slash) or bow auto attack (Archer Shot)
    consumes the buff, deals 10% more damage per Wild Strike rank and becomes
    Magic damage. The target's Magic Resist reduces the converted damage by
    0.05% per point, up to 90%. See
    <a
      class="text-blue-600 dark:text-blue-400 hover:underline"
      href="/mechanics/combat#wild-strike">Wild Strike</a
    >,
    <a
      class="text-blue-600 dark:text-blue-400 hover:underline"
      href="/mechanics/combat#damage-pipeline">the damage steps</a
    >
    and
    <a
      class="text-blue-600 dark:text-blue-400 hover:underline"
      href="/mechanics/combat#resistance">resistance</a
    >.
  </p>
  <!-- Source: server-scripts/DamageSkill.cs:TryConsumeWildStrike — the buff multiplies the completed auto-attack calculation. -->
  <p class="text-muted-foreground">
    Use the <a
      class="text-blue-600 dark:text-blue-400 hover:underline"
      href="/skills/swift_slash#mechanics">Swift Slash</a
    >
    or
    <a
      class="text-blue-600 dark:text-blue-400 hover:underline"
      href="/skills/archer_shot#mechanics">Archer Shot</a
    > calculator for the auto attack's damage before this bonus.
  </p>
</div>
