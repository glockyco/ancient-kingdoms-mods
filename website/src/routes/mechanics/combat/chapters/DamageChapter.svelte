<script lang="ts">
  import { statName } from "$lib/stats";
  import RoundedTerm from "$lib/components/RoundedTerm.svelte";
  import Chapter from "$lib/components/reference/Chapter.svelte";
  import Formula from "$lib/components/reference/Formula.svelte";
  import RefTable from "$lib/components/reference/RefTable.svelte";
  import Topic from "$lib/components/reference/Topic.svelte";
  import {
    advantageCalculation,
    characterDamageCalculation,
    pipelineCalculation,
  } from "$lib/calculation/combat-rules";
</script>

<Chapter id="damage">
  <Topic id="damage-pipeline">
    <!-- Source: server-scripts/Combat.cs:684-886,894-1018,1182-1409 — ordered direct-hit pipeline, including avoidance, moving damage, on-hit effects, resource gains, shields, lifetap, and critical scaling. -->
    <p>Direct hits use these steps in order.</p>

    <h4>Before avoidance</h4>
    <ol>
      <!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; TargetProjectileSkill.cs:Apply; FrontalDamageSkill.cs:Apply — the skill calculates its damage before the target's defenses. -->
      <li>
        Calculate the skill's <a href="#damage-formulas">starting damage</a>.
      </li>
      <!-- Source: server-scripts/Combat.cs:700-703 — moving-player damage increases before the avoidance roll. -->
      <li>
        Apply the <a href="#combat-advantage">moving-player damage bonus</a>.
      </li>
    </ol>

    <h4>Avoidance</h4>
    <ol start="3">
      <!-- Source: server-scripts/Combat.cs:684-745 — positional and moving-player adjustments precede the block, miss or resist roll, which ends an avoided hit. -->
      <li>
        Roll to <a href="#avoidance">block, miss or resist</a>, adjusted by
        <a href="#combat-advantage">Combat Advantage</a>. Avoiding the hit ends
        it.
      </li>
    </ol>

    <h4>Damage modifiers</h4>
    <ol start="4">
      <!-- Source: server-scripts/Combat.cs:787 — variance multiplies damage by a random factor from 0.9 to 1.1 and applies RoundToInt. -->
      <li>Multiply damage by a random 90% to 110%, <RoundedTerm />.</li>
      <!-- Source: server-scripts/Combat.cs:787-792 — the from-behind damage bonus follows variance. -->
      <li>
        Apply the <a href="#combat-advantage">from-behind damage bonus</a>.
      </li>
      <!-- Source: server-scripts/Combat.cs:793 — the level adjustment is bounded to −20–20% before its damage rounds up and is added. -->
      <li>
        Add 2% damage per level above the target, or subtract 2% per level below
        it, limiting the adjustment to −20% through +20% and rounding it up.
      </li>
      <!-- Source: server-scripts/Combat.cs:794-801; Database.cs:CalculateSlayerLevelForAccount — at 10% mastery or more, Slayer reduces boss or elite damage to players and pets, using the player's mastery for pets. -->
      <li>
        Once your <a href="/professions/slayer">Slayer</a> mastery reaches 10%, boss
        and elite hits on players, mercenaries, companions and familiars lose 0.1%
        of their damage per percentage point of mastery, up to 10% at 100% mastery,
        with the damage prevented rounded up. Your mercenaries, companions and familiars
        use your mastery.
      </li>
      <!-- Source: server-scripts/Combat.cs:DealDamageAt — Rampage adds 50–75% damage to monster/NPC non-spell hits below 10% Health. -->
      <li>
        A monster or NPC with <a href="/skills/rampage">Rampage</a> adds a random
        50% to 75% damage to its non-spell hits while below 10% of its maximum Hit
        Points, rounded up.
      </li>
    </ol>

    <h4>Damage reduction and critical hits</h4>
    <ol start="9">
      <!-- Source: server-scripts/Combat.cs:853-873 — the matching defense reduces hit damage. -->
      <li>
        Subtract damage prevented by <a href="#mitigation">damage reduction</a>.
      </li>
      <!-- Source: server-scripts/Combat.cs:875-892 — eligible critical hits scale mitigated damage and round. -->
      <li>
        Roll for a <a href="#critical-hits">critical hit</a> and apply its bonus.
      </li>
    </ol>

    <h4>On-hit effects and {statName("health")}</h4>
    <ol start="11">
      <!-- Source: server-scripts/Combat.cs:894-923 — a non-spell melee DamageSkill hit heals the attacker by each of the target's buffs' healOnHitPercent of the damage, rounded, before damage shields. -->
      <li>
        A non-spell melee hit on a target affected by
        <a href="/skills/root">Root</a> heals the attacker for Root's Heal on
        Hit percentage of the damage, <RoundedTerm />. Then the target's
        <a href="#damage-shields">damage shields</a> hurt the attacker. Neither changes
        this hit's damage.
      </li>
      <!-- Source: server-scripts/Combat.cs:1007-1018,1182-1235,1386-1409 — eligible dealt and received-hit Rage is granted before Ward and Mana Shield. -->
      <!-- Source: server-scripts/Combat.cs:1236-1244 — a Wizard's Mystic Spark restores 35% of the damage, counting at most the victim's current Health, rounded down. -->
      <li>
        Grant eligible <a href="#rage-generation">Rage from hits</a>. A Wizard's
        <a href="/skills/mystic_spark">Mystic Spark</a> restores Mana equal to 35%
        of its damage, counting at most the target's current Hit Points, rounded down.
      </li>
      <!-- Source: server-scripts/Combat.cs:1245-1325 — Ward absorbs damage before Mana Shield. -->
      <li>
        Subtract <a href="#ward-and-mana-shield">Ward, then Mana Shield</a> absorption.
      </li>
      <!-- Source: server-scripts/Combat.cs:1326-1344 — lifetap uses remaining positive damage after shields. -->
      <li>
        Calculate <a href="#lifetap">lifetap</a> from the remaining positive damage.
      </li>
      <!-- Source: server-scripts/Combat.cs:1326-1409 — damage after shields reaches Health unless an eligible active Parry blocks and counterattacks. -->
      <li>
        Reduce Hit Points by the remaining damage, or let an eligible active
        <a href="#parry">Parry</a> block it and counterattack.
      </li>
    </ol>

    <!-- Source: server-scripts/Combat.cs:684-886,894-1018,1182-1409 — ordered direct-hit pipeline, including avoidance, moving damage, on-hit effects, resource gains, shields, lifetap, and critical scaling. -->
    <Formula calculation={pipelineCalculation} showSteps={false} />

    <!-- Source: server-scripts/Combat.cs:DealDamageAt — Rageblow and Mana Burn bypass avoidance and mitigation but still receive random damage variation, Combat Advantage, level adjustment, critical checks, Ward and Mana Shield. -->
    <p>
      <a href="/skills/rageblow">Rageblow</a> and
      <a href="/skills/mana_burn">Mana Burn</a> bypass avoidance and damage reduction.
      They still receive random variance, Combat Advantage, level adjustment and eligible
      critical hits. Ward and Mana Shield still absorb their damage.
    </p>
  </Topic>

  <Topic id="damage-formulas">
    <!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; TargetProjectileSkill.cs:Apply; FrontalDamageSkill.cs:Apply — attacks add flat skill damage, then round after a positive skill multiplier. Scrolls use only skill damage. -->
    <p>
      For most attacks, take the starting stat in the table below, using Attack
      Power and Spell Power from your character window. Subtract any weapon
      deduction, then add the skill's listed damage. If the skill lists a Damage
      %, multiply that total by it, <RoundedTerm />.
    </p>
    <p>
      Final Cadence, ground-marking skills, Rageblow and Mana Burn use the whole
      formula in their row instead. Scrolls use only their own listed damage.
      Each skill page has a calculator for its damage before defenses.
    </p>
    <!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; TargetProjectileSkill.cs:Apply; FrontalDamageSkill.cs:Apply; FrontalProjectilesSkill.cs:Apply; AreaDamageSkill.cs:Apply; AreaObjectSpawnSkill.cs:AreaObjectSpawner.ApplyDamageToEntities; EquipmentItem.cs:ToolTip — handlers choose stats by class, handler and element; ground marks use listed damage only; weapon tooltip damage is Base Damage. -->
    <RefTable caption="Starting damage by damage type">
      <thead>
        <tr>
          <th scope="col">Attack</th>
          <th scope="col">Starts from</th>
        </tr>
      </thead>
      <tbody>
        <tr><th colspan="2" scope="rowgroup">Physical</th></tr>
        <tr>
          <th scope="row">Physical attacks, including monster attacks</th>
          <td>Attack Power</td>
        </tr>
        <tr>
          <th scope="row">Player targeted and mercenary bow attacks</th>
          <td>Attack Power + 150% of Dexterity, <RoundedTerm /></td>
        </tr>
      </tbody>
      <tbody>
        <tr><th colspan="2" scope="rowgroup">Poison</th></tr>
        <tr>
          <th scope="row">
            Rogue and Rogue mercenary targeted attacks, and player Rogue
            projectile and frontal attacks
          </th>
          <td>Attack Power + 250% of Dexterity, <RoundedTerm /></td>
        </tr>
        <tr>
          <th scope="row">
            Other classes' targeted, projectile and frontal-projectile attacks,
            such as <a href="/skills/poison_spray">Poison Spray</a>
          </th>
          <td>Spell Power, except Ranger frontal projectiles below</td>
        </tr>
        <tr>
          <th scope="row">Monster targeted and projectile attacks</th>
          <td>Spell Power</td>
        </tr>
        <tr>
          <th scope="row">Area attacks</th>
          <td>Attack Power</td>
        </tr>
      </tbody>
      <tbody>
        <tr
          ><th colspan="2" scope="rowgroup">Magic, fire, cold and disease</th
          ></tr
        >
        <tr>
          <th scope="row">Spells, including monster spells</th>
          <td>Spell Power, except Ranger frontal projectiles below</td>
        </tr>
        <tr>
          <th scope="row">Magic weapon attacks</th>
          <td>Spell Power + Attack Power</td>
        </tr>
        <tr>
          <th scope="row"
            >Player <a href="/skills/final_cadence">Final Cadence</a></th
          >
          <td
            >Listed damage × song power, <RoundedTerm />, then × (100% + Melody
            bonus),
            <RoundedTerm /></td
          >
        </tr>
        <tr>
          <th scope="row"
            >Mercenary <a href="/skills/final_cadence">Final Cadence</a></th
          >
          <td>Listed damage × song power, <RoundedTerm /></td>
        </tr>
      </tbody>
      <tbody>
        <tr><th colspan="2" scope="rowgroup">Any damage type</th></tr>
        <tr>
          <th scope="row">
            Ranger frontal projectiles, such as
            <a href="/skills/forest_guardians_aid">Forest Guardians Aid</a>
          </th>
          <td>Attack Power + 150% of Dexterity, <RoundedTerm /></td>
        </tr>
        <tr>
          <th scope="row"
            ><a href="#ground-area-damage">Ground-marking skills</a></th
          >
          <td>Listed skill damage only</td>
        </tr>
      </tbody>
      <tbody>
        <tr><th colspan="2" scope="rowgroup">Resource-based attacks</th></tr>
        <tr>
          <th scope="row"><a href="/skills/rageblow">Rageblow</a></th>
          <td>200% of current Rage, spending all Rage</td>
        </tr>
        <tr>
          <th scope="row"><a href="/skills/mana_burn">Mana Burn</a></th>
          <td>300% of current Mana, spending all Mana</td>
        </tr>
      </tbody>
    </RefTable>
    <!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; FrontalDamageSkill.cs:Apply; Combat.cs:DealDamageAt — magic weapon attacks combine Spell Power and Attack Power in one magic hit. -->
    <p>
      A magic weapon attack is one magic hit, so
      <a href="#resistance">Magic Resist</a> reduces all of its damage and Armor
      Class does not apply. An auto attack empowered by a Ranger's
      <a href="#wild-strike">Wild Strike</a> deals magic damage but keeps its own
      starting damage.
    </p>

    <h4>Weapon deductions</h4>
    <!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; TargetProjectileSkill.cs:Apply; FrontalDamageSkill.cs:Apply; FrontalProjectilesSkill.cs:Apply; EquipmentItem.cs:ToolTip — player Ranger targeted and frontal damage subtract bow Base Damage, player Rogue targeted damage subtracts half off-hand Base Damage rounded up, player bow attacks subtract the Base Damage of a main-hand weapon, each only while the weapon has durability left, and mercenaries and Ranger frontal projectiles retain weapon damage. -->
    <!-- Source: website/data/compendium.db skills.skill_type — Swift Slash is a Ranger target_damage skill and Forest Guardians Aid a Ranger frontal_projectiles skill. -->
    <RefTable caption="Weapon damage deducted from starting damage">
      <thead>
        <tr>
          <th scope="col">Attack</th>
          <th scope="col">Deduction</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">
            Player Ranger targeted and frontal damage skills, such as
            <a href="/skills/swift_slash">Swift Slash</a>
          </th>
          <td>Bow's Base Damage, unless it is broken</td>
        </tr>
        <tr>
          <th scope="row"
            >Player Rogue targeted damage skills of any damage type</th
          >
          <td>
            50% of off-hand weapon's Base Damage, rounded up, unless it is
            broken
          </td>
        </tr>
        <tr>
          <th scope="row">Player targeted bow attacks</th>
          <td>Main-hand weapon's Base Damage, unless it is broken</td>
        </tr>
        <tr>
          <th scope="row">
            Ranger frontal projectiles, such as
            <a href="/skills/forest_guardians_aid">Forest Guardians Aid</a>, and
            every mercenary attack
          </th>
          <td>
            None. Weapon damage stays in Attack Power, including a Rogue
            mercenary's full off-hand damage
          </td>
        </tr>
      </tbody>
    </RefTable>
    <h4>Character window Attack Power and Spell Power</h4>
    <!-- Source: server-scripts/Combat.cs:damage,magicDamage; Strength.cs:GetDamageBonus; Intelligence.cs:GetMagicDamageBonus — percentage damage applies to the full flat stat; only the Intelligence addition and percentage addition round, not the flat-stat sum. -->
    <Formula calculation={characterDamageCalculation} />
  </Topic>

  <Topic id="critical-hits">
    <!-- Source: server-scripts/Combat.cs:ApplyCriticalResistToMultiplier,criticalResist,DealDamageAt — normal critical hits add 50% damage scaled by one minus target Critical Resist bounded to 0–100%, then round the full hit. -->
    <p>
      A critical hit adds 50% damage after damage reduction. Multiply that extra
      damage by 100% minus the target's Critical Resist, limited to 0% through
      100%.
    </p>
    <p>The final critical damage is <RoundedTerm />.</p>
    <!-- Source: server-scripts/Combat.cs:criticalChance,DealDamageAt — critical rolls require more than 3 mitigated damage, use Critical Strike capped at 70%, and skip monster AreaDamageSkill hits. -->
    <ul>
      <li>The chance is the attacker's Critical Strike, up to 70%.</li>
      <li>Critical checks require more than 3 damage after reduction.</li>
      <li>Monster area damage skills skip the critical check.</li>
    </ul>
    <!-- Source: server-scripts/Combat.cs:criticalChance,DealDamageAt; Player.cs:isRadiantAetherActivated,TryConsumeRadiantAether — Critical Chance caps at 70%, interrupted gathering actions add 75 percentage points, and non-auto critical hits roll 15% to consume Radiant Aether from the first 24 inventory slots. -->
    <p>
      A hit that interrupts fishing, gathering, mining, digging or opening adds
      75 percentage points to the critical chance after the 70% cap.
    </p>
    <p>
      Carrying <a href="/items/radiant_aether">Radiant Aether</a> in your first 24
      inventory slots gives each critical hit from a skill other than an auto attack
      a 15% chance to consume one. That hit adds 200% extra damage instead of 50%,
      before Critical Resist reduces the bonus.
    </p>
    <!-- Source: server-scripts/Combat.cs:981-992,1345-1354 — a killing hit or damage shield on a player first rolls the same 15% Radiant Aether chance and restores full Health on success. -->
    <p>
      Damage from a hit or a damage shield that would kill you has a 15% chance
      to consume one Radiant Aether from those slots and restore your Hit Points
      to full instead.
    </p>
  </Topic>

  <Topic id="combat-advantage">
    <!-- Source: server-scripts/Combat.cs:DealDamageAt — only TargetDamageSkill and TargetProjectileSkill gain positional advantage when look directions match. -->
    <p>
      Single-target attacks, including targeted skills, targeted projectiles and
      auto attacks, gain from-behind advantage when attacker and target face the
      same direction. Hits on a moving player also gain an advantage.
    </p>
    <!-- Source: server-scripts/Combat.cs:684-703,787-792 — targeted damage and projectile skills gain advantage when both look directions match; resist chance is multiplied by 0.8, and damage gains 10% rounded up plus 1. -->
    <Formula calculation={advantageCalculation} />
    <!-- Source: server-scripts/Combat.cs:704-708 — against a moving player, stunChance gains Clamp(0.1 − 0.01 × level difference, 0.01, 0.1), capped at 1, and stunTime is at least 0.5 seconds. -->
    <p>
      Against a moving player, physical hits from attackers above level 5 gain
      extra stun chance: 10 percentage points minus 1 for each level the target
      is above the attacker, at least 1 percentage point and at most 10. Total
      stun chance is at most 100%, and the stun lasts at least 0.5 seconds.
    </p>
    <!-- Source: server-scripts/Combat.cs:DealDamageAt; PlayerSkills.cs:CmdUse — Fishing, Gathering, Mining, Digging and Opening occupy slots 19,22,23,26,27; hitting those casts cancels them and grants damage advantage plus 75 percentage points of Critical Chance. -->
    <p>
      A hit on a player who is fishing, gathering, mining, digging or opening
      something cancels that action and adds the from-behind damage bonus. It
      also gains <a href="#critical-hits"
        >75 percentage points of critical chance</a
      >. Avoidance still follows the attack's position and the target's
      movement.
    </p>
  </Topic>

  <Topic id="weapon-on-hit-effects">
    <!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; ProjectileSkillEffect.cs:FixedUpdate — weapon effects roll before the hit; broken weapons and spell-cast effects are excluded, and Rogue off-hand chance is halved. -->
    <p>
      Each melee or bow auto attack rolls the weapon's listed on-hit chance,
      even when the attack then misses.
    </p>
    <ul>
      <li>A broken weapon never triggers its effect.</li>
      <li>
        A Rogue's off-hand weapon triggers its effect at half the listed chance.
      </li>
      <!-- Source: server-scripts/Skills.cs:ApplyFinishedCast,TrySpellCastWeaponProc; PlayerSkills.cs:UpdateChannel; NecromancerMercenarySkills.cs:UpdateCast — a main-hand weapon flagged procOnSpellCast rolls once after a damage spell or damage-over-time debuff spell finishes, or after a channel's last pulse, and never on auto attacks. -->
      <li>
        A main-hand weapon with a spell-cast effect rolls its chance once when
        you finish a damaging spell or the last pulse of a channel, and never on
        auto attacks.
      </li>
    </ul>
  </Topic>

  <Topic id="ground-area-damage">
    <!-- Source: server-scripts/AreaObjectSpawnSkill.cs:AreaObjectSpawner.ApplyDamageToEntities — damage is halved and rounded for any Pet target, while players receive the listed damage. -->
    <p>
      Skills that mark a danger zone before dealing damage hit mercenaries,
      companions and familiars for half their listed damage, <RoundedTerm />.
      Players take the listed damage.
    </p>
  </Topic>
</Chapter>
