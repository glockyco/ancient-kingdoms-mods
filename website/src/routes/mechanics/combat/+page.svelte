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
    wildStrikeCalculation,
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
    { id: "effects-and-control", label: "Buffs, Wards and Control" },
    { id: "debuffs", label: "Debuff Mechanics" },
    { id: "timing", label: "Timing & Haste" },
    { id: "special", label: "Special Mechanics" },
  ];

  // Source: server-scripts/TargetDamageSkill.cs:180-242; TargetProjectileSkill.cs:184-219; FrontalDamageSkill.cs:63-101; FrontalProjectilesSkill.cs:75-104 — handlers start with character-window damage and then subtract weapon terms, add attributes, and apply the skill multiplier.
  const DAMAGE_FORMULAS = [
    ["Physical", "Other physical attacks", "Damage"],
    [
      "Physical",
      "Ranger targeted and frontal melee",
      "Damage − listed bow damage",
    ],
    [
      "Physical",
      "Rogue targeted melee",
      "Damage − 50% of listed off-hand damage, with the subtraction rounded up",
    ],
    [
      "Physical",
      "Rogue mercenary melee",
      "Damage, including full damage from both weapons",
    ],
    [
      "Ranged",
      "Player targeted bow attacks",
      "Damage + 150% of Dexterity, rounded, − listed main-hand weapon damage",
    ],
    [
      "Ranged",
      "Ranger bow attacks in front",
      "Damage + 150% of Dexterity, rounded, including melee weapon damage",
    ],
    [
      "Ranged",
      "Mercenary bow attacks",
      "Damage + 150% of Dexterity, rounded, including melee weapon damage",
    ],
    [
      "Poison",
      "Rogue targeted poison attacks",
      "Damage + 250% of Dexterity, rounded, − 50% of listed off-hand damage, with the subtraction rounded up. Mercenaries retain full off-hand damage",
    ],
    [
      "Poison",
      "Rogue projectile and frontal poison attacks",
      "Damage + 250% of Dexterity, rounded",
    ],
    [
      "Magic",
      "Magic, fire, cold, and disease spells",
      "Magic Damage. Ranger targeted and frontal damage skills still subtract listed bow damage, and Rogue targeted damage skills still subtract half the listed off-hand damage, rounded up",
    ],
    [
      "Magic",
      "Final Cadence",
      "Base skill damage × song power, rounded, then × (100% + Melody bonus), rounded again. Mercenaries use song power alone",
    ],
    [
      "Magic",
      "Magic weapon attacks",
      "Magic Damage + Damage. The combined hit meets Magic Resist once",
    ],
    [
      "Magic",
      "Rogue targeted magic weapon attacks",
      "Magic Damage + Damage − 50% of listed off-hand damage, with the subtraction rounded up. The combined hit meets Magic Resist once",
    ],
    [
      "Magic",
      "Ranger magic weapon attacks",
      "Magic Damage + Damage − listed bow damage. Wild Strike uses its empowered auto-attack rule below",
    ],
    [
      "Special",
      "Rageblow and Mana Burn",
      "200% of current Rage for Rageblow, or 300% of current Mana for Mana Burn",
    ],
    [
      "Monster",
      "Monster physical and magic attacks",
      "The corresponding Damage or Magic Damage stat, including level-based base damage and applicable bonuses",
    ],
  ];
</script>

<Seo
  title="Combat Mechanics - Ancient Kingdoms"
  description="How damage, armor and resistance, healing, haste, and buff and debuff scaling work in Ancient Kingdoms combat."
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
          Bard-charmed monsters are protected from player attacks.</span
        >
        <span class="block"
          >A targeted attack without a valid target selects the nearest
          non-hidden, attackable monster within 10 yd if one exists.</span
        >
      </p>
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
          >You can still dismiss an active Reaper Form or Fearless Stance.</span
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
      <!-- Source: server-scripts/Skills.cs:911-920 — StartCast calls StartDefaultAttackAfterMeleeSkill except for invisibility TargetBuffSkill. -->
      <!-- Source: server-scripts/PlayerSkills.cs:StartDefaultAttackAfterMeleeSkill — non-spell Weapon or Shield TargetDamageSkill or damaging TargetDebuffSkill casts queue the learned/default followupDefaultAttack on an attackable current target when no follow-up exists and CheckWeapon passes. -->
      <p>
        A non-spell weapon or shield skill queues your selected default attack
        on your current attackable target when it deals targeted damage or
        applies a damaging targeted debuff. This applies to skills other than
        default auto attacks and invisibility buffs. The pending follow-up slot
        must be empty. Your selected default attack must be valid, learned (or
        learned by default), and usable with your weapon.
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
        See <a href="#damage-formulas" class="underline hover:text-foreground"
          >Damage Formulas</a
        >
        for the starting hit,
        <a href="#resistance" class="underline hover:text-foreground"
          >Resistance and Mitigation</a
        >
        for avoidance and damage reduction, and
        <a href="#combat-advantage" class="underline hover:text-foreground"
          >Combat Advantage</a
        > for movement and from-behind adjustments.
      </p>
      <!-- Source: server-scripts/Combat.cs:864-875 — critical checks require post-mitigation damage above 3, and Monster AreaDamageSkill casts skip them. -->
      <p class="text-muted-foreground">
        Critical checks require more than 3 damage after mitigation. The chance
        uses attacker Critical Chance plus the skill's critical bonus. Monster
        area damage skills skip this check. For eligible non-auto skills,
        Radiant Aether uses a 200% critical extra percentage.
      </p>
      <!-- Source: server-scripts/Combat.cs:700-703,776-875 — Manaburn bypasses avoidance and mitigation but still goes through variance, advantage, level adjustment, and critical checks. -->
      <p class="text-muted-foreground">
        <strong>Rageblow and Mana Burn:</strong> bypass avoidance and mitigation,
        but still receive variance, advantage, level adjustment, and eligible critical
        hits. Ward and Mana Shield still absorb their damage.
      </p>
    </Card.Content>
  </Card.Root>
  <!-- ── §2 Damage Formulas ─────────────────────────────────────────────── -->
  <Card.Root id="damage-formulas" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Damage Formulas</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-6">
      <h3 class="font-semibold">Character Window Damage and Magic Damage</h3>
      <Calculation calculation={characterDamageCalculation} />
      <!-- Source: server-scripts/TargetDamageSkill.cs:238-242; TargetProjectileSkill.cs:211-219; FrontalDamageSkill.cs:98-101 — handlers add the flat skill value, then round after a positive skill multiplier. -->
      <p class="text-sm text-muted-foreground">
        The table gives the starting stat for each attack. Add the skill's flat
        damage, then apply its listed damage percentage and round if it has a
        positive multiplier. Scrolls omit character stats and use their own
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
                <td class="py-2 pr-4">{attack}</td>
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
            With only a bow equipped, a Ranger's bow attack loses the bow's
            listed damage. Equip a melee weapon in the main hand to avoid this.
          </p>
          <!-- Source: server-scripts/Equipment.cs:230-247; TargetDamageSkill.cs:223-232; FrontalDamageSkill.cs:88-92 — broken slot 13 equipment adds no damage but is still subtracted from melee damage. -->
          <p>
            A broken bow still subtracts its full damage from Ranger melee
            attacks. A broken off-hand weapon subtracts half its damage, rounded
            up, from Rogue melee attacks. Repair or unequip the broken item.
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
        >Defense and matching resist stats decide avoidance and how much damage
        you take.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-5 text-sm">
      <!-- Source: server-scripts/Combat.cs:1551-1580; TargetDebuffSkill.cs:105-143; AreaDebuffSkill.cs:113-158 — elemental damage, debuffs, and dispels use the matching resistance roll. -->
      <h3 class="font-semibold">Resist Roll</h3>
      <Calculation calculation={avoidanceCalculation()} />
      <p class="text-muted-foreground">
        Magic, fire, cold, poison, and disease hits use the matching resist
        stat. A successful resist prevents all damage from that hit. Debuffs and
        dispels use the same landing roll. Physical debuffs use Defense at the
        same rate as an elemental resist.
      </p>
      <!-- Source: server-scripts/Combat.cs:307-317,1539-1548 — physical hits use capped block chance rather than the physical debuff formula. -->
      <h3 class="font-semibold">Physical Block and Miss</h3>
      <Calculation calculation={avoidanceCalculation(true)} />
      <p class="text-muted-foreground">
        A block or miss prevents all damage from the physical hit. From-behind
        attacks and moving players adjust avoidance after these bounds. See <a
          href="#combat-advantage"
          class="underline hover:text-foreground">Combat Advantage</a
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
          {#each [["Physical", "Defense"], ["Magic", "Magic Resist"], ["Fire", "Fire Resist"], ["Cold", "Cold Resist"], ["Poison", "Poison Resist"], ["Disease", "Disease Resist"]] as [type, stat] (type)}
            <tr
              ><td class="py-2 pr-4">{type}</td><td
                class="py-2 text-muted-foreground">{stat}</td
              ></tr
            >
          {/each}
        </tbody>
      </table>
      <!-- Source: server-scripts/TargetDebuffSkill.cs:135-143; AreaDebuffSkill.cs:142-158 — resistance-reducing debuffs subtract 30 percentage points, while a speed bonus below −10 forces boss/elite resistance. -->
      <p class="text-muted-foreground">
        A resistance-reducing debuff lowers its landing resistance chance by 30
        percentage points, to a minimum of zero. Bosses and elite monsters
        automatically resist debuffs that reduce Movement Speed below −10.
      </p>
    </Card.Content>
  </Card.Root>

  <!-- Source: server-scripts/Combat.cs:673-692,776-781 — targeted damage and projectile skills gain advantage when both look directions match; resist chance is multiplied by 0.8, and damage gains 10% rounded up plus 1. -->
  <Card.Root id="combat-advantage" class="bg-muted/30">
    <Card.Header><Card.Title>Combat Advantage</Card.Title></Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <!-- Source: server-scripts/Combat.cs:673-698,776-781 — targeted strikes and projectiles gain advantage when look directions match. Moving-player penalties apply to incoming hits. -->
      <p>
        Targeted strikes and projectiles gain from-behind advantage when
        attacker and target face the same direction.
      </p>
      <Calculation calculation={advantageCalculation} />
      <!-- Source: server-scripts/Combat.cs:693-697 — against a moving player, stunChance gains Clamp(0.1 − 0.01 × level difference, 0.01, 0.1), capped at 1, and stunTime is at least 0.5 seconds. -->
      <p>
        Against a moving player, physical hits from attackers above level 5 also
        add 10 percentage points of stun chance minus 1 percentage point per
        target level above the attacker. The addition stays between 1 and 10
        percentage points, total stun chance stays at most 100%, and stun
        duration is at least 0.5 seconds.
      </p>
      <!-- Source: server-scripts/Combat.cs:766-774 — five player cast slots are interrupted and grant damage advantage plus 75 percentage points of critical chance. -->
      <p>
        Interrupting a player's vulnerable cast adds the from-behind damage
        bonus and 75 percentage points of critical chance. Avoidance still
        follows the attack's position and the target's movement.
      </p>
      <!-- Source: server-scripts/Combat.cs:567-571 — returning-home monsters evade incoming hits. -->
      <p>
        A monster returning home evades incoming hits. See <MechanicsLink
          section="monster-spawns#leashing">Leashing and Resets</MechanicsLink
        > for its reset rules.
      </p>
      <p>
        See <a href="#damage-pipeline" class="underline hover:text-foreground"
          >Damage Pipeline</a
        >
        and
        <a href="#resistance" class="underline hover:text-foreground"
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
        <!-- Source: server-scripts/TargetHealSkill.cs:137-143; NecromancerDeathBloomSkill.cs:19-25,47-50 — scrolls skip Wisdom and Death Bloom uses Intelligence. -->
        <p class="text-sm text-muted-foreground mt-2">
          <a href="/skills/death_bloom" class="underline hover:text-foreground"
            >Death Bloom</a
          >
          uses Intelligence. Healing scrolls, including Major Restoration, use their
          listed healing regardless of Wisdom, before critical checks.
        </p>
        <!-- Source: server-scripts/BardFinalCadenceSkill.cs:67-70; exported-data/skills.json:152375 — Final Cadence uses Charisma song power and the Melody bonus. -->
        <p class="text-sm text-muted-foreground mt-2">
          Final Cadence ignores Wisdom and scales its damage and healing with <a
            href="#buffs"
            class="underline hover:text-foreground">song power</a
          >, then the Melody bonus:
        </p>
        <Calculation calculation={songCalculation(true)} />
        <!-- Source: server-scripts/BardFinalCadenceSkill.cs:67-70,FindEnemies; PlayerSkills.cs:CompleteBardSongCast,ConsumeFinalCadenceRepertoireBonus — Final Cadence rounds Charisma-scaled damage/healing with a consumed repertoire multiplier; only engaged Monsters with speed above -50 qualify as enemies. -->
        <p class="text-sm text-muted-foreground mt-2">
          Melody counts distinct songs you manually complete less than 40
          seconds before Final Cadence. Four give 15% extra damage and healing,
          five give 25%, and six or more give 30%. Up to three give 0%. Final
          Cadence consumes the song count, including casts with zero enemy hits.
          Its damage hits living, visible, attackable monsters within range in
          the same zone, with an aggro entry and Movement Speed above −50.
          Mercenary casts also require engagement with their owner's party.
        </p>
        <!-- Source: server-scripts/Combat.cs:1315-1333 — lifetap healing is FloorToInt(lifetapPercent × remaining damage × (1 + summed active/permanent lifetapHealingPercentBonus)); the damage is not capped by remaining victim health. -->
        <h3 id="lifetap" class="font-semibold mt-4 mb-2 scroll-mt-24">
          Lifetap
        </h3>
        <Calculation calculation={lifetapCalculation()} />
        <p class="text-sm text-muted-foreground mt-2">
          Lifetap restores Health and leaves damage unchanged. Overkill damage
          contributes to the healing.
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
            >Final Cadence uses one roll based on the Bard's Critical Chance for
            all recipients.</span
          >
          <span class="block"
            >Healing-over-time critical ticks heal for 150% of the normal tick,
            rounded.</span
          >
          <span class="block"
            >Their chance uses the caster's Critical Chance when the buff
            starts.</span
          >
          <!-- Source: server-scripts/Skills.cs:329-346 — over-time critical checks require base duration below 30 seconds and more than 3 flat healing. -->
          <span class="block"
            >Only buffs with a base duration below 30 seconds and more than 3
            healing per tick can have critical healing ticks.</span
          >
        </p>
      </div>

      <!-- Source: server-scripts/TargetHealSkill.cs:137-143; AreaHealSkill.cs:101-105 — only player and mercenary casters receive Wisdom healing additions. -->
      <p class="text-sm text-muted-foreground">
        Ranger mercenaries use the ordinary Wisdom bonus. Monsters, NPCs, and
        other pets use base healing before critical checks.
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
        <!-- Source: server-scripts/uMMORPG.Scripts.PlayerAttributes/Charisma.cs:27-40; Buff.cs:276-291; BuffSkill.cs:ScaleFearResistChanceBonus,ScaleHealingPerSecondBonus — song power scales whole-number and percentage effects. -->
        <h3 class="font-semibold mb-2">Bard Song Scaling</h3>
        <Calculation calculation={songCalculation()} />
        <p class="text-sm text-muted-foreground mt-2">
          <!-- Source: server-scripts/BardSongSkill.cs:Apply and BardMercenarySkills.cs:RefreshAura — a song buff from a Bard or Bard mercenary carries that singer's Charisma. -->
          <span class="block"
            >Bard songs use only the Charisma of the Bard or Bard mercenary
            singing them.</span
          >
          <span class="block"
            >Whole-number values include Ward, Defense, flat damage and
            resistance, and flat resource recovery.</span
          >
          <span class="block"
            >Percentage values include damage, Accuracy, Critical Chance, Haste,
            Spell Haste, and percentage resource recovery.</span
          >
          <span class="block"
            >Fear Resistance follows the formula up to the song's listed limit.</span
          >
          <span class="block"
            >Cacophony's damage per second uses its base value + 75% of
            non-negative Charisma, with the Charisma addition rounded.</span
          >
        </p>
        <p class="text-sm text-muted-foreground mt-2">
          <span class="block"
            >Charisma leaves Movement Speed, primary attributes, maximum Mana
            percentage, Damage Shield, and Heal on Hit at their listed values.</span
          >
        </p>
      </div>

      <div>
        <h3 class="font-semibold mb-2">Attribute Bonuses by Buff Effect</h3>
        <!-- Source: server-scripts/Buff.cs:ScaleWithCharisma and Skills.cs:GetFinalHealOverTime — Charisma-scaled song values skip the Wisdom additions. -->
        <!-- Source: server-scripts/BuffSkill.cs:GetBuffPowerAttribute; TargetBuffSkill.cs:434-445; AreaBuffSkill.cs:33-45 — scalesWithIntelligence selects Intelligence instead of Wisdom; Ranger targeted buffs triple the selected attribute. -->
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
              {#each [["Maximum Health", "Base bonus + 200% of buff attribute"], ["Defense and each resist", "Base bonus + 15% of buff attribute, with the attribute addition rounded"], ["Ward", "Base capacity + 200% of buff attribute"], ["Damage Shield", "Base damage + 75% of buff attribute, with the attribute addition rounded"], [`Healing over time, base duration below ${seconds(60)}`, "Base healing + base healing × 0.4% per buff attribute point above 0, limited to a 500% bonus, with the extra healing rounded"], [`Healing over time, base duration at least ${seconds(60)}`, "Base healing + 30% of buff attribute above 0, with the attribute addition rounded"]] as [effect, formula] (effect)}
                <tr
                  ><td class="py-2 pr-4">{effect}</td><td
                    class="py-2 text-muted-foreground">{formula}</td
                  ></tr
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
          Enter your Wisdom, or Intelligence for buffs that scale with it. For a
          player Ranger's targeted buff, enter three times that attribute.
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
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4 text-sm">Player Rangers</td><td
                  class="py-1 text-muted-foreground"
                  >Targeted buffs use triple the selected attribute. Area buffs
                  use it unchanged</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4 text-sm">Other players</td><td
                  class="py-1 text-muted-foreground"
                  >Targeted and area buffs use the selected attribute unchanged</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4 text-sm">Mercenary-skill area buffs</td
                ><td class="py-1 text-muted-foreground"
                  >Half of Wisdom + Constitution, rounded</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4 text-sm">Leadership</td><td
                  class="py-1 text-muted-foreground"
                  >Half of Wisdom + Constitution + Charisma, rounded</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4 text-sm"
                  >Mercenary buffs other than songs</td
                ><td class="py-1 text-muted-foreground"
                  >Use the selected buff attribute</td
                ></tr
              >
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

  <!-- Source: server-scripts/Buff.cs:9-25; Skills.cs:1226-1245 — effects have a timed end and reapplying the same effect replaces it and restarts its duration. -->
  <Card.Root id="effects-and-control" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Buffs, Debuffs, Wards and Cleanse</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <p>
        <span class="block"
          >Buffs and debuffs last for their listed duration unless removed
          earlier.</span
        >
        <span class="block"
          >Reapplying the same effect replaces it and restarts its duration.</span
        >
      </p>
      <p>
        See <a href="#special" class="underline hover:text-foreground"
          >Special Mechanics</a
        >
        for Root, Stun, and Sleep, and
        <a href="#targeting" class="underline hover:text-foreground"
          >Targets, Range and Casting</a
        > for casting restrictions.
      </p>
      <!-- Source: server-scripts/Skills.cs:ApplyWardToDoTDamage — ApplyWardToDoTDamage takes tick damage from the ward pool and passes the excess. -->
      <!-- Source: server-scripts/Combat.cs:910-952 — damageShield buffs deal damage back to the attacker. -->
      <p>
        <span class="block"
          >A ward absorbs ordinary damage-over-time ticks until its pool runs
          out.</span
        >
        <span class="block"
          >Any damage beyond the remaining ward reduces health.</span
        >
        <span class="block"
          >A damage shield deals damage back to attackers.</span
        >
        <span class="block"
          >See <a href="#special" class="underline hover:text-foreground"
            >Ward and Mana Shield Priority</a
          > for direct hits.</span
        >
      </p>
      <!-- Source: server-scripts/TargetBuffSkill.cs:321-334; BuffSkill.cs:56-67 — cleansing removes only debuffs whose elements match the spell; the exported Cleric Cleanse skill enables poison and disease. -->
      <p>
        Cleric's <a
          href="/skills/cleanse"
          class="underline hover:text-foreground">Cleanse</a
        >
        removes counters from poison and disease debuffs. See
        <a href="#cleanse" class="underline hover:text-foreground"
          >Cleanse counters</a
        > for resistance and repeat casts.
      </p>
      <!-- Source: server-scripts/TargetDebuffSkill.cs:105-143,173-205 — dispels resist on landing and remove eligible beneficial buffs. -->
      <p>
        <a href="#dispel" class="underline hover:text-foreground">Dispel</a>
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
              class="underline hover:text-foreground">Bard Song Scaling</a
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
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4"
                  >Melee debuffs (reduce physical defense)</td
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
              {#each [["Defense reduction", "Base reduction + 50% of selected debuff attribute for melee debuffs, or 40% for other debuffs, with the attribute addition rounded"], ["Each resist reduction", "Base reduction + 40% of selected debuff attribute, with the attribute addition rounded"], ["Damage and Magic Damage reduction", "Base reduction + 50% of selected debuff attribute, with the attribute addition rounded"], ["Dexterity-scaled poison and disease ticks", "Base tick + 150% of Dexterity, with the attribute addition rounded. Both meet Poison Resist"], ["Intelligence-scaled poison and disease ticks", "Base tick + the skill's percentage of Intelligence, with the attribute addition rounded. Poison meets Poison Resist and disease meets Disease Resist"], ["Physical damage-over-time ticks", "Base tick + 50% of Strength, with the attribute addition rounded. Meets Defense"], ["Fire, cold, and magic ticks", "Base tick + the skill's percentage of Intelligence, with the attribute addition rounded. Meets the matching resist"]] as [effect, formula] (effect)}
                <tr
                  ><td class="py-2 pr-4">{effect}</td><td
                    class="py-2 text-muted-foreground">{formula}</td
                  ></tr
                >
              {/each}
            </tbody>
          </table>
        </div>
        <!-- Source: server-scripts/BuffSkill.cs:14-31,508-515 — damageOverTimeBonusPerIntelligencePoint defaults to 1.25 and each skill can override it, while scalesWithCharisma effects skip the separate addition. -->
        <p class="text-sm text-muted-foreground mt-2">
          Most Intelligence-scaled ticks add 125% of Intelligence, while Ensnare
          adds 115%. Each skill page shows its percentage. Charisma-scaled songs
          receive no separate attribute addition.
        </p>
        <Calculation calculation={damageOverTimeCalculation} />
        <!-- Source: server-scripts/Skills.cs:ApplyDamageOverTimeBonuses,ApplyCriticalToOverTime — Reaper Form and execute require a different, online player caster, while critical chance is captured when the buff starts. -->
        <p class="text-sm text-muted-foreground mt-2">
          Reaper Form and execute bonuses apply to a debuff from another player
          who remains in the game. Critical chance uses the caster's Critical
          Chance when the debuff starts. Percentage-health damage receives
          neither bonus nor critical scaling. See <a
            href="#resistance"
            class="underline hover:text-foreground">Resistance and Mitigation</a
          >
          and
          <a href="#damage-pipeline" class="underline hover:text-foreground"
            >Damage Pipeline</a
          > for the shared defense and critical rules.
        </p>
        <!-- Source: server-scripts/Skills.cs:329-346 — critical damage-over-time checks require base duration below 30 seconds and more than 3 flat damage. -->
        <p class="text-sm text-muted-foreground mt-2">
          Critical damage-over-time checks require a base duration below 30
          seconds and more than 3 flat damage per tick.
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
        <h3 class="font-semibold mt-4 mb-2">Player Spell Intervals</h3>
        <Calculation calculation={timingCalculation(true)} />
        <p class="text-sm text-muted-foreground mt-2">
          The character window shows spell haste between −50% and 50%. Because
          of a game defect, casts use the full total, so enter your full
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
            {#each [["Companion's first non-spell skill", "Cast time + cooldown × (100% − Haste)"], ["Other companion and familiar skills", "Cast time + cooldown"], ["Mercenary auto attack", "Cast time + cooldown × (100% − Haste)"], ["Mercenary spell", "Cast time − cast time × full Spell Haste + cooldown"], ["Monster and NPC non-spell attacks", "Cast time + cooldown × (100% − Haste)"], ["Monster and NPC spells", "Cast time + cooldown"]] as [attack, formula] (attack)}
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
                <th class="text-left py-1 font-medium">Spell haste</th>
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
        <h3 class="font-semibold mb-1">Threat</h3>
        <Calculation calculation={threatCalculation} />
        <!-- Source: server-scripts/DamageSkill.cs:90; TargetDamageSkill.cs:249; AreaDamageSkill.cs:149 — the tooltip shows one third of maximum Health while these hits add the full amount. -->
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
        <!-- Source: server-scripts/DamageSkill.cs:49-67 — TryConsumeWildStrike checks the active Ranger follow-up buff, rounds ×(1 + 0.1 × buff level), sets DamageType.Magic, and selects WildStrikeTargetEffect. -->
        <!-- Source: server-scripts/TargetDamageSkill.cs:244,291 — ApplyDamage consumes the override for a sword follow-up and passes it to DealDamageAt. -->
        <!-- Source: server-scripts/TargetProjectileSkill.cs:221-222,252-256 — Apply consumes the override for a bow follow-up and passes it to the projectile effect. -->
        <!-- Source: server-scripts/Combat.cs:521,842-849,1189-1204 — DealDamageAt runs the common pipeline, mitigates Magic once, and instantiates the override effect. -->
        <h3 id="wild-strike" class="font-semibold mb-1 scroll-mt-24">
          Wild Strike
        </h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >Wild Strike empowers the Ranger's next sword or bow auto attack.</span
          >
          <span class="block"
            >Its empowerment applies after the auto attack's own damage
            calculation.</span
          >
          <span class="block"
            >The whole hit deals magic damage, which Magic Resist can block or
            reduce.</span
          >
        </p>
        <Calculation calculation={wildStrikeCalculation()} />
      </div>
      <div>
        <!-- Source: server-scripts/Combat.cs:DealDamageAt — auto-attack rage gain on dealing damage. -->
        <!-- Source: server-scripts/Combat.cs:DealDamageAt — single-target physical skill damage received by Warrior/Rogue entities invokes the shared rage formula. -->
        <h3 id="rage-generation" class="font-semibold mb-1 scroll-mt-24">
          Rage Generation
        </h3>
        <p class="text-sm text-muted-foreground mb-2">
          Warrior and Rogue generate Rage from two sources:
        </p>
        <h4 class="font-medium mt-3 mb-2">Dealing an auto attack</h4>
        <Calculation calculation={dealtRageCalculation} />
        <h4 class="font-medium mt-3 mb-2">
          Receiving a single-target physical skill
        </h4>
        <Calculation calculation={receivedHitCalculation()} />
        <p class="text-sm text-muted-foreground mt-2">
          Warrior and Rogue mercenaries use the same Rage rules.
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/Combat.cs:1066-1103 — DealDamageAt stun branch -->
        <h3 class="font-semibold mb-1">Stun</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >A hit stuns its target if the skill's stun chance roll succeeds.</span
          >
          <span class="block">Fear protects the target from stun.</span>
          <span class="block">Another stun extends the existing stun.</span>
          <span class="block">Bear mounts resist 90% of stuns.</span>
          <span class="block">A stun dismounts a player.</span>
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/Combat.cs:88 (knockbackTime = 0.25f), 90 (knockbackObstacleDamageBonus = 0.0125f), 1139-1160 -->
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
            >Knockback requires a level difference below 15 unless a boss
            monster casts it.</span
          >
        </p>
      </div>

      <div>
        <h3 class="font-semibold mb-1">Ward &amp; Mana Shield Priority</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >Ward absorbs direct damage before Mana Shield.</span
          >
          <span class="block"
            >Mana Shield absorbs any direct damage left after Ward.</span
          >
          <span class="block"
            >Ward also absorbs ordinary damage-over-time ticks before they
            reduce health.</span
          >
          <span class="block"
            >See <a href="#buffs" class="underline hover:text-foreground"
              >Buff Scaling</a
            > for the ward capacity you receive.</span
          >
        </p>
      </div>
      <!-- Source: server-scripts/Skills.cs:1620-1623,251-256 — NecromancerReaperFormSkill returns RoundToInt(max(0, -healthPercentPerSecondBonus) × health.max) before mitigation and skips BreakMezz. -->
      <div>
        <h3 class="font-semibold mb-1">Reaper Form Health Drain</h3>
        <p class="text-sm text-muted-foreground">
          Reaper Form drains its listed percentage of your maximum Health per
          recovery tick, rounded. See the <a
            href="/skills/reaper_form"
            class="underline hover:text-foreground">Reaper Form calculation</a
          > for your amount. This drain ignores resistance, wards, critical ticks,
          and execute bonuses, and preserves Sleep.
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/Combat.cs:278-290 (fearResistChance), 1104-1137 (DealDamageAt fear branch) -->
        <h3 class="font-semibold mb-1">Fear</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >Fear applies when the skill's fear chance succeeds and the target
            fails a separate fear resistance roll.</span
          >
          <span class="block"
            >Bosses and fear-immune targets, including the Necromancer's undead
            companions, are protected from fear.</span
          >
          <span class="block"
            >Fear lasts for a random duration between half and all of the
            skill's listed fear duration.</span
          >
          <span class="block"
            >Equipment and skills add Fear Resistance up to 100%, which grants
            immunity.</span
          >
          <!-- Source: server-scripts/Combat.cs:1104-1108; Monster.cs:speed; Npc.cs:speed — Necromancer-player fear sets fearSlowsMovement and halves positive Monster/Npc speed in FEAR. -->
          <span class="block"
            >Fear inflicted by a Necromancer player halves a monster's or NPC's
            positive movement speed while feared.</span
          >
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/Monster.cs and Pet.cs (root/full-stop threshold speed <= -10f, timerRoot 2s branch, RemoveRoot roll) -->
        <!-- Source: server-scripts/Monster.cs (RemoveRoot: removes -50 < speedBonus < 0) -->
        <!-- Source: server-scripts/Npc.cs (root/full-stop threshold speed <= -10f, timerRoot 1s branch, 10% fixed chance) -->
        <!-- Source: server-scripts/TargetDebuffSkill.cs:141 (boss/elite auto-resist speedBonus < -10) -->
        <h3 class="font-semibold mb-1">Root</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block">Root stops the target's movement.</span>
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
            >Bosses and elite monsters resist Root automatically.</span
          >
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/Skills.cs:1592-1597 (BreakMezz — entity.speed <= -50f) -->
        <!-- Source: server-scripts/Combat.cs:DealDamageAt (damage > 0 calls BreakMezz) -->
        <!-- Source: server-scripts/Skills.cs:251-256 — damage-over-time recovery ticks call BreakMezz except NecromancerReaperFormSkill. -->
        <!-- Source: server-scripts/Monster.cs:1539-1553 (monster self-break: magic resist roll every 6s) -->
        <!-- Source: server-scripts/TargetDebuffSkill.cs:141 (boss/elite auto-resist speedBonus < -10) -->
        <h3 class="font-semibold mb-1">Sleep</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >A debuff that reduces movement speed to −50 or below causes Sleep.</span
          >
          <span class="block"
            >A direct hit or ordinary damage-over-time tick immediately ends
            Sleep.</span
          >
          <span class="block"
            >Bosses and elite monsters automatically resist debuffs that reduce
            movement speed below −10.</span
          >
          <span class="block"
            >Every 6 seconds, a sleeping monster makes the same Magic Resist
            break-free roll described under Root.</span
          >
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/Combat.cs:792-823 — Monster and NPC Enrage modifies non-spell hits in the damage pipeline. -->
        <h3 class="font-semibold mb-1">Enrage</h3>
        <p class="text-sm text-muted-foreground">
          Monster and NPC Enrage follow the <a
            href="#damage-pipeline"
            class="underline hover:text-foreground">Damage Pipeline</a
          >. The Warrior skill Enrage changes damage and maximum Health as shown
          on its skill page.
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/Combat.cs:1344-1360, isParry; Player.cs:12225-12229 -->
        <h3 id="parry" class="font-semibold mb-1 scroll-mt-24">Parry</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >A Warrior or Ranger can cast Parry while targeting the attacker.</span
          >
          <span class="block"
            >During the cast, Parry blocks a single-target physical melee hit
            from that attacker.</span
          >
        </p>
        <Calculation calculation={receivedHitCalculation(true)} />
      </div>

      <div>
        <h3 class="font-semibold mb-1">Assassination</h3>
        <p class="text-sm text-muted-foreground">
          Assassination skills require the target to be below 25% health.
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/TargetDamageSkill.cs — slot 13 fires at procEffectProbability * 0.5f; durability > 0 guard on both slots -->
        <!-- Source: server-scripts/Combat.cs:1238 — proc weapons and scrolls are excluded from the damage-shield trigger. -->
        <h3 class="font-semibold mb-1">Weapon On-Hit Effects</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >A weapon's on-hit effect can trigger on auto attacks at the chance
            listed on the weapon.</span
          >
          <span class="block"
            >A Rogue's off-hand weapon triggers its effect at half the listed
            chance.</span
          >
          <span class="block">Weapon on-hit effects bypass Damage Shields.</span
          >
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/AreaObjectSpawnSkill.cs:119-122 — damage halved when the victim is a Pet (mercenaries and companions both derive from Pet). -->
        <h3 class="font-semibold mb-1">
          Ground Area Damage to Companions &amp; Mercenaries
        </h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >Skills that mark a danger zone before dealing damage hit
            mercenaries and companions for half their listed damage.</span
          >
          <span class="block">Players take the listed damage.</span>
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/Buff.cs:19 (3 counters); RelicItem.cs:20-35 (finite-charge item gate); BuffSkill.cs:518-540 (GetCleanseCountersRemoved); TargetBuffSkill.cs:137-161 (HasMatchingCleanseDebuff), 239-429 (Apply cleanse branch); AreaBuffSkill.cs:183,261 (area cleanse counter rolls); Skills.cs:1866-1872 (DoT per-counter scaling) -->
        <h3 id="cleanse" class="font-semibold mb-1 scroll-mt-24">Cleanse</h3>
        <p class="text-sm text-muted-foreground mb-2">
          <span class="block"
            >Cleanse is cast on yourself or an ally and removes harmful debuffs.</span
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
            >See <a href="#debuffs" class="underline hover:text-foreground"
              >Debuff Mechanics</a
            > for tick damage after layers are removed.</span
          >
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/TargetDebuffSkill.cs:105-143 (resist gate), 173-205,209-234,238-250 (removal); AreaDebuffSkill.cs:113-158 (resist gate), 184-281 (removal); Combat.cs:1540-1567 GetProbResistMagic/Disease -->
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
          <a href="#resistance" class="underline hover:text-foreground"
            >matching resistance roll</a
          >. Buff removal requires a successful landing.
        </p>
        <p class="text-sm text-muted-foreground mb-2">
          <span class="block"
            ><strong>2. Removal:</strong> if Dispel lands on a player, it removes
            eligible targeted and area buffs except Rest.</span
          >
          <span class="block"
            >On pets, it removes eligible targeted and area buffs, including
            Rest.</span
          >
          <span class="block"
            >A monster's targeted and area buffs each use their own removal
            roll:</span
          >
        </p>
        <Calculation calculation={dispelCalculation} />
        <p class="text-sm text-muted-foreground mt-2">
          A single-target scroll uses its cast rank from <a
            href="/professions/scroll_mastery"
            class="underline hover:text-foreground">Scroll Mastery</a
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
              class="underline hover:text-foreground">Divine Shield</a
            >
            and
            <a
              href="/skills/shield_of_faith"
              class="underline hover:text-foreground">Shield of Faith</a
            > replace each other because they share a group.</span
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
