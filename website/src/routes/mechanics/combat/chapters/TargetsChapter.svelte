<script lang="ts">
  import Chapter from "$lib/components/reference/Chapter.svelte";
  import SeeAlso from "$lib/components/reference/SeeAlso.svelte";
  import Topic from "$lib/components/reference/Topic.svelte";
</script>

<Chapter id="targeting">
  <Topic id="targets">
    <!-- Source: server-scripts/Player.cs:4367-4377; PlayerSkills.cs:771-807 — players attack living monsters or NPCs, exclude charmed monsters, and choose the closest attackable monster within 10 units when a targeted attack lacks a valid target. -->
    <p>
      Players can attack living monsters and NPCs. Other players and
      <a href="/mechanics/bard#charm">Bard-charmed</a> monsters are protected from
      player attacks. A targeted attack without a valid target selects the nearest
      non-hidden, attackable monster within 10 yd if one exists.
    </p>
    <!-- Source: server-scripts/TargetHealSkill.cs:CorrectedTarget,83-135; PlayerSkills.cs:747-770 — heal targets depend on canHealSelf/canHealOthers; a selected monster can redirect a heal to its player or pet target; resurrection requires remains or a dead mercenary. -->
    <ul>
      <li>
        A targeted heal can reach yourself, another player, or a mercenary,
        companion or familiar when the skill permits it. Self-only heals target
        you.
      </li>
      <li>
        Selecting a monster can instead heal the player, mercenary, companion or
        familiar it is attacking.
      </li>
      <li>Resurrection targets only player remains or a dead mercenary.</li>
    </ul>
  </Topic>

  <Topic id="casting">
    <!-- Source: server-scripts/PlayerSkills.cs:642-646,732-738,808-890 — learned status, readiness, resources, equipment and ammunition are checked. -->
    <p>
      Casting requires a learned, ready skill, enough Mana or Rage, suitable
      equipment, and ammunition for applicable projectiles.
    </p>
    <!-- Source: server-scripts/PlayerSkills.cs:839-870 — out-of-range and obscured targets can start navigation and queue the cast. -->
    <p>
      When the target is out of range or out of sight, your character moves
      closer and then casts.
    </p>
    <!-- Source: server-scripts/PlayerSkills.cs:642-646 — fear and stun block normal skill use. -->
    <!-- Source: server-scripts/PlayerSkills.cs:636-646 — active NecromancerReaperFormSkill and Fearless Stance are removed before the FEAR/STUNNED gate. -->
    <p>
      Fear and stun block skill use, except dismissing an active
      <a href="/skills/reaper_form">Reaper Form</a> or
      <a href="/skills/fearless_stance">Fearless Stance</a>.
    </p>
    <!-- Source: server-scripts/PlayerSkills.cs:953-1012,1162-1191 — Bard song use and repetition continue while moving or casting ordinary skills. -->
    <p>Bard songs can continue while you move or use combat skills.</p>
    <SeeAlso links={[{ href: "/mechanics/bard#songs", label: "Bard Songs" }]} />
  </Topic>

  <Topic id="follow-up-attacks">
    <!-- Source: server-scripts/PlayerSkills.cs:StartDefaultAttackAfterMeleeSkill — non-spell Weapon or Shield TargetDamageSkill or damaging TargetDebuffSkill casts queue the learned/default followupDefaultAttack on an attackable current target when no follow-up exists and CheckWeapon passes. -->
    <p>
      After a non-spell weapon or shield skill that damages one target, or
      applies a damaging debuff to it, you continue with your selected auto
      attack if your weapon can use it and it is learned or available by
      default. This does not replace an auto attack already queued.
    </p>
    <!-- Source: server-scripts/Skills.cs:StartCast — an invisibility buff clears the pending skill and the follow-up auto attack. -->
    <p>
      Casting an invisibility buff cancels your queued skill and follow-up auto
      attack.
    </p>
  </Topic>
</Chapter>
