<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import * as Card from "$lib/components/ui/card";
  import { Alert } from "$lib/components/ui/alert";
  import Seo from "$lib/components/Seo.svelte";
  import Calculation from "$lib/components/Calculation.svelte";
  import {
    mitigationCalculation,
    avoidanceCalculation,
    healingCalculation,
    songCalculation,
    buffCalculation,
    BUFF_EFFECTS,
    type BuffEffect,
    timingCalculation,
    lifetapCalculation,
    receivedHitCalculation,
  } from "$lib/calculation/combat";
  import {
    characterDamageCalculation,
    pipelineCalculation,
    advantageCalculation,
    damageOverTimeCalculation,
    threatCalculation,
    cleanseCalculation,
    dispelCalculation,
    dealtRageCalculation,
  } from "$lib/calculation/combat-rules";
  import Info from "@lucide/svelte/icons/info";
  import { formatSeconds as seconds } from "$lib/calculation/format";
  import {
    DEFENSE,
    MAGIC_RESIST,
    FIRE_RESIST,
    COLD_RESIST,
    POISON_RESIST,
    DISEASE_RESIST,
  } from "$lib/calculation/inputs";
  const MITIGATION_STATS = [
    DEFENSE,
    MAGIC_RESIST,
    FIRE_RESIST,
    COLD_RESIST,
    POISON_RESIST,
    DISEASE_RESIST,
  ];
  let mitigationKey = $state(DEFENSE.key);
  const mitigationStat = $derived(
    MITIGATION_STATS.find((stat) => stat.key === mitigationKey) ?? DEFENSE,
  );
  let buffEffect = $state<BuffEffect>("defense");

  const SECTIONS = [
    { id: "targeting", label: "Targets, Range and Casting" },
    { id: "damage-pipeline", label: "Damage Pipeline" },
    { id: "damage-formulas", label: "Damage Formulas" },
    { id: "resistance", label: "Resistance & Mitigation" },
    { id: "combat-advantage", label: "Combat Advantage" },
    { id: "healing", label: "Healing" },
    { id: "buffs", label: "Buff Scaling" },
    { id: "effects-and-control", label: "Buffs, Debuffs, Wards and Cleanse" },
    { id: "debuffs", label: "Debuff Mechanics" },
    { id: "timing", label: "Timing & Haste" },
    { id: "special", label: "Special Mechanics" },
  ];

  // Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; TargetProjectileSkill.cs:Apply; FrontalDamageSkill.cs:Apply; FrontalProjectilesSkill.cs:Apply; AreaDamageSkill.cs:Apply; AreaObjectSpawnSkill.cs:AreaObjectSpawner.ApplyDamageToEntities; EquipmentItem.cs:ToolTip — handlers choose stats by class, handler and element; ground marks use listed damage only; weapon tooltip damage is Base Damage.
  const DAMAGE_FORMULAS = [
    ["Physical", "Other physical attacks", "Attack Power"],
    [
      "Physical",
      "Ranger targeted and frontal melee",
      "Attack Power − the bow's Base Damage",
    ],
    [
      "Physical",
      "Rogue targeted melee",
      "Attack Power − 50% of the off-hand weapon's Base Damage, with the subtraction rounded up",
    ],
    [
      "Physical",
      "Rogue mercenary melee",
      "Attack Power, including full damage from both weapons",
    ],
    [
      "Ranged",
      "Player targeted bow attacks",
      "Attack Power + 150% of Dexterity, rounded, − the main-hand weapon's Base Damage",
    ],
    [
      "Ranged",
      "Ranger frontal projectile attacks of any damage type, such as Forest Guardians Aid",
      "Attack Power + 150% of Dexterity, rounded, including melee weapon damage",
    ],
    [
      "Ranged",
      "Mercenary bow attacks",
      "Attack Power + 150% of Dexterity, rounded, including melee weapon damage",
    ],
    [
      "Poison",
      "Rogue targeted poison attacks",
      "Attack Power + 250% of Dexterity, rounded, − 50% of the off-hand weapon's Base Damage, with the subtraction rounded up. Mercenaries retain full off-hand damage",
    ],
    [
      "Poison",
      "Player Rogue projectile and frontal poison attacks",
      "Attack Power + 250% of Dexterity, rounded",
    ],
    [
      "Poison",
      "Other classes' targeted, projectile and frontal-projectile poison attacks, such as Poison Spray",
      "Spell Power, except Ranger frontal projectiles",
    ],
    ["Poison", "Area poison attacks", "Attack Power"],
    [
      "Magic",
      "Magic, fire, cold, and disease spells, except Ranger frontal projectiles",
      "Spell Power. Ranger targeted and frontal damage skills still subtract the bow's Base Damage, and Rogue targeted damage skills still subtract half the off-hand weapon's Base Damage, rounded up",
    ],
    [
      "Magic",
      "Final Cadence",
      "Base skill damage × song power, rounded, then × (100% + Melody bonus), rounded again. Mercenaries use song power alone",
    ],
    [
      "Magic",
      "Magic weapon attacks",
      "Spell Power + Attack Power. The combined hit meets Magic Resist once",
    ],
    [
      "Magic",
      "Rogue targeted magic weapon attacks",
      "Spell Power + Attack Power − 50% of the off-hand weapon's Base Damage, with the subtraction rounded up. The combined hit meets Magic Resist once",
    ],
    [
      "Magic",
      "Ranger magic weapon attacks",
      "Spell Power + Attack Power − the bow's Base Damage. Wild Strike uses its empowered auto-attack rule below",
    ],
    [
      "Special",
      "Rageblow and Mana Burn",
      "200% of current Rage for Rageblow, or 300% of current Mana for Mana Burn. Each spends all of that resource",
    ],
    [
      "Monster",
      "Monster physical and magic attacks",
      "The corresponding Attack Power or Spell Power stat, including level-based base damage and applicable bonuses. Targeted and projectile poison attacks use Spell Power. Skills that mark the ground before hitting use their listed damage only",
    ],
  ];
</script>

<Seo
  title="Combat Mechanics - Ancient Kingdoms"
  description="How damage, Armor Class and resistance, healing, Haste and Spell Casting Haste, and buff and debuff scaling work in Ancient Kingdoms combat."
  path="/mechanics/combat"
/>

<div class="combat-page container mx-auto p-4 sm:p-8 space-y-8 max-w-4xl">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "Combat" },
    ]}
  />

  <h1 class="text-4xl font-bold">Combat Mechanics</h1>

  <PageSections sections={SECTIONS} />

  <!-- Source: server-scripts/Player.cs:4367-4377; PlayerSkills.cs:771-807 — players attack living monsters or NPCs, exclude charmed monsters, and choose the closest attackable monster within 10 units when a targeted attack lacks a valid target. -->
  <Card.Root id="targeting" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Targets, Range and Casting</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <p>
        <span class="block"
          >Players can attack living monsters and NPCs. Other players and
          <a
            href="/mechanics/bard#charm"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Bard-charmed</a
          > monsters are protected from player attacks.</span
        >
        <span class="block"
          >A targeted attack without a valid target selects the nearest
          non-hidden, attackable monster within 10 yd if one exists.</span
        >
      </p>
      <!-- Source: server-scripts/Pet.cs:Pet,isMercenary,isFamiliar — pets include mercenaries, companions and familiars. -->
      <p>Here, “pets” means mercenaries, companions and familiars.</p>
      <!-- Source: server-scripts/TargetHealSkill.cs:CorrectedTarget,83-135; PlayerSkills.cs:747-770 — heal targets depend on canHealSelf/canHealOthers; a selected monster can redirect a heal to its player or pet target; resurrection requires remains or a dead mercenary. -->
      <p>
        <span class="block"
          >A targeted heal can reach yourself, another player, or a pet when the
          skill permits it.</span
        >
        <span class="block"
          >Selecting a monster can instead heal the player or pet it is
          attacking.</span
        >
        <span class="block">Self-only heals target you.</span>
        <span class="block"
          >Resurrection targets only player remains or a dead mercenary.</span
        >
      </p>
      <!-- Source: server-scripts/PlayerSkills.cs:642-646,732-738,808-890 — fear and stun block normal skill use; learned status, readiness, resources, equipment, ammunition, range, and visibility are checked. -->
      <!-- Source: server-scripts/PlayerSkills.cs:839-870 — out-of-range and obscured targets can start navigation and queue the cast. -->
      <p>
        <span class="block">Fear and stun block ordinary skill use.</span>
        <!-- Source: server-scripts/PlayerSkills.cs:636-646 — active NecromancerReaperFormSkill and Fearless Stance are removed before the FEAR/STUNNED gate. -->
        <span class="block"
          >You can still dismiss an active <a
            href="/skills/reaper_form"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Reaper Form</a
          >
          or
          <a
            href="/skills/fearless_stance"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Fearless Stance</a
          >.</span
        >
        <span class="block"
          >Casting also requires a learned, ready skill, enough Mana or Rage,
          suitable equipment, and ammunition for applicable projectiles.</span
        >
        <span class="block"
          >When a target is too far away or out of sight, your character can
          move closer before casting the queued skill.</span
        >
      </p>
      <!-- Source: server-scripts/Skills.cs:StartCast — invisibility buffs cancel both queued skills and auto-attack follow-ups. -->
      <!-- Source: server-scripts/PlayerSkills.cs:StartDefaultAttackAfterMeleeSkill — non-spell Weapon or Shield TargetDamageSkill or damaging TargetDebuffSkill casts queue the learned/default followupDefaultAttack on an attackable current target when no follow-up exists and CheckWeapon passes. -->
      <p>
        After a non-spell weapon or shield skill that damages one target, or
        applies a damaging debuff to it, you continue with your selected auto
        attack if your weapon can use it and it is learned or available by
        default. This does not replace an auto attack already queued. Casting an
        invisibility buff cancels the queued follow-up.
      </p>
      <!-- Source: server-scripts/PlayerSkills.cs:953-1012,1162-1191 — Bard song use and repetition continue while moving or casting ordinary skills. -->
      <p>
        <span class="block"
          >Bard songs can continue while you move or use combat skills.</span
        >
        <span class="block"
          >See <MechanicsLink section="bard#songs">Bard Songs</MechanicsLink
          >.</span
        >
      </p>
    </Card.Content>
  </Card.Root>

  <!-- Source: server-scripts/Combat.cs:673-875,883-1007,1171-1398 — ordered direct-hit pipeline, including avoidance, moving damage, on-hit effects, resource gains, shields, lifetap, and critical scaling. -->
  <Card.Root id="damage-pipeline" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Damage Pipeline</Card.Title>
      <Card.Description
        >Direct hits use these steps in order. Each step uses the damage left by
        the previous step.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4 text-sm">
      <Calculation calculation={pipelineCalculation} />
      <p class="text-muted-foreground">
        See <a
          href="#damage-formulas"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Damage Formulas</a
        >
        for the starting hit,
        <a
          href="#resistance"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Resistance and Mitigation</a
        >
        for avoidance and damage reduction, and
        <a
          href="#combat-advantage"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Combat Advantage</a
        > for movement and from-behind adjustments.
      </p>
      <!-- Source: server-scripts/Combat.cs:criticalChance,DealDamageAt; Player.cs:isRadiantAetherActivated,TryConsumeRadiantAether — Critical Chance caps at 70%, interrupted gathering actions add 75 percentage points, and non-auto critical hits roll 15% to consume Radiant Aether from the first 24 inventory slots. -->
      <p class="text-muted-foreground">
        Critical checks require more than 3 damage after mitigation. The chance
        is the attacker's Critical Strike, at most 70%, plus 75 percentage
        points when the hit interrupts a player who is fishing, gathering,
        mining, digging or opening something. Monster area damage skills skip
        this check. If you carry <a
          href="/items/radiant_aether"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Radiant Aether</a
        > in your first 24 inventory slots, each critical hit from a skill other than
        an auto attack has a 15% chance to consume one. That hit adds 200% extra damage
        instead of 50%, before Critical Resist reduces the bonus.
      </p>
      <!-- Source: server-scripts/Combat.cs:DealDamageAt — Rageblow and Mana Burn bypass avoidance and mitigation but still receive random damage variation, Combat Advantage, level adjustment, critical checks, Ward and Mana Shield. -->
      <p class="text-muted-foreground">
        <strong
          ><a
            href="/skills/rageblow"
            class="text-blue-600 dark:text-blue-400 hover:underline">Rageblow</a
          >
          and
          <a
            href="/skills/mana_burn"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Mana Burn</a
          >:</strong
        > bypass avoidance and mitigation, but damage still varies at random and receives
        Combat Advantage bonuses, level adjustment and eligible critical hits. Ward
        and Mana Shield still absorb their damage.
      </p>
      <!-- Source: server-scripts/Combat.cs:DealDamageAt — Slayer reduction begins at 10% mastery; on-hit healing uses the target's buffs; Mystic Spark returns 35% of pre-shield damage capped by current target Health. -->
      <p class="text-muted-foreground">
        See <a
          href="/professions/slayer"
          class="text-blue-600 dark:text-blue-400 hover:underline">Slayer</a
        >
        for mastery. A non-spell melee hit on a target with
        <a
          href="/skills/root"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Druid's Root</a
        >
        heals the attacker for its listed Heal on Hit percentage of the hit's damage
        before shields, rounded.
        <a
          href="#effects-and-control"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Damage shields</a
        >
        leave this hit's damage unchanged.
        <a
          href="/skills/mystic_spark"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Mystic Spark</a
        >
        restores Mana equal to 35% of its damage before shields, counting at most
        the target's current Health, rounded down.
      </p>
    </Card.Content>
  </Card.Root>
  <!-- ── §2 Damage Formulas ─────────────────────────────────────────────── -->
  <Card.Root id="damage-formulas" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Damage Formulas</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-6">
      <h3 class="font-semibold">
        Character Window Attack Power and Spell Power
      </h3>
      <Calculation calculation={characterDamageCalculation} />
      <!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; TargetProjectileSkill.cs:Apply; FrontalDamageSkill.cs:Apply — attacks add flat skill damage, then round after a positive skill multiplier. Scrolls use only skill damage. -->
      <p class="text-sm text-muted-foreground">
        The table gives the starting stat for each attack. Add the skill's flat
        damage, then multiply by its listed damage percentage and round if that
        percentage is above zero. Scrolls omit character stats and use their own
        skill damage. Use the skill page's calculator for its damage before
        defenses.
      </p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-1 pr-4 font-medium">Category</th>
              <th class="text-left py-1 pr-4 font-medium">Attack</th>
              <th class="text-left py-1 font-medium">Formula</th>
            </tr>
          </thead>
          <tbody>
            {#each DAMAGE_FORMULAS as [category, attack, formula] (attack)}
              <tr class="border-b border-border/40 hover:bg-muted/20">
                <td class="py-2 pr-4 text-muted-foreground">{category}</td>
                <td class="py-2 pr-4">
                  {#if attack.includes("Forest Guardians Aid")}
                    Ranger frontal projectile attacks of any damage type, such
                    as <a
                      href="/skills/forest_guardians_aid"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                      >Forest Guardians Aid</a
                    >
                  {:else if attack.includes("Poison Spray")}
                    Other classes' targeted, projectile and frontal-projectile
                    poison attacks, such as <a
                      href="/skills/poison_spray"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                      >Poison Spray</a
                    >
                  {:else if attack === "Final Cadence"}
                    <a
                      href="/skills/final_cadence"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                      >Final Cadence</a
                    >
                  {:else if attack === "Rageblow and Mana Burn"}
                    <a
                      href="/skills/rageblow"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                      >Rageblow</a
                    >
                    and
                    <a
                      href="/skills/mana_burn"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                      >Mana Burn</a
                    >
                  {:else}
                    {attack}
                  {/if}
                </td>
                <td class="py-2 text-muted-foreground">{formula}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <Alert variant="info">
        <Info />
        <div>
          <!-- Source: server-scripts/TargetProjectileSkill.cs:189-200; Equipment.cs:515-525 — with no main-hand weapon, a bow attack subtracts the bow's own damage. -->
          <p class="font-medium">Weapon damage defects in the game</p>
          <p>
            With only a bow equipped, a Ranger's bow attack loses the bow's Base
            Damage. Equip a melee weapon in the main hand to avoid this.
          </p>
          <!-- Source: server-scripts/Equipment.cs:230-247; TargetDamageSkill.cs:223-232; FrontalDamageSkill.cs:88-92 — broken slot 13 equipment adds no damage but is still subtracted from melee damage. -->
          <p>
            A broken bow still subtracts its full Base Damage from Ranger melee
            attacks. A broken off-hand weapon subtracts half its Base Damage,
            rounded up, from Rogue melee attacks. Repair or unequip the broken
            item.
          </p>
        </div>
      </Alert>
    </Card.Content>
  </Card.Root>

  <!-- ── §3 Resistance & Mitigation ────────────────────────────────────── -->
  <Card.Root id="resistance" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Resistance &amp; Mitigation</Card.Title>
      <Card.Description
        >Armor Class and matching resist stats decide avoidance and how much
        damage you take.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-5 text-sm">
      <!-- Source: server-scripts/Combat.cs:GetProbResistMagic,DealDamageAt; TargetDebuffSkill.cs:Apply; AreaDebuffSkill.cs:Apply — resist avoids damage and hit control effects; debuffs and dispels use the matching stat roll. -->
      <h3 class="font-semibold">Resist Roll</h3>
      <Calculation calculation={avoidanceCalculation()} />
      <p class="text-muted-foreground">
        Magic, fire, cold, poison, and disease hits use the matching resist
        stat. A successful resist prevents the hit's damage, stun, fear and
        knockback. Debuffs and dispels use the same landing roll. Physical
        debuffs use Armor Class at the same rate as an elemental resist.
      </p>
      <!-- Source: server-scripts/Combat.cs:307-317,1539-1548 — physical hits use capped block chance rather than the physical debuff formula. -->
      <h3 class="font-semibold">Physical Block and Miss</h3>
      <Calculation calculation={avoidanceCalculation(true)} />
      <p class="text-muted-foreground">
        A block or miss prevents all damage from the physical hit. From-behind
        attacks and moving players adjust avoidance after these bounds. See <a
          href="#combat-advantage"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Combat Advantage</a
        >.
      </p>
      <h3 class="font-semibold">Mitigation</h3>
      <label for="mitigation-stat" class="block font-medium"
        >Your defensive stat</label
      >
      <select
        id="mitigation-stat"
        bind:value={mitigationKey}
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {#each MITIGATION_STATS as stat (stat.key)}
          <option value={stat.key}>{stat.label}</option>
        {/each}
      </select>
      {#key mitigationKey}
        <Calculation calculation={mitigationCalculation(mitigationStat)} />
      {/key}
      <table class="w-full text-sm border-collapse">
        <thead
          ><tr
            ><th class="text-left py-2 pr-4">Damage type</th><th
              class="text-left py-2">Your mitigation stat</th
            ></tr
          ></thead
        >
        <tbody>
          {#each [["Physical", "Armor Class"], ["Magic", "Magic Resist"], ["Fire", "Fire Resist"], ["Cold", "Cold Resist"], ["Poison", "Poison Resist"], ["Disease", "Disease Resist"]] as [type, stat] (type)}
            <tr
              ><td class="py-2 pr-4">{type}</td><td
                class="py-2 text-muted-foreground">{stat}</td
              ></tr
            >
          {/each}
        </tbody>
      </table>
      <!-- Source: server-scripts/TargetDebuffSkill.cs:Apply; AreaDebuffSkill.cs:Apply — isDecreaseResistsSkill subtracts 30 percentage points; boss/elite monsters resist a base speedBonus below −10. -->
      <p class="text-muted-foreground">
        <a
          href="/skills/malosi"
          class="text-blue-600 dark:text-blue-400 hover:underline">Malosi</a
        >,
        <a
          href="/skills/spellrend"
          class="text-blue-600 dark:text-blue-400 hover:underline">Spellrend</a
        >,
        <a
          href="/skills/withering_hex"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Withering Hex</a
        >,
        <a
          href="/skills/crippling_refrain"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Crippling Refrain</a
        >
        and
        <a
          href="/skills/refrain_of_frailty"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Refrain of Frailty</a
        >
        lower the target's chance to resist them by 30 percentage points, to a minimum
        of zero. Other resistance-reducing debuffs do not receive this landing bonus.
        Bosses and elite monsters automatically resist debuffs with a listed Movement
        Speed bonus below −10.
      </p>
    </Card.Content>
  </Card.Root>

  <!-- Source: server-scripts/Combat.cs:673-692,776-781 — targeted damage and projectile skills gain advantage when both look directions match; resist chance is multiplied by 0.8, and damage gains 10% rounded up plus 1. -->
  <Card.Root id="combat-advantage" class="bg-muted/30">
    <Card.Header><Card.Title>Combat Advantage</Card.Title></Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Combat.cs:DealDamageAt — only TargetDamageSkill and TargetProjectileSkill gain positional advantage when look directions match. -->
      <p>
        Single-target attacks (targeted skills and targeted projectiles, auto
        attacks included) gain from-behind advantage when attacker and target
        face the same direction.
      </p>
      <Calculation calculation={advantageCalculation} />
      <p>
        See <a
          href="/skills/improved_backstab"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Improved Backstab</a
        > for the Rogue bonus.
      </p>
      <!-- Source: server-scripts/Combat.cs:693-697 — against a moving player, stunChance gains Clamp(0.1 − 0.01 × level difference, 0.01, 0.1), capped at 1, and stunTime is at least 0.5 seconds. -->
      <p>
        Against a moving player, physical hits from attackers above level 5 also
        add 10 percentage points of stun chance minus 1 percentage point per
        target level above the attacker. The addition stays between 1 and 10
        percentage points, total stun chance stays at most 100%, and stun
        duration is at least 0.5 seconds.
      </p>
      <!-- Source: server-scripts/Combat.cs:DealDamageAt; PlayerSkills.cs:CmdUse — Fishing, Gathering, Mining, Digging and Opening occupy slots 19,22,23,26,27; hitting those casts cancels them and grants damage advantage plus 75 percentage points of Critical Chance. -->
      <p>
        A hit on a player who is fishing, gathering, mining, digging or opening
        something cancels that action, adds the from-behind damage bonus and
        adds 75 percentage points of Critical Strike. Avoidance still follows
        the attack's position and the target's movement.
      </p>
      <!-- Source: server-scripts/Combat.cs:567-571 — returning-home monsters evade incoming hits. -->
      <p>
        A monster returning home evades incoming hits. See <MechanicsLink
          section="monster-spawns#leashing"
          >Chase Limits and Resets</MechanicsLink
        > for its reset rules.
      </p>
      <p>
        See <a
          href="#damage-pipeline"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Damage Pipeline</a
        >
        and
        <a
          href="#resistance"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Resistance and Mitigation</a
        > for the rest of the hit calculation.
      </p>
    </Card.Content>
  </Card.Root>

  <!-- ── §4 Healing ────────────────────────────────────────────────────── -->
  <Card.Root id="healing" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Healing</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-5">
      <div>
        <h3 class="font-semibold mb-2">Wisdom Heal Bonus</h3>
        <p class="text-sm text-muted-foreground mb-2">
          Other players and mercenaries:
        </p>
        <Calculation calculation={healingCalculation()} />
        <p class="text-sm text-muted-foreground mt-3 mb-2">
          Player Rangers, with triple Wisdom:
        </p>
        <Calculation calculation={healingCalculation(true)} />
        <!-- Source: server-scripts/TargetHealSkill.cs:GetHealingAmount,Apply; NecromancerDeathBloomSkill.cs:Apply — ordinary scroll heals omit Wisdom, but pet/mercenary-targeted scroll heals use the player caster's Wisdom, tripled for Rangers. -->
        <p class="text-sm text-muted-foreground mt-2">
          <a
            href="/skills/death_bloom"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Death Bloom</a
          >
          uses Intelligence.
          <a
            href="/items/runed_scroll_of_restoration"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Runed Scroll of Restoration</a
          >
          (<a
            href="/skills/major_restoration"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Major Restoration</a
          >) heals your mercenary using your Wisdom bonus, tripled for a player
          Ranger, and can be critical.
        </p>
        <!-- Source: server-scripts/BardFinalCadenceSkill.cs:Apply; PlayerSkills.cs:ConsumeFinalCadenceRepertoireBonus — Final Cadence uses Charisma and Melody rather than Wisdom. -->
        <p class="text-sm text-muted-foreground mt-2">
          <a
            href="/skills/final_cadence"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Final Cadence</a
          >
          ignores Wisdom. See
          <a
            href="/mechanics/bard#cadence"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Bard › Final Cadence</a
          >
          for song power and the Melody bonus.
        </p>
        <!-- Source: server-scripts/Combat.cs:1315-1333 — lifetap healing is FloorToInt(lifetapPercent × remaining damage × (1 + summed active/permanent lifetapHealingPercentBonus)); the damage is not capped by remaining victim health. -->
        <h3 id="lifetap" class="font-semibold mt-4 mb-2 scroll-mt-24">
          Lifetap
        </h3>
        <Calculation calculation={lifetapCalculation()} />
        <p class="text-sm text-muted-foreground mt-2">
          Lifetap restores Health and leaves damage unchanged. Overkill damage
          contributes to the healing. <a
            href="/skills/lich_shroud"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Lich Shroud</a
          >
          supplies the lifetap healing bonus.
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/BuffSkill.cs:GetCasterCriticalChance, Skills.cs:GetFinalHealOverTime, and BardFinalCadenceSkill.cs:HealNearbyAllies -->
        <h3 class="font-semibold mb-1">Critical Heal</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >A targeted heal can crit only if the skill can heal other
            characters, even when you cast it on yourself.</span
          >
          <span class="block"
            >Area heals can crit without that targeting requirement.</span
          >
          <span class="block"
            >On a critical heal, 90% of rolls double the healing and 10% triple
            it.</span
          >
          <span class="block"
            >Final Cadence uses one roll based on the Bard's Critical Strike for
            all recipients.</span
          >
          <span class="block"
            >Healing-over-time critical ticks heal for 150% of the normal tick,
            rounded.</span
          >
          <span class="block"
            >Their chance uses the caster's Critical Strike when the buff
            starts.</span
          >
          <!-- Source: server-scripts/Skills.cs:ApplyCriticalToOverTime; NetworkManagerMMO.cs:OnStartServer — critical healing requires more than 3 healing and base duration below 30 seconds; recovery runs each second. -->
          <span class="block"
            >Only buffs with a base duration below 30 seconds and more than 3
            healing each second can have critical healing ticks.</span
          >
        </p>
      </div>

      <!-- Source: server-scripts/TargetHealSkill.cs:GetHealingAmount; AreaHealSkill.cs:Apply — only player and mercenary casters receive Wisdom healing additions. -->
      <p class="text-sm text-muted-foreground">
        Ranger mercenaries use the ordinary Wisdom bonus. Monsters, NPCs, and
        companions and familiars use listed healing before critical checks.
      </p>
    </Card.Content>
  </Card.Root>

  <!-- ── §5 Buff Scaling ───────────────────────────────────────────────── -->
  <Card.Root id="buffs" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Buff Scaling</Card.Title>
      <Card.Description
        >How Charisma, Wisdom, Intelligence, and character level change buffs.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-5">
      <div>
        <!-- Source: server-scripts/uMMORPG.Scripts.PlayerAttributes/Charisma.cs:GetBardPowerMultiplier; Buff.cs:ScaleWithCharisma; BuffSkill.cs:ScaleFearResistChanceBonus,ScaleHealingPerSecondBonus — song power scales whole-number and percentage effects, but not Movement Speed or primary attributes. -->
        <h3 class="font-semibold mb-2">Bard Song Scaling</h3>
        <Calculation calculation={songCalculation()} />
        <p class="text-sm text-muted-foreground mt-2">
          <!-- Source: server-scripts/BardSongSkill.cs:Apply and BardMercenarySkills.cs:RefreshAura — a song buff from a Bard or Bard mercenary carries that singer's Charisma. -->
          <span class="block"
            >Bard songs use only the Charisma of the Bard or Bard mercenary
            singing them.</span
          >
          <span class="block"
            >Whole-number values include Ward, Armor Class, flat Attack Power
            and Spell Power, resistance, and flat resource recovery.</span
          >
          <span class="block"
            >Percentage values include Attack Power, Spell Power, Accuracy,
            Critical Strike, Haste, Spell Casting Haste, and percentage resource
            recovery.</span
          >
          <span class="block"
            >Fear Resist from <a
              href="/skills/ballad_of_courage"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >Ballad of Courage</a
            > follows the formula up to the song's listed limit.</span
          >
          <!-- Source: server-scripts/BuffSkill.cs:ScaleHealingPerSecondBonus — Cacophony's stored Charisma coefficient adds damage after rounding and treats negative Charisma as zero. -->
          <span class="block"
            ><a
              href="/skills/cacophony"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >Cacophony</a
            >'s damage each second is its base damage plus 75% of Charisma above
            zero, with the Charisma addition rounded.</span
          >
        </p>
        <p class="text-sm text-muted-foreground mt-2">
          <span class="block"
            >Charisma leaves Movement Speed and primary attributes at their
            listed values.</span
          >
        </p>
      </div>

      <div>
        <h3 class="font-semibold mb-2">Attribute Bonuses by Buff Effect</h3>
        <!-- Source: server-scripts/Buff.cs:ScaleWithCharisma and Skills.cs:GetFinalHealOverTime — Charisma-scaled song values skip the Wisdom additions. -->
        <!-- Source: server-scripts/BuffSkill.cs:GetBuffPowerAttribute; TargetBuffSkill.cs:Apply; AreaBuffSkill.cs:Apply,GetLeadershipAttributeBonus — buffs use Wisdom or Intelligence; Ranger targeted buffs triple it; a player's mercenary-area buffs average Wisdom and Constitution, also Charisma for Leadership. -->
        <p class="text-sm text-muted-foreground mb-2">
          These attribute additions apply to non-song buffs.
        </p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left py-1 pr-4 font-medium">Buff Field</th>
                <th class="text-left py-1 font-medium">Attribute Scaling</th>
              </tr>
            </thead>
            <tbody>
              <!-- Source: server-scripts/Buff.cs:damageBonus,magicDamageBonus — Leadership adds its stored buff attribute to both listed damage bonuses. -->
              {#each [["Maximum Health", "Base bonus + 200% of buff attribute"], ["Armor Class and each resist", "Base bonus + 15% of buff attribute, with the attribute addition rounded"], ["Attack Power and Spell Power (Leadership only)", "Base bonus + 100% of buff attribute"], ["Ward", "Base capacity + 200% of buff attribute"], ["Damage Shield", "Base damage + 75% of buff attribute, with the attribute addition rounded"], [`Healing over time, base duration below ${seconds(60)}`, "Base healing + base healing × 0.4% per buff attribute point above 0, limited to a 500% bonus, with the extra healing rounded"], [`Healing over time, base duration at least ${seconds(60)}`, "Base healing + 30% of buff attribute above 0, with the attribute addition rounded"]] as [effect, formula] (effect)}
                <tr
                  ><td class="py-2 pr-4">
                    {#if effect === "Attack Power and Spell Power (Leadership only)"}
                      Attack Power and Spell Power (<a
                        href="/skills/leadership"
                        class="text-blue-600 dark:text-blue-400 hover:underline"
                        >Leadership</a
                      > only)
                    {:else}
                      {effect}
                    {/if}
                  </td><td class="py-2 text-muted-foreground">{formula}</td></tr
                >
              {/each}
            </tbody>
          </table>
        </div>
        <label for="buff-effect" class="block text-sm font-medium mb-2"
          >Buff effect</label
        >
        <select
          id="buff-effect"
          bind:value={buffEffect}
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-3"
        >
          {#each Object.entries(BUFF_EFFECTS) as [effect, label] (effect)}
            <option value={effect}>{label}</option>
          {/each}
        </select>
        <p class="text-sm text-muted-foreground mb-3">
          Enter the stats shown in your character window and choose the buff's
          source and scaling attribute. Relic area buffs use level instead. See
          below.
        </p>
        <Calculation calculation={buffCalculation(buffEffect)} />
      </div>

      <div>
        <h3 class="font-semibold mb-2">Which Attributes Improve Buffs</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left py-1 pr-4 font-medium">Source</th>
                <th class="text-left py-1 font-medium">Condition</th>
              </tr>
            </thead>
            <tbody>
              <!-- Source: server-scripts/BardSongSkill.cs:Apply and BardMercenarySkills.cs:RefreshAura — song buffs carry Charisma as their attribute. -->
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4 text-sm">Bard songs</td><td
                  class="py-1 text-muted-foreground">Use Charisma</td
                ></tr
              >
              <!-- Source: server-scripts/BuffSkill.cs:GetBuffPowerAttribute; TargetBuffSkill.cs:Apply; AreaBuffSkill.cs:Apply — Rangers triple targeted buff attributes, not ordinary area buff attributes. Player area buffs for mercenaries use a separate combined attribute. -->
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4 text-sm">Player Rangers</td><td
                  class="py-1 text-muted-foreground"
                  >Targeted buffs triple Wisdom, or Intelligence for buffs that
                  scale with it. Area buffs other than those for mercenaries use
                  the stat unchanged</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4 text-sm">Other players</td><td
                  class="py-1 text-muted-foreground"
                  >Targeted buffs use Wisdom, or Intelligence for buffs that
                  scale with it, unchanged. Area buffs do too, except those for
                  mercenaries</td
                ></tr
              >
              <!-- Source: server-scripts/AreaBuffSkill.cs:Apply,GetLeadershipAttributeBonus — player mercenary-area buffs halve and round Wisdom plus Constitution, adding Charisma before halving for Leadership. -->
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4 text-sm"
                  >Your area buffs for mercenaries, such as <a
                    href="/skills/blessing_of_the_zealot"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >Blessing of the Zealot</a
                  ></td
                ><td class="py-1 text-muted-foreground"
                  >Add your Wisdom and Constitution, halve the total and round</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4 text-sm"
                  ><a
                    href="/skills/leadership"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >Leadership</a
                  ></td
                ><td class="py-1 text-muted-foreground"
                  >Add your Wisdom, Constitution and Charisma, halve the total
                  and round</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4 text-sm"
                  >Mercenary buffs other than songs</td
                ><td class="py-1 text-muted-foreground"
                  >Use their Wisdom (Intelligence for buffs that scale with it)</td
                ></tr
              >
              <!-- Source: server-scripts/AreaBuffSkill.cs:Apply — relic area buffs use caster level × 10 as their stored attribute. -->
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4 text-sm"
                  >Relic area buffs, such as <a
                    href="/skills/staff_of_flowers"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >Staff of Flowers</a
                  ></td
                >
                <td class="py-1 text-muted-foreground">10 × your level</td>
              </tr>
              <tr
                ><td class="py-1 pr-4 text-sm">Monster and NPC buffs</td><td
                  class="py-1 text-muted-foreground">No attribute bonus</td
                ></tr
              >
            </tbody>
          </table>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Source: server-scripts/Buff.cs:Buff; Skills.cs:AddOrRefreshBuff; FoodItem.cs:Use; BuffSkill.cs:GetBuffDurationMultiplier — effects have a timed end; food, drink and Bard song passives can extend it; reapplying the same effect restarts it. -->
  <Card.Root id="effects-and-control" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Buffs, Debuffs, Wards and Cleanse</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <p>
        <span class="block"
          >Buffs and debuffs last for their listed duration (food, drink and
          Bard song passives can lengthen it) unless removed earlier.</span
        >
        <span class="block"
          >Reapplying the same effect replaces it and restarts its duration.</span
        >
      </p>
      <p>
        See <a
          href="#special"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Special Mechanics</a
        >
        for Root, Stun, and Sleep, and
        <a
          href="#targeting"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Targets, Range and Casting</a
        > for casting restrictions.
      </p>
      <!-- Source: server-scripts/Skills.cs:ApplyWardToDoTDamage — ApplyWardToDoTDamage takes tick damage from the ward pool and passes the excess. -->
      <!-- Source: server-scripts/Combat.cs:DealDamageAt — non-spell TargetDamageSkill with base cast range below 1.5 triggers damage shields, except weapon procs and scrolls; matching resistance mitigates first, then whole-number variance uses a rounded-up 10% limit. -->
      <p>
        <span class="block"
          >A ward absorbs ordinary damage-over-time ticks until its pool runs
          out.</span
        >
        <span class="block"
          >Any damage beyond the remaining ward reduces Health.</span
        >
        <span class="block"
          >When a non-spell single-target melee attack hits you, your damage
          shield deals its damage to the attacker after the attacker's matching
          resistance reduces it. The damage then varies at random by up to 10%
          in either direction, with the 10% rounded up. Weapon-triggered effects
          and scrolls do not set it off.</span
        >
        <span class="block"
          >See <a
            href="#ward-and-mana-shield"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Ward and Mana Shield Priority</a
          > for direct hits.</span
        >
      </p>
      <!-- Source: server-scripts/TargetBuffSkill.cs:321-334; BuffSkill.cs:56-67 — cleansing removes only debuffs whose elements match the spell; the exported Cleric Cleanse skill enables poison and disease. -->
      <p>
        Cleric's <a
          href="/skills/cleanse"
          class="text-blue-600 dark:text-blue-400 hover:underline">Cleanse</a
        >
        removes layers from poison and disease debuffs. See
        <a
          href="#cleanse"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Cleanse layers</a
        > for resistance and repeat casts.
      </p>
      <!-- Source: server-scripts/TargetDebuffSkill.cs:105-143,173-205 — dispels resist on landing and remove eligible beneficial buffs. -->
      <p>
        <a
          href="#dispel"
          class="text-blue-600 dark:text-blue-400 hover:underline">Dispel</a
        >
        removes beneficial effects from a target.
      </p>
    </Card.Content>
  </Card.Root>

  <!-- ── §6 Debuff Mechanics ────────────────────────────────────────────── -->
  <Card.Root id="debuffs" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Debuff Mechanics</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-5">
      <div>
        <!-- Source: server-scripts/Buff.cs:276-291; BuffSkill.cs:473-515 — Bard debuff songs use Charisma and skip the separate damage-over-time attribute addition. -->
        <h3 class="font-semibold mb-1">Bard Debuff Songs</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >Bard debuff songs use <a
              href="#buffs"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >Bard Song Scaling</a
            >, including Cacophony's separate damage addition.</span
          >
        </p>
      </div>

      <div>
        <h3 class="font-semibold mb-2">Which Attributes Improve Debuffs</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left py-1 pr-4 font-medium">Debuff type</th>
                <th class="text-left py-1 font-medium">Attribute used</th>
              </tr>
            </thead>
            <tbody>
              <!-- Source: server-scripts/BuffSkill.cs:GetDebuffPowerAttribute — Charisma-scaled debuffs use Charisma. -->
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4">Bard debuff songs</td>
                <td class="py-1 text-muted-foreground">Charisma</td>
              </tr>
              <!-- Source: server-scripts/BuffSkill.cs:GetDebuffPowerAttribute — isMeleeDebuff chooses Strength, independently of which negative effect the debuff carries. -->
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4"
                  >Physical (melee) debuffs, such as Hurt and Rupture</td
                >
                <td class="py-1 text-muted-foreground">Strength</td>
              </tr>
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4">Poison and disease debuffs</td>
                <td class="py-1 text-muted-foreground"
                  >Intelligence for Intelligence-scaled poison and disease,
                  otherwise Dexterity</td
                >
              </tr>
              <tr>
                <td class="py-1 pr-4"
                  >All other debuffs (magic, fire, cold, untagged)</td
                >
                <td class="py-1 text-muted-foreground">Intelligence</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 class="font-semibold mb-2">How Each Effect Changes</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left py-1 pr-4 font-medium">Field</th>
                <th class="text-left py-1 font-medium">Scaling</th>
              </tr>
            </thead>
            <tbody>
              <!-- Source: server-scripts/Buff.cs:69-228; BuffSkill.cs:473-515; Skills.cs:1644-1755,1822-1842 — reductions use the selected debuff attribute, and physical ticks round their Strength addition. -->
              {#each [["Armor Class reduction", "Base reduction + 50% of selected debuff attribute for melee debuffs, or 40% for other debuffs, with the attribute addition rounded"], ["Each resist reduction", "Base reduction + 40% of selected debuff attribute, with the attribute addition rounded"], ["Attack Power and Spell Power reduction", "Base reduction + 50% of selected debuff attribute, with the attribute addition rounded"], ["Dexterity-scaled poison and disease ticks", "Base tick + 150% of Dexterity, with the attribute addition rounded. Poison meets Poison Resist. See the disease defect below"], ["Intelligence-scaled poison and disease ticks", "Base tick + the skill's percentage of Intelligence, with the attribute addition rounded. Poison meets Poison Resist and disease meets Disease Resist"], ["Physical damage-over-time ticks", "Base tick + 50% of Strength, with the attribute addition rounded. Meets Armor Class"], ["Fire, cold, and magic ticks", "Base tick + the skill's percentage of Intelligence, with the attribute addition rounded. Meets the matching resist"]] as [effect, formula] (effect)}
                <tr
                  ><td class="py-2 pr-4">{effect}</td><td
                    class="py-2 text-muted-foreground">{formula}</td
                  ></tr
                >
              {/each}
            </tbody>
          </table>
        </div>
        <!-- Source: server-scripts/Skills.cs:GetFinalDamageDoT; TargetDebuffSkill.cs:Apply — the shared Dexterity poison/disease branch applies Poison Resist; Disease Resist is still used when disease debuffs land. -->
        <!-- Runtime verification: docs/game-bugs/dexterity-scaled-disease-ticks-use-poison-resist.md -->
        <p class="text-sm text-muted-foreground mt-2">
          Because of a game defect, Poison Resist instead of Disease Resist
          reduces disease damage over time that scales with Dexterity, such as
          <a
            href="/skills/virulent_slash"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Virulent Slash</a
          >. Some monster disease debuffs work the same way, and their skill
          pages say so.
        </p>
        <!-- Source: server-scripts/BuffSkill.cs:14-31,508-515 — damageOverTimeBonusPerIntelligencePoint defaults to 1.25 and each skill can override it, while scalesWithCharisma effects skip the separate addition. -->
        <p class="text-sm text-muted-foreground mt-2">
          Most Intelligence-scaled ticks add 125% of Intelligence, while <a
            href="/skills/ensnare"
            class="text-blue-600 dark:text-blue-400 hover:underline">Ensnare</a
          >
          adds 115%. Each skill page shows its percentage. Charisma-scaled songs receive
          no separate attribute addition.
        </p>
        <Calculation calculation={damageOverTimeCalculation} />
        <!-- Source: server-scripts/Skills.cs:ApplyDamageOverTimeBonuses,ApplyCriticalToOverTime — Reaper Form and execute require a different, online player caster, while critical chance is captured when the buff starts. -->
        <p class="text-sm text-muted-foreground mt-2">
          Both <a
            href="/skills/reaper_form"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Reaper Form</a
          >
          and
          <a
            href="/skills/deathly_focus"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Deathly Focus</a
          >
          bonuses use the caster's stats and require that player to be online. Pet
          debuffs receive neither bonus. The chance of a critical tick uses the caster's
          Critical Strike when the debuff starts. Damage based on a percentage of
          the target's maximum Health receives neither bonus and cannot be critical.
          See
          <a
            href="#resistance"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Resistance and Mitigation</a
          >
          and
          <a
            href="#damage-pipeline"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Damage Pipeline</a
          > for the shared mitigation and critical rules.
        </p>
        <!-- Source: server-scripts/Skills.cs:ApplyCriticalToOverTime,GetFinalDamageDoT — the critical threshold uses damage after mitigation, layers and bonuses. -->
        <p class="text-sm text-muted-foreground mt-2">
          Critical damage-over-time checks require a base duration below 30
          seconds and more than 3 damage each second after mitigation, layers
          and bonuses.
        </p>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- ── §7 Timing & Haste ──────────────────────────────────────────────── -->
  <Card.Root id="timing" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Timing &amp; Haste</Card.Title>
      <Card.Description
        >How haste changes the time between attacks and spells.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-6">
      <!-- Source: server-scripts/Player.cs:3394-3431; Skills.cs:924-933,1141-1169 — player delays, companion cooldowns, and full spell-haste cast adjustment. -->
      <div>
        <h3 class="font-semibold mb-2">Player Attack Intervals</h3>
        <!-- Source: server-scripts/Combat.cs:335-346 — the character's Haste is capped before it changes weapon delay. -->
        <p class="text-sm text-muted-foreground mb-2">
          Haste stays between −80% and 80% before it changes weapon delay.
        </p>
        <Calculation calculation={timingCalculation()} />
        <h3 class="font-semibold mt-4 mb-2">
          Player Spell Auto-Attack Interval
        </h3>
        <Calculation calculation={timingCalculation(true)} />
        <!-- Source: server-scripts/Player.cs:EventRefractoryPeriod,GetSkillRefractoryPeriod; Skills.cs:FinishCast — the 0.75-second recovery gates auto attacks only; player skill cooldowns use their listed duration. -->
        <p class="text-sm text-muted-foreground mt-2">
          The wait delays the next auto attack only. Other spells can be cast
          right away. A spell repeats after its cooldown.
        </p>
        <p class="text-sm text-muted-foreground mt-2">
          The character window shows Spell Casting Haste between −50% and 50%.
          Because of a game defect, casts use the full total, so enter your full
          equipment and skill total for this example.
        </p>
        <h3 class="font-semibold mt-4 mb-2">Other Attack Intervals</h3>
        <table class="w-full text-sm border-collapse">
          <thead
            ><tr
              ><th class="text-left py-2 pr-4">Attack</th><th
                class="text-left py-2">Interval in seconds</th
              ></tr
            ></thead
          >
          <tbody>
            {#each [["Companion's first non-spell skill", "Cast time + cooldown × (100% − Haste)"], ["Other companion and familiar skills", "Cast time + cooldown"], ["Mercenary auto attack", "Cast time + cooldown × (100% − Haste)"], ["Mercenary spell", "Cast time − cast time × full Spell Casting Haste + cooldown"], ["Monster and NPC non-spell attacks", "Cast time + cooldown × (100% − Haste)"], ["Monster and NPC spells", "Cast time + cooldown"]] as [attack, formula] (attack)}
              <tr
                ><td class="py-2 pr-4">{attack}</td><td
                  class="py-2 text-muted-foreground">{formula}</td
                ></tr
              >
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Haste effects -->
      <div>
        <h3 class="font-semibold mb-2">Haste Effects</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left py-1 pr-4 font-medium">Attack</th>
                <th class="text-left py-1 pr-4 font-medium">Regular haste</th>
                <th class="text-left py-1 font-medium">Spell Casting Haste</th>
              </tr>
            </thead>
            <tbody>
              <!-- Source: server-scripts/Combat.cs:339-345 — Mathf.Clamp(num, -0.8f, 0.8f) -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 text-sm">Player auto attack</td>
                <td class="py-2 pr-4 text-muted-foreground text-sm"
                  >Reduces delay (minimum {seconds(0.25)}, maximum {seconds(2)},
                  haste limit 80%).</td
                >
                <td class="py-2 text-muted-foreground text-sm">No effect</td>
              </tr>
              <!-- Source: server-scripts/Skills.cs:924-933; server-scripts/Player.cs:2873 — StartCast subtracts the unclamped equipment and skill spellHasteBonus sum; Combat.spellHaste clamps only the displayed value to 50%. -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 text-sm">Player spell auto attack</td>
                <td class="py-2 pr-4 text-muted-foreground text-sm"
                  >No effect</td
                >
                <td class="py-2 text-muted-foreground text-sm"
                  >Reduces cast time. Because of a game defect, it uses the full
                  bonus, even above the 50% display cap. The {seconds(0.75)} wait
                  afterward stays unchanged.</td
                >
              </tr>
              <!-- Source: server-scripts/Skills.cs:StartCast,FinishCast — player cooldowns are unchanged; spell casts subtract spell haste. -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 text-sm"
                  >Player skills other than auto attacks</td
                >
                <td class="py-2 pr-4 text-muted-foreground text-sm"
                  >No effect</td
                >
                <td class="py-2 text-muted-foreground text-sm"
                  >Shortens spell cast times. Cooldowns stay unchanged</td
                >
              </tr>
              <!-- Source: server-scripts/Skills.cs:1141-1169 — non-familiar non-mercenary pet skillIndex 0 uses haste for non-spells. -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 text-sm">Companion or familiar</td>
                <td class="py-2 pr-4 text-muted-foreground text-sm"
                  >Reduces the first non-spell skill's cooldown for companions.
                  No effect on familiars or other companion skills</td
                >
                <td class="py-2 text-muted-foreground text-sm">No effect</td>
              </tr>
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 text-sm">Mercenary auto attack</td>
                <td class="py-2 pr-4 text-muted-foreground text-sm"
                  >Reduces cooldown</td
                >
                <td class="py-2 text-muted-foreground text-sm">No effect</td>
              </tr>
              <!-- Source: server-scripts/Skills.cs:924-933; server-scripts/Pet.cs:2221-2226 — mercenary spells pass the unclamped equipment and skill spellHasteBonus sum to StartCast. -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 text-sm">Mercenary spell</td>
                <td class="py-2 pr-4 text-muted-foreground text-sm"
                  >No effect</td
                >
                <td class="py-2 text-muted-foreground text-sm"
                  >Reduces cast time. Because of a game defect, it uses the full
                  bonus, even above the 50% display cap. Cooldown stays
                  unchanged.</td
                >
              </tr>
              <tr>
                <td class="py-2 pr-4 text-sm">Monster or NPC</td>
                <td class="py-2 pr-4 text-muted-foreground text-sm"
                  >Reduces cooldown for non-spell attacks</td
                >
                <!-- Source: server-scripts/Monster.cs:UpdateServer_CASTING, server-scripts/Npc.cs — hardcoded StartCast(skill, 0f) bypasses spell haste entirely -->
                <td class="py-2 text-muted-foreground text-sm">No effect</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- ── §8 Special Mechanics ──────────────────────────────────────────── -->
  <Card.Root id="special" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Special Mechanics</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-5">
      <div>
        <h3 id="threat" class="font-semibold mb-1 scroll-mt-24">Threat</h3>
        <Calculation calculation={threatCalculation} />
        <!-- Source: server-scripts/DamageSkill.cs:ToolTip; TargetDamageSkill.cs:ApplyDamage; AreaDamageSkill.cs:Apply; Combat.cs:DealDamageAt — threat tooltips show one third of maximum Health where eligible hits add it all. Negative listed threat reduces existing monster threat to at least 1. -->
        <p class="text-sm text-muted-foreground mt-2">
          Because of a game defect, the in-game threat tooltip shows only one
          third of maximum Health. Eligible targeted and direct area hits add
          all of it.
        </p>
        <p class="text-sm text-muted-foreground mt-1">
          Negative skill threat instead reduces the attacker's existing monster
          threat, leaving at least 1.
        </p>
      </div>
      <div>
        <!-- Source: server-scripts/DamageSkill.cs:TryConsumeWildStrike — any Ranger follow-up consumes Wild Strike, multiplies damage by 1 + 0.1 × rank and rounds; the skill's exported damage_bonus is zero. -->
        <!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage — a melee follow-up passes the magic damage override to DealDamageAt. -->
        <!-- Source: server-scripts/TargetProjectileSkill.cs:221-222,252-256 — Apply consumes the override for a bow follow-up and passes it to the projectile effect. -->
        <!-- Source: server-scripts/Combat.cs:521,842-849,1189-1204 — DealDamageAt runs the common pipeline, mitigates Magic once, and instantiates the override effect. -->
        <h3 id="wild-strike" class="font-semibold mb-1 scroll-mt-24">
          <a
            href="/skills/wild_strike"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Wild Strike</a
          >
        </h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >Wild Strike empowers the Ranger's next melee (<a
              href="/skills/swift_slash"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >Swift Slash</a
            >) or bow (<a
              href="/skills/archer_shot"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >Archer Shot</a
            >) auto attack.</span
          >
          <span class="block"
            >It increases the auto attack's damage by 10% per Wild Strike rank,
            giving 150% of normal damage at rank 5. The result rounds after the
            auto attack's own calculation. It adds no flat Attack Power bonus.</span
          >
          <span class="block"
            >The whole hit deals magic damage, which Magic Resist can block or
            reduce.</span
          >
        </p>
      </div>
      <div>
        <!-- Source: server-scripts/Combat.cs:DealDamageAt — auto-attack rage gain on dealing damage. -->
        <!-- Source: server-scripts/Combat.cs:DealDamageAt; Skills.cs:GetEnergyRecoveryBonus; NetworkManagerMMO.cs:OnStartServer — targeted physical melee hits grant received-hit Rage; Charge, Frenzied Vigor and Prowess restore their listed Rage percentages each second. -->
        <h3 id="rage-generation" class="font-semibold mb-1 scroll-mt-24">
          Rage Generation
        </h3>
        <p class="text-sm text-muted-foreground mb-2">
          Besides buffs that restore Rage each second (<a
            href="/skills/charge"
            class="text-blue-600 dark:text-blue-400 hover:underline">Charge</a
          >,
          <a
            href="/skills/frenzied_vigor"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Frenzied Vigor</a
          >,
          <a
            href="/skills/prowess"
            class="text-blue-600 dark:text-blue-400 hover:underline">Prowess</a
          >), Warriors and Rogues gain Rage from hits:
        </p>
        <h4 class="font-medium mt-3 mb-2">Dealing an auto attack</h4>
        <Calculation calculation={dealtRageCalculation} />
        <h4 class="font-medium mt-3 mb-2">
          Being hit by a targeted physical melee attack
        </h4>
        <Calculation calculation={receivedHitCalculation()} />
        <p class="text-sm text-muted-foreground mt-2">
          Projectiles and area attacks give no received-hit Rage. Warrior and
          Rogue mercenaries use the same Rage rules.
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/Combat.cs:DealDamageAt — stun keeps the later end time, Bear mounts resist 90%, and applied stun dismounts a player. -->
        <h3 class="font-semibold mb-1">Stun</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >A hit stuns its target if the skill's stun chance roll succeeds.</span
          >
          <span class="block">Fear protects the target from stun.</span>
          <span class="block"
            >A new stun ends at whichever end time is later. Durations do not
            add up.</span
          >
          <span class="block"
            ><a
              href="/items/bear_mount"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >Bear Mount</a
            > resists 90% of stuns.</span
          >
          <span class="block">A stun dismounts a player.</span>
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/Combat.cs:DealDamageAt — knockback fails when target level − attacker level is at least 15 unless a boss monster casts it; obstacle damage is 1.25%, rounded up, at least 1. -->
        <h3 class="font-semibold mb-1">Knockback</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >Knockback works only when neither stun nor fear applies on the same
            hit and the target is not already stunned.</span
          >
          <span class="block"
            >It pushes the target the distance listed on the skill and stuns
            them for 0.25 seconds.</span
          >
          <span class="block"
            >If an obstacle blocks the path, the target takes 1.25% of the hit's
            damage, rounded up, at least 1.</span
          >
          <span class="block"
            >Knockback fails against a target 15 or more levels above the
            attacker, unless a boss monster casts it.</span
          >
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/Combat.cs:DealDamageAt — Ward absorbs first; Mana Shield spends Mana one-for-one and removes its buff when damage exceeds remaining Mana. -->
        <h3 id="ward-and-mana-shield" class="font-semibold mb-1 scroll-mt-24">
          Ward &amp; Mana Shield Priority
        </h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >Ward absorbs direct damage before Mana Shield.</span
          >
          <span class="block"
            ><a
              href="/skills/mana_shield"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >Mana Shield</a
            >
            then spends 1 Mana per point of remaining direct damage. If the hit exceeds
            your remaining Mana, the shield ends and the rest reaches your Health.</span
          >
          <span class="block"
            >Ward also absorbs ordinary damage-over-time ticks before they
            reduce Health.</span
          >
          <span class="block"
            >See <a
              href="#buffs"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >Buff Scaling</a
            > for the ward capacity you receive.</span
          >
        </p>
      </div>
      <!-- Source: server-scripts/Skills.cs:GetFinalDamageDoT,GetBuffHealthRecoveryBonus; NetworkManagerMMO.cs:OnStartServer — Reaper Form loses its rounded maximum-Health percentage each second, bypassing normal DoT rules and BreakMezz. -->
      <div>
        <h3 class="font-semibold mb-1">Reaper Form Health Drain</h3>
        <p class="text-sm text-muted-foreground">
          Reaper Form drains its listed percentage of your maximum Health each
          second, rounded. See the <a
            href="/skills/reaper_form"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Reaper Form calculation</a
          > for your amount. This drain ignores resistance, wards, critical ticks,
          and Deathly Focus bonuses, and does not end Sleep.
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/Combat.cs:fearResistChance,DealDamageAt; EquipmentItem.cs:ToolTip — Fear Resist caps at 100%; fear is an else-if after stun, and applying fear dismounts the player. -->
        <h3 class="font-semibold mb-1">Fear</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >Fear applies when the skill's fear chance succeeds and the target
            fails a separate Fear Resist roll. A hit that attempts to stun
            cannot also cause fear, even if a Bear Mount prevents that stun.</span
          >
          <span class="block"
            >Monsters and companions whose pages list Immune to Fear cannot be
            feared. That includes every boss and the Necromancer's undead
            companions.</span
          >
          <span class="block"
            >Fear lasts for a random duration between half and all of the
            skill's listed fear duration.</span
          >
          <span class="block"
            >Equipment and skills add Fear Resist up to 100%, which grants
            immunity. Fear dismounts a player.</span
          >
          <!-- Source: server-scripts/Combat.cs:1104-1108; Monster.cs:speed; Npc.cs:speed — Necromancer-player fear sets fearSlowsMovement and halves positive Monster/Npc speed in FEAR. -->
          <span class="block"
            >Fear inflicted by a Necromancer player halves a monster's or NPC's
            positive Movement Speed while feared.</span
          >
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/Monster.cs:UpdateServer_IDLE,speed,RemoveRoot; Pet.cs:UpdateServer_IDLE; Npc.cs:UpdateServer_IDLE; TargetDebuffSkill.cs:Apply — Movement Speed at most −10 roots; monsters roll every 2 seconds, NPCs and pets every second; boss/elite monsters resist listed speed bonuses below −10. -->
        <h3 class="font-semibold mb-1">Root</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >A debuff that brings Movement Speed to −10 or below roots the
            target, such as <a
              href="/skills/root"
              class="text-blue-600 dark:text-blue-400 hover:underline">Root</a
            >
            and
            <a
              href="/skills/immobilize"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >Immobilize</a
            >.</span
          >
          <!-- Source: server-scripts/Monster.cs:UpdateServer_IDLE; Pet.cs:UpdateServer_IDLE; Npc.cs:UpdateServer_IDLE — the at-most-−50 Sleep branch precedes the at-most-−10 Root branch. -->
          <span class="block">At −50 or below, Sleep takes priority.</span>
          <span class="block">Root persists through damage.</span>
          <span class="block"
            >Every 2 seconds, a rooted monster rolls a break-free chance of 0.1
            percentage points per Magic Resist, between 5% and 95%. For example,
            100 Magic Resist gives 10%.</span
          >
          <span class="block"
            >Every second, a rooted NPC has a 10% chance to break free.</span
          >
          <span class="block"
            >Every second, a rooted pet has a 10% chance to break free.</span
          >
          <span class="block"
            >Bosses and elite monsters automatically resist debuffs with a
            listed Movement Speed bonus below −10.</span
          >
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/Skills.cs:BreakMezz — Movement Speed at most −50 is Sleep. -->
        <!-- Source: server-scripts/Combat.cs:DealDamageAt (damage > 0 calls BreakMezz) -->
        <!-- Source: server-scripts/Skills.cs:251-256 — damage-over-time recovery ticks call BreakMezz except NecromancerReaperFormSkill. -->
        <!-- Source: server-scripts/Monster.cs:1539-1553 (monster self-break: magic resist roll every 6s) -->
        <!-- Source: server-scripts/TargetDebuffSkill.cs:Apply — boss/elite monsters automatically resist listed speedBonus below −10. -->
        <h3 class="font-semibold mb-1">Sleep</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >A debuff that reduces Movement Speed to −50 or below causes Sleep.</span
          >
          <span class="block"
            >A direct hit or ordinary damage-over-time tick immediately ends
            Sleep.</span
          >
          <span class="block"
            >Bosses and elite monsters automatically resist debuffs with a
            listed Movement Speed bonus below −10.</span
          >
          <span class="block"
            >Every 6 seconds, a sleeping monster makes the same Magic Resist
            break-free roll described under Root.</span
          >
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/Combat.cs:DealDamageAt — Rampage adds 50–75% damage to monster/NPC non-spell hits below 10% Health. -->
        <h3 class="font-semibold mb-1">Enrage</h3>
        <p class="text-sm text-muted-foreground">
          Monsters and NPCs with <a
            href="/skills/rampage"
            class="text-blue-600 dark:text-blue-400 hover:underline">Rampage</a
          >
          deal 50% to 75% extra damage on non-spell hits while below 10% Health. The
          extra damage rounds up, as shown in the
          <a
            href="#damage-pipeline"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Damage Pipeline</a
          >. The Warrior skill
          <a
            href="/skills/enrage"
            class="text-blue-600 dark:text-blue-400 hover:underline">Enrage</a
          >
          changes Attack Power and maximum Health as shown on its skill page.
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/Combat.cs:isParry,DealDamageAt — the current Parry cast must target the attacker and the incoming skill must be TargetDamageSkill with physical damage; only Warrior learns Parry in the exported class list. -->
        <h3 id="parry" class="font-semibold mb-1 scroll-mt-24">Parry</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >A Warrior can cast <a
              href="/skills/parry"
              class="text-blue-600 dark:text-blue-400 hover:underline">Parry</a
            >, a veteran skill, while targeting the attacker.</span
          >
          <span class="block"
            >During the cast, Parry blocks a single-target physical melee hit
            from that attacker.</span
          >
        </p>
        <!-- Source: server-scripts/Combat.cs:DealDamageAt — Parry returns half the post-shield damage, rounded and bounded to 1–5,000. RoundToInt rounds the 50.5 result of a 101-damage hit to 50. -->
        <p class="text-sm text-muted-foreground mt-2">
          Parry returns half the hit's damage remaining after Ward and Mana
          Shield to the attacker, rounded to the nearest whole point, with a
          minimum of 1 and a maximum of 5,000. If 101 damage remains, Parry
          deals 50.
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/PlayerSkills.cs:CmdUse — Assasination requires current target Health at most one quarter of maximum Health, rounded to the nearest whole point. -->
        <h3 class="font-semibold mb-1">Assassination</h3>
        <p class="text-sm text-muted-foreground">
          Rogue's <a
            href="/skills/assasination"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Assasination</a
          >
          requires the target's current Health to be at most 25% of its maximum Health.
          That Health limit rounds to the nearest whole point.
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; ProjectileSkillEffect.cs:FixedUpdate — weapon effects roll before the hit; broken melee weapons are excluded, and Rogue off-hand chance is halved. -->
        <!-- Source: server-scripts/Combat.cs:DealDamageAt — proc weapons and scrolls are excluded from damage shields. -->
        <h3 class="font-semibold mb-1">Weapon On-Hit Effects</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >Each melee or bow auto attack rolls the weapon's listed on-hit
            chance, even when the attack then misses. A broken melee weapon
            never triggers.</span
          >
          <span class="block"
            >A Rogue's off-hand weapon triggers its effect at half the listed
            chance.</span
          >
          <span class="block"
            >A weapon-triggered effect does not set off the target's damage
            shield.</span
          >
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/AreaObjectSpawnSkill.cs:AreaObjectSpawner.ApplyDamageToEntities — damage is halved and rounded for any Pet target. -->
        <h3 class="font-semibold mb-1">Ground Area Damage to Pets</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >Skills that mark a danger zone before dealing damage hit
            mercenaries, companions and familiars for half their listed damage,
            rounded.</span
          >
          <span class="block">Players take the listed damage.</span>
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/Buff.cs:Buff; BuffSkill.cs:GetCleanseCountersRemoved; TargetBuffSkill.cs:Apply; AreaBuffSkill.cs:Apply — each debuff starts with three layers; the four 10-yd player area cleanses affect living, visible players and pets, without a party gate; Remedy is targeted. -->
        <h3 id="cleanse" class="font-semibold mb-1 scroll-mt-24">Cleansing</h3>
        <p class="text-sm text-muted-foreground mb-2">
          <span class="block"
            ><a
              href="/skills/cleanse"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >Cleanse</a
            >,
            <a
              href="/skills/purify"
              class="text-blue-600 dark:text-blue-400 hover:underline">Purify</a
            >,
            <a
              href="/skills/purifying_winds"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >Purifying Winds</a
            >
            and
            <a
              href="/skills/nullify_magic"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >Nullify Magic</a
            >
            affect you and every living, visible player and pet within 10 yd, party
            or not.
            <a
              href="/skills/remedy"
              class="text-blue-600 dark:text-blue-400 hover:underline">Remedy</a
            >
            is cast on yourself or an ally.</span
          >
          <span class="block"
            >Cleanse bypasses the landing resistance roll.</span
          >
          <span class="block"
            >Cleanse removes debuffs only of its listed elements.</span
          >
        </p>
        <p class="text-sm text-muted-foreground mb-2">
          <span class="block"
            >Limited-use Cleanse items require a removable matching debuff. A
            Cleanse skill can be cast even when the target has no matching
            debuff.</span
          >
        </p>
        <p class="text-sm text-muted-foreground mb-2">
          <span class="block"
            >Each debuff starts with three layers and expires when the last
            layer is removed.</span
          >
        </p>
        <Calculation calculation={cleanseCalculation} />
        <p class="text-sm text-muted-foreground mt-2">
          <span class="block"
            >See <a
              href="#debuffs"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >Debuff Mechanics</a
            > for tick damage after layers are removed.</span
          >
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/TargetDebuffSkill.cs:Apply; AreaDebuffSkill.cs:Apply — dispel uses its landing roll, then removes TargetBuffSkill and AreaBuffSkill, preserving player Rest and all BardSongSkill buffs. -->
        <h3 id="dispel" class="font-semibold mb-1 scroll-mt-24">Dispel</h3>
        <p class="text-sm text-muted-foreground mb-2">
          <span class="block"
            >Dispel removes beneficial buffs from its target.</span
          >
          <span class="block">Players can dispel monsters.</span>
          <span class="block"
            >Monsters with Dispel skills can cast them on players and their
            pets.</span
          >
        </p>
        <p class="text-sm text-muted-foreground mb-2">
          <strong>1. Landing:</strong> Dispel first uses the
          <a
            href="#resistance"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >matching resistance roll</a
          >. Buff removal requires a successful landing.
        </p>
        <p class="text-sm text-muted-foreground mb-2">
          <span class="block"
            ><strong>2. Removal:</strong> if Dispel lands on a player, it
            removes targeted and area buffs except
            <a
              href="/skills/rest"
              class="text-blue-600 dark:text-blue-400 hover:underline">Rest</a
            >. Bard songs stay.</span
          >
          <span class="block"
            >On pets, it removes targeted and area buffs, including Rest. Bard
            songs stay.</span
          >
          <span class="block"
            >A monster's targeted and area buffs each use their own removal
            roll:</span
          >
        </p>
        <Calculation calculation={dispelCalculation} />
        <!-- Source: server-scripts/TargetDebuffSkill.cs:Apply; ScrollItem.cs:UseAfterCast — single-target scroll dispels use the cast rank calculated from Scroll Mastery. -->
        <p class="text-sm text-muted-foreground mt-2">
          A single-target scroll uses the rank determined by <a
            href="/professions/scroll_mastery"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Scroll Mastery</a
          >.
        </p>
      </div>

      <!-- Source: server-scripts/Skills.cs:AddOrRefreshBuff -->
      <div>
        <h3 class="font-semibold mb-1">Buff &amp; Debuff Overwrite</h3>
        <p class="text-sm text-muted-foreground mb-2">
          <span class="block"
            >A newly applied buff replaces every existing buff in its overwrite
            group, regardless of rank or strength.</span
          >
          <span class="block"
            >For example, <a
              href="/skills/divine_shield"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >Divine Shield</a
            >
            and
            <a
              href="/skills/shield_of_faith"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >Shield of Faith</a
            > replace each other because they share a group.</span
          >
          <!-- Source: server-scripts/BardSongSkill.cs:TryApplyAuraBuff — an existing same-group song of at least equal strength rejects another song/source. -->
          <span class="block"
            >Bard songs are the exception: a song from another Bard replaces an
            existing song in the same group only if it is stronger. See <a
              href="/mechanics/bard#songs"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >Bard Songs</a
            >.</span
          >
        </p>
        <ul
          class="text-sm text-muted-foreground list-disc list-inside space-y-1"
        >
          <li>Skills without an overwrite group can stack with other buffs.</li>
          <li>
            Multiple debuffs with different or no overwrite groups apply
            independently.
          </li>
          <li>
            When a <em>pet</em> casts an area buff, it skips targets that already
            have a buff in the same overwrite group. A player's buff instead replaces
            those buffs.
          </li>
          <li>
            Each damage-over-time skill maintains its own debuff layers when
            several affect the same target.
          </li>
        </ul>
      </div>
    </Card.Content>
  </Card.Root>
</div>

<style>
  .combat-page {
    min-width: 0;
  }
  .combat-page :global([data-slot="card-content"]) {
    min-width: 0;
  }
  .combat-page :global(nav[aria-label="Page sections"] p) {
    font-size: 14px;
  }
  table {
    table-layout: fixed;
    overflow-wrap: anywhere;
  }
  tbody :global(tr:nth-child(even)) {
    background-color: var(--muted);
  }
  th,
  td {
    vertical-align: top;
  }
</style>
