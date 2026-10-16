<script lang="ts">
  import RoundedTerm from "$lib/components/RoundedTerm.svelte";
  import Chapter from "$lib/components/reference/Chapter.svelte";
  import Formula from "$lib/components/reference/Formula.svelte";
  import GameBug from "$lib/components/reference/GameBug.svelte";
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
    <p>
      Direct hits use these steps in order. Each step uses the damage left by
      the previous step.
    </p>

    <h4>Before the roll</h4>
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
        Roll <a href="#avoidance">Block, Miss or Resist</a>, adjusted by
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
      <!-- Source: server-scripts/Combat.cs:794-801; Database.cs:CalculateSlayerLevelForAccount — at 10% mastery or more, Slayer reduces boss or elite damage to players and pets, using the owner's mastery for pets. -->
      <li>
        Apply <a href="/professions/slayer">Slayer</a> reduction to boss or elite
        hits on players, mercenaries, companions and familiars: 0.1% per percentage
        point of mastery from 10% mastery onward, up to 10%, rounded up. Mercenaries,
        companions and familiars use their owner's mastery.
      </li>
      <!-- Source: server-scripts/Combat.cs:DealDamageAt — Rampage adds 50–75% damage to monster/NPC non-spell hits below 10% Health. -->
      <li>
        A monster or NPC with <a href="/skills/rampage">Rampage</a> below 10% Health
        adds a random 50% to 75% damage to non-spell hits, rounded up.
      </li>
    </ol>

    <h4>Reduction and critical</h4>
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

    <h4>On-hit effects and Health</h4>
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
        of its damage, counting at most the target's current Health, rounded down.
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
        Reduce Health by the remaining damage, or let an eligible active
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
      Each attack starts from the stat in the table below, usually Attack Power
      or Spell Power from your character window. The skill's listed damage is
      added, then the total is multiplied by the skill's damage percentage and
      <RoundedTerm /> if that percentage is above zero. Scrolls use only their own
      listed damage. Each skill page has a calculator for its damage before defenses.
    </p>
    <!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; TargetProjectileSkill.cs:Apply; FrontalDamageSkill.cs:Apply; FrontalProjectilesSkill.cs:Apply; AreaDamageSkill.cs:Apply; AreaObjectSpawnSkill.cs:AreaObjectSpawner.ApplyDamageToEntities; EquipmentItem.cs:ToolTip — handlers choose stats by class, handler and element; ground marks use listed damage only; weapon tooltip damage is Base Damage. -->
    <RefTable caption="Starting damage by damage type">
      <thead>
        <tr>
          <th scope="col">Attack</th>
          <th scope="col">Starting damage</th>
        </tr>
      </thead>
      <tbody>
        <tr><th colspan="2" scope="rowgroup">Physical</th></tr>
        <tr>
          <th scope="row">Physical attacks, including monster attacks</th>
          <td>Attack Power</td>
        </tr>
        <tr>
          <th scope="row">Player targeted bow attacks</th>
          <td>Attack Power + 150% of Dexterity, <RoundedTerm /></td>
        </tr>
        <tr>
          <th scope="row">Mercenary bow attacks</th>
          <td>Attack Power + 150% of Dexterity, <RoundedTerm /></td>
        </tr>
      </tbody>
      <tbody>
        <tr><th colspan="2" scope="rowgroup">Poison</th></tr>
        <tr>
          <th scope="row">Rogue targeted attacks, including mercenaries</th>
          <td>Attack Power + 250% of Dexterity, <RoundedTerm /></td>
        </tr>
        <tr>
          <th scope="row">Player Rogue projectile and frontal attacks</th>
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
      A magic weapon attack's combined damage meets
      <a href="#resistance">Magic Resist</a> once. A Ranger's
      <a href="#wild-strike">Wild Strike</a> follows its empowered auto-attack rule.
    </p>

    <h4>Weapon deductions</h4>
    <!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; TargetProjectileSkill.cs:Apply; FrontalDamageSkill.cs:Apply; FrontalProjectilesSkill.cs:Apply; EquipmentItem.cs:ToolTip — player Ranger targeted and frontal damage subtract bow Base Damage, player Rogue targeted damage subtracts half off-hand Base Damage rounded up, player bow attacks subtract main-hand Base Damage, and mercenaries and Ranger frontal projectiles retain weapon damage. -->
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
          <td>Bow's Base Damage</td>
        </tr>
        <tr>
          <th scope="row"
            >Player Rogue targeted damage skills of any damage type</th
          >
          <td>50% of off-hand weapon's Base Damage, rounded up</td>
        </tr>
        <tr>
          <th scope="row">Player targeted bow attacks</th>
          <td>Main-hand weapon's Base Damage</td>
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
    <!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage — the deduction comes off the selected stat before the skill's listed damage is added and its damage percentage applies. -->
    <p>
      Each deduction comes off the starting stat before the skill's listed
      damage is added.
    </p>
    <!-- Source: server-scripts/TargetProjectileSkill.cs:189-200; Equipment.cs:515-525 — with no main-hand weapon, a bow attack subtracts the bow's own damage. -->
    <GameBug>
      With only a bow equipped, a Ranger's bow attack loses the bow's Base
      Damage. Equip a melee weapon in the main hand to avoid this.
    </GameBug>
    <!-- Source: server-scripts/Equipment.cs:230-247; TargetDamageSkill.cs:223-232; FrontalDamageSkill.cs:88-92 — broken slot 13 equipment adds no damage but is still subtracted from melee damage. -->
    <GameBug>
      A broken bow still subtracts its full Base Damage from Ranger melee
      attacks. A broken off-hand weapon subtracts half its Base Damage, rounded
      up, from Rogue melee attacks. Repair or unequip the broken item.
    </GameBug>
    <h4>Character window Attack Power and Spell Power</h4>
    <!-- Source: server-scripts/Combat.cs:damage,magicDamage; Strength.cs:GetDamageBonus; Intelligence.cs:GetMagicDamageBonus — percentage damage applies to the full flat stat; only the Intelligence addition and percentage addition round, not the flat-stat sum. -->
    <Formula calculation={characterDamageCalculation} />
  </Topic>

  <Topic id="critical-hits">
    <!-- Source: server-scripts/Combat.cs:ApplyCriticalResistToMultiplier,criticalResist,DealDamageAt — normal critical hits add 50% damage scaled by one minus target Critical Resist bounded to 0–100%, then round the full hit. -->
    <p>
      A critical hit adds 50% damage after damage reduction. The target's
      Critical Resist, between 0% and 100%, reduces that extra damage: damage ×
      (100% + 50% × (100% − Critical Resist)), <RoundedTerm />.
    </p>
    <!-- Source: server-scripts/Combat.cs:criticalChance,DealDamageAt — critical rolls require more than 3 mitigated damage, use Critical Strike capped at 70%, and skip monster AreaDamageSkill hits. -->
    <ul>
      <li>The chance is the attacker's Critical Strike, up to 70%.</li>
      <li>Critical checks require more than 3 damage after reduction.</li>
      <li>Monster area damage skills skip the critical check.</li>
    </ul>
    <!-- Source: server-scripts/Combat.cs:criticalChance,DealDamageAt; Player.cs:isRadiantAetherActivated,TryConsumeRadiantAether — Critical Chance caps at 70%, interrupted gathering actions add 75 percentage points, and non-auto critical hits roll 15% to consume Radiant Aether from the first 24 inventory slots. -->
    <p>
      A hit that <a href="#combat-advantage">interrupts a gathering action</a>
      adds 75 percentage points to the critical chance after the 70% cap. Carrying
      <a href="/items/radiant_aether">Radiant Aether</a> in your first 24 inventory
      slots gives each critical hit from a skill other than an auto attack a 15% chance
      to consume one. That hit adds 200% extra damage instead of 50%, before Critical
      Resist reduces the bonus.
    </p>
    <!-- Source: server-scripts/Combat.cs:981-992,1345-1354 — a killing hit or damage shield on a player first rolls the same 15% Radiant Aether chance and restores full Health on success. -->
    <p>Radiant Aether in those slots can also save you from a killing blow.</p>
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
    <!-- Source: server-scripts/Combat.cs:787-792 — Improved Backstab and Rogue mercenaries use 25% instead of the normal 10% from-behind extra damage. -->
    <p>
      <a href="/skills/improved_backstab">Improved Backstab</a> and Rogue mercenaries
      raise the from-behind extra damage from 10% to 25%.
    </p>
    <!-- Source: server-scripts/Combat.cs:704-708 — against a moving player, stunChance gains Clamp(0.1 − 0.01 × level difference, 0.01, 0.1), capped at 1, and stunTime is at least 0.5 seconds. -->
    <p>
      Against a moving player, physical hits from attackers above level 5 add 10
      percentage points of stun chance minus 1 percentage point per target level
      above the attacker. The addition stays between 1 and 10 percentage points,
      total stun chance stays at most 100%, and stun duration is at least 0.5
      seconds.
    </p>
    <!-- Source: server-scripts/Combat.cs:DealDamageAt; PlayerSkills.cs:CmdUse — Fishing, Gathering, Mining, Digging and Opening occupy slots 19,22,23,26,27; hitting those casts cancels them and grants damage advantage plus 75 percentage points of Critical Chance. -->
    <p>
      A hit on a player who is fishing, gathering, mining, digging or opening
      something cancels that action and adds the from-behind damage bonus. It
      also receives the <a href="#critical-hits"
        >interrupted-action critical chance</a
      >. Avoidance still follows the attack's position and the target's
      movement.
    </p>
  </Topic>

  <Topic id="weapon-on-hit-effects">
    <!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; ProjectileSkillEffect.cs:FixedUpdate — weapon effects roll before the hit; broken melee weapons are excluded, and Rogue off-hand chance is halved. -->
    <p>
      Each melee or bow auto attack rolls the weapon's listed on-hit chance,
      even when the attack then misses.
    </p>
    <!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; ProjectileSkillEffect.cs:FixedUpdate — broken melee weapons are excluded from on-hit rolls, and Rogue off-hand chance is halved. -->
    <ul>
      <li>A broken melee weapon never triggers its effect.</li>
      <li>
        A Rogue's off-hand weapon triggers its effect at half the listed chance.
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
