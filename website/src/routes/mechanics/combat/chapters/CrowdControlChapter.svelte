<script lang="ts">
  import Chapter from "$lib/components/reference/Chapter.svelte";
  import Panel from "$lib/components/reference/Panel.svelte";
  import RefTable from "$lib/components/reference/RefTable.svelte";
  import Topic from "$lib/components/reference/Topic.svelte";
</script>

<Chapter id="crowd-control">
  <Panel>
    <!-- Source: server-scripts/Monster.cs:UpdateServer_STUNNED,UpdateServer_FEAR,UpdateServer_IDLE — a stunned monster waits, a feared monster runs to random points, a rooted monster still uses skills in range, and a sleeping monster does nothing. -->
    <!-- Source: server-scripts/Combat.cs:DealDamageAt; TargetDebuffSkill.cs:Apply; BuffSkill.cs:IgnoreImmuneDebuff — stun skips feared targets and most Bear Mount riders, fear skips bosses and fear-immune targets, knockback skips targets 15 or more levels above a non-boss attacker, and bosses and elites resist listed Movement Speed below −10 except a boss facing pure damage over time. -->
    <RefTable caption="Crowd control effects compared" minWidth="44rem">
      <thead>
        <tr>
          <th scope="col">Effect</th>
          <th scope="col">Caused by</th>
          <th scope="col">Effect on a monster</th>
          <th scope="col">Ends</th>
          <th scope="col">Stopped by</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row"><a href="#stun">Stun</a></th>
          <td>A hit's stun chance</td>
          <td>Cannot move or act</td>
          <td>After its duration</td>
          <td>Fear, Bear Mount (90%)</td>
        </tr>
        <tr>
          <th scope="row"><a href="#fear">Fear</a></th>
          <td>A hit's fear chance, then a failed Fear Resist roll</td>
          <td>Runs around and cannot act</td>
          <td>After half to all of its listed duration</td>
          <td>Bosses, Immune to Fear, 100% Fear Resist</td>
        </tr>
        <tr>
          <th scope="row"><a href="#knockback">Knockback</a></th>
          <td>A hit's knockback chance, when its stun and fear rolls fail</td>
          <td>Pushed back, then stunned for 0.25 seconds</td>
          <td>At once</td>
          <td>Targets 15 or more levels above the attacker</td>
        </tr>
        <tr>
          <th scope="row"><a href="#root">Root</a></th>
          <td>Movement Speed −10 or lower</td>
          <td>Cannot move, still attacks in range</td>
          <td>When the debuff ends or the target breaks free</td>
          <td>Bosses and elites</td>
        </tr>
        <tr>
          <th scope="row"><a href="#sleep">Sleep</a></th>
          <td>Movement Speed −50 or lower</td>
          <td>Cannot move or act</td>
          <td>On damage, or when the target breaks free</td>
          <td>Bosses and elites</td>
        </tr>
      </tbody>
    </RefTable>
  </Panel>

  <Topic id="stun">
    <!-- Source: server-scripts/Combat.cs:DealDamageAt — stun keeps the later end time; the Bear mount's 90% resist sits inside the successful stun branch, so the fear and knockback else-if branches are skipped; applied stun dismounts a player. -->
    <ul>
      <li>A feared target cannot be stunned.</li>
      <li>
        A new stun can extend an existing one, but their durations do not add
        up.
      </li>
      <li>
        <a href="/items/bear_mount">Bear Mount</a> resists 90% of stuns. A hit whose
        stun the mount resists does not try fear or knockback either. A stun dismounts
        a player.
      </li>
    </ul>
  </Topic>

  <Topic id="fear">
    <!-- Source: server-scripts/Combat.cs:fearResistChance,DealDamageAt; EquipmentItem.cs:ToolTip — Fear Resist caps at 100%; fear sits in the else-if branch after the stun roll, so only a failed stun roll reaches it, and applying fear dismounts the player. -->
    <ul>
      <li>
        Fear can follow a failed stun roll. The target can then resist it with
        Fear Resist.
      </li>
      <li>
        Fear lasts a random time between half and all of the skill's listed fear
        duration.
      </li>
      <li>
        Monsters and companions whose pages list Immune to Fear cannot be
        feared. Every boss is immune, and so are the Necromancer's undead
        companions.
      </li>
      <li>
        Equipment and skills add Fear Resist up to 100%, which makes you immune.
        Fear dismounts a player.
      </li>
      <!-- Source: server-scripts/Combat.cs:1115-1119; Monster.cs:speed; Npc.cs:speed — Necromancer-player fear sets fearSlowsMovement and halves positive Monster/Npc speed in FEAR. -->
      <li>
        A monster or NPC feared by a Necromancer player runs at half its
        Movement Speed.
      </li>
    </ul>
  </Topic>

  <Topic id="knockback">
    <!-- Source: server-scripts/Combat.cs:DealDamageAt — knockback fails when target level − attacker level is at least 15 unless a boss monster casts it; obstacle damage is 1.25%, rounded up, at least 1. -->
    <ul>
      <li>
        Knockback is tried only when the hit's stun and fear rolls both fail,
        and not on a target that is already stunned.
      </li>
      <li>
        It pushes the target the distance listed on the skill and stuns it for
        0.25 seconds.
      </li>
      <li>
        A target pushed into an obstacle takes 1.25% of the hit's damage,
        rounded up, at least 1.
      </li>
      <li>
        It fails against a target 15 or more levels above the attacker, unless a
        boss monster casts it.
      </li>
    </ul>
  </Topic>

  <Topic id="root">
    <!-- Source: server-scripts/Monster.cs:UpdateServer_IDLE,speed,RemoveRoot; Pet.cs:UpdateServer_IDLE; Npc.cs:UpdateServer_IDLE; TargetDebuffSkill.cs:Apply; BuffSkill.cs:IgnoreImmuneDebuff — Movement Speed at most −10 roots; monsters roll every 2 seconds, NPCs and pets every second; boss/elite monsters resist listed speed bonuses below −10 unless a boss faces a debuff that only deals damage over time, and Monster.speed ignores a boss's slows. -->
    <p>
      A debuff that brings Movement Speed to −10 or lower, such as
      <a href="/skills/root">Root</a> or
      <a href="/skills/immobilize">Immobilize</a>, roots the target. Damage does
      not end it.
    </p>
    <RefTable caption="Chance for a rooted target to break free">
      <thead>
        <tr>
          <th scope="col">Rooted target</th>
          <th scope="col">Break-free roll</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Monster</th>
          <td>
            Every 2 seconds, 0.1 percentage points per point of Magic Resist,
            between 5% and 95%. 100 Magic Resist gives 10%.
          </td>
        </tr>
        <tr>
          <th scope="row">NPC, mercenary, companion or familiar</th>
          <td>Every second, 10%</td>
        </tr>
      </tbody>
    </RefTable>
    <p>
      Bosses and elite monsters resist every debuff that lists a Movement Speed
      bonus below −10. A boss still takes such a debuff when its only other
      effect is damage over time, but ignores the slow.
    </p>
  </Topic>

  <Topic id="sleep">
    <!-- Source: server-scripts/Skills.cs:BreakMezz — Movement Speed at most −50 is Sleep. -->
    <!-- Source: server-scripts/Monster.cs:UpdateServer_IDLE; Pet.cs:UpdateServer_IDLE; Npc.cs:UpdateServer_IDLE — the at-most-−50 Sleep branch precedes the at-most-−10 Root branch. -->
    <!-- Source: server-scripts/Combat.cs:DealDamageAt (damage > 0 calls BreakMezz) -->
    <!-- Source: server-scripts/Skills.cs:251-256 — damage-over-time recovery ticks call BreakMezz except NecromancerReaperFormSkill. -->
    <!-- Source: server-scripts/Monster.cs:1539-1553 (monster self-break: magic resist roll every 6s) -->
    <p>
      A debuff that brings Movement Speed to −50 or lower puts the target to
      sleep instead of rooting it.
    </p>
    <ul>
      <li>
        Any hit or damage-over-time tick ends it at once. The drain of
        <a href="#reaper-form">Reaper Form</a> does not.
      </li>
      <li>
        Every 6 seconds, a sleeping monster makes the same Magic Resist roll to
        break free as a rooted one.
      </li>
    </ul>
  </Topic>
</Chapter>
