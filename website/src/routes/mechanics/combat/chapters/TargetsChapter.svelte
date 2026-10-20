<script lang="ts">
  import Chapter from "$lib/components/reference/Chapter.svelte";
  import SeeAlso from "$lib/components/reference/SeeAlso.svelte";
  import Topic from "$lib/components/reference/Topic.svelte";
</script>

<Chapter id="targeting">
  <Topic id="targets">
    <!-- Source: server-scripts/Player.cs:4455-4465; PlayerSkills.cs:843-879 — players attack living monsters or NPCs, exclude charmed monsters, and choose the closest attackable monster within 10 units when a targeted attack lacks a valid target. -->
    <p>
      Players can attack living monsters and NPCs. Other players and
      <a href="/mechanics/bard#charm">Bard-charmed</a> monsters are protected from
      player attacks. A targeted attack without a valid target selects the nearest
      non-hidden, attackable monster within 10 yd if one exists.
    </p>
    <!-- Source: server-scripts/Player.cs:CanAttack; Pet.cs:CanAttack; PlayerSkills.cs:719-723; UISettings.cs:ProtectFriendlyNpcs — the setting defaults on and blocks player, companion and mercenary attacks and targeted damage or debuff casts on protected NPCs. -->
    <!-- Source: server-scripts/UISettings.cs:InitializeFriendlyNpcToggle — the toggle's protect_friendly_npcs label reads "Protect NPCs" in the English localization table, read in the running game. -->
    <!-- Source: server-scripts/Player.cs:IsProtectedFriendlyNpc; Entity.cs:checkAggro — a faction NPC is protected while reputation exceeds the factionNeeded that also stops its aggro, other NPCs always, and an NPC targeting the player, a party member or their pets is exempt. -->
    <p>
      The Protect NPCs setting, on by default, stops you, your companions and
      your mercenaries from attacking friendly NPCs. An NPC without a faction
      always counts as friendly. A faction's NPC counts as friendly while your
      reputation is high enough that it would not attack you on sight. You can
      always fight an NPC attacking you, a party member, or a companion or
      mercenary belonging to you or a party member.
    </p>
    <!-- Source: server-scripts/TargetHealSkill.cs:CorrectedTarget,83-135; PlayerSkills.cs:819-842 — heal targets depend on canHealSelf/canHealOthers; a selected monster can redirect a heal to its player or pet target; resurrection requires remains or a dead mercenary. -->
    <ul>
      <li>
        A targeted heal can reach yourself, another player, or a mercenary,
        companion or familiar when the skill permits it. Self-only heals target
        you.
      </li>
      <li>
        With a monster selected, a targeted heal can go to the player,
        mercenary, companion or familiar the monster is attacking.
      </li>
      <li>Resurrection targets only player remains or a dead mercenary.</li>
    </ul>
  </Topic>

  <Topic id="casting">
    <!-- Source: server-scripts/PlayerSkills.cs:709-713,804-810,880-962 — learned status, readiness, resources, equipment and ammunition are checked. -->
    <p>
      Casting requires a learned, ready skill, enough Mana or Rage, suitable
      equipment, and ammunition for applicable projectiles.
    </p>
    <!-- Source: server-scripts/PlayerSkills.cs:911-942 — out-of-range and obscured targets can start navigation and queue the cast. -->
    <p>
      When the target is out of range or out of sight, your character moves
      closer and then casts.
    </p>
    <!-- Source: server-scripts/PlayerSkills.cs:CastTarget,FinishCast; Player.cs:UpdateServer_CASTING — a cast with a cast time keeps the target selected when it started, finishes on it, and is cancelled when that target disappears or dies, if the skill cancels on a dead target. -->
    <p>
      A skill with a cast time lands on the target you had when the cast began.
      Selecting another target during the cast does not redirect it.
    </p>
    <!-- Source: server-scripts/PlayerSkills.cs:709-713 — fear and stun block normal skill use. -->
    <!-- Source: server-scripts/PlayerSkills.cs:703-713 — active NecromancerReaperFormSkill and Fearless Stance are removed before the FEAR/STUNNED gate. -->
    <p>
      Fear and stun block skill use, except dismissing an active
      <a href="/skills/reaper_form">Reaper Form</a> or
      <a href="/skills/fearless_stance">Fearless Stance</a>.
    </p>
    <!-- Source: server-scripts/PlayerSkills.cs:1025-1084,1230-1259 — Bard song use and repetition continue while moving or casting ordinary skills. -->
    <p>Bard songs can continue while you move or use combat skills.</p>
    <SeeAlso links={[{ href: "/mechanics/bard#songs", label: "Bard Songs" }]} />
  </Topic>

  <Topic id="follow-up-attacks">
    <!-- Source: server-scripts/PlayerSkills.cs:StartDefaultAttackAfterMeleeSkill — non-spell Weapon or Shield TargetDamageSkill or damaging TargetDebuffSkill casts queue the learned/default followupDefaultAttack on an attackable current target when no follow-up exists and CheckWeapon passes. -->
    <p>
      Non-spell weapon or shield skills that damage one target, directly or with
      a debuff, resume your chosen auto attack if your weapon supports it. An
      already queued auto attack is kept.
    </p>
    <!-- Source: server-scripts/Skills.cs:StartCast — an invisibility buff clears the pending skill and the follow-up auto attack. -->
    <p>
      Casting an invisibility buff cancels your queued skill and follow-up auto
      attack.
    </p>
  </Topic>
</Chapter>
