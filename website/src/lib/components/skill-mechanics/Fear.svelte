<!-- Source: server-scripts/Combat.cs:1104-1138 — DealDamageAt fear branch, reached only when the stun branch is not taken -->
<div class="space-y-1">
  <h3 class="font-semibold">Fear</h3>
  <p class="text-muted-foreground">
    <span class="block">Bosses and fear-immune targets cannot be feared.</span>
    <span class="block"
      >A hit rolls against the fear chance only when it does not stun: the skill
      has no stun chance, its stun roll fails, or the target is already feared.
      If the fear roll succeeds, the target rolls its Fear Resist and is feared
      only if that roll fails.</span
    >
    <span class="block"
      >Fear lasts a random time between half and all of the skill's fear
      duration.</span
    >
    <!-- Source: server-scripts/Combat.cs:1104-1108; Monster.cs:speed; Npc.cs:speed — Necromancer-player fear halves positive monster/NPC movement speed. -->
    <span class="block"
      >A monster or NPC feared by a Necromancer player moves at half its normal
      speed while feared.</span
    >
  </p>
</div>
