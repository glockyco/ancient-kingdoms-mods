<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import * as Card from "$lib/components/ui/card";
  import Seo from "$lib/components/Seo.svelte";
  import type { DamageFormulaKind, HealBonusKind } from "$lib/types/skills";

  // ---------------------------------------------------------------------------
  // Static formula metadata
  // ---------------------------------------------------------------------------

  // Every section on the page, in document order. Drives the jump list. The
  // ids match each Card.Root below.
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

  const DAMAGE_FORMULA_DESC: Record<DamageFormulaKind, string> = {
    normal: "STR × 1.0 + damage from all equipment",
    ranger_melee: "STR × 1.0 + equipment damage, excluding bow damage",
    rogue_melee:
      "STR × 1.0 + main-hand damage + ⌊off-hand damage × 0.5⌋ + other equipment damage",
    rogue_melee_merc:
      "STR × 1.0 + full main-hand and off-hand damage + other equipment damage",
    ranged_player:
      "STR × 1.0 + bow and armor damage + DEX × 1.5, excluding melee weapon damage",
    ranged_player_frontal:
      "STR × 1.0 + DEX × 1.5 + all equipment damage, including melee weapons",
    ranged_merc:
      "STR × 1.0 + DEX × 1.5 + bow, melee weapon, and other equipment damage",
    poison_rogue:
      "STR × 1.0 + main-hand damage + ⌊off-hand damage × 0.5⌋ + other equipment damage + DEX × 2.5",
    magic_spell:
      "INT × 1.5 + magic damage from casting weapon and other equipment",
    // Source: BardFinalCadenceSkill.cs:45-54 and Charisma.cs:21-36.
    bard_final_cadence:
      "round(base skill damage × (1 + min(max(CHA, 0) × 0.001, 2)))",
    magic_weapon:
      "INT × 1.5 + STR × 1.0 + equipment damage. Physical and magic portions are reduced separately",
    magic_weapon_ranger:
      "Magic: INT × 1.5 + magic equipment. Physical: STR × 1.0 + non-bow equipment damage. Wild Strike instead uses its empowered auto-attack rule below.",
    manaburn: "Current Rage or Mana × 2 (ignores mitigation and resistance)",
    monster_melee: "Physical damage based on monster level",
    monster_magic: "Magic damage based on monster level",
  };

  const DAMAGE_FORMULA_GROUP_LABEL: Record<DamageFormulaKind, string> = {
    normal: "Physical",
    ranger_melee: "Physical",
    rogue_melee: "Physical",
    rogue_melee_merc: "Physical",
    ranged_player: "Ranged",
    ranged_player_frontal: "Ranged",
    ranged_merc: "Ranged",
    poison_rogue: "Poison",
    magic_spell: "Magic",
    bard_final_cadence: "Magic",
    magic_weapon: "Magic",
    magic_weapon_ranger: "Magic",
    manaburn: "Special",
    monster_melee: "Monster",
    monster_magic: "Monster",
  };

  const DAMAGE_FORMULA_LABEL: Record<DamageFormulaKind, string> = {
    normal: "Other physical attacks",
    ranger_melee: "Ranger melee",
    rogue_melee: "Rogue melee",
    rogue_melee_merc: "Rogue mercenary melee",
    ranged_player: "Player bow attacks",
    ranged_player_frontal: "Ranger bow attacks in front",
    ranged_merc: "Mercenary bow attacks",
    poison_rogue: "Rogue poison attacks",
    magic_spell: "Magic spells",
    bard_final_cadence: "Final Cadence",
    magic_weapon: "Magic weapon attacks",
    magic_weapon_ranger: "Ranger magic weapon attacks",
    manaburn: "Manaburn",
    monster_melee: "Monster physical attacks",
    monster_magic: "Monster magic attacks",
  };

  const DAMAGE_FORMULA_ORDER: DamageFormulaKind[] = [
    "normal",
    "ranger_melee",
    "rogue_melee",
    "rogue_melee_merc",
    "ranged_player",
    "ranged_player_frontal",
    "ranged_merc",
    "poison_rogue",
    "magic_spell",
    "bard_final_cadence",
    "magic_weapon",
    "magic_weapon_ranger",
    "manaburn",
    "monster_melee",
    "monster_magic",
  ];

  const HEAL_BONUS_DESC: Record<HealBonusKind, string> = {
    player_ranger: "Base heal + round(base heal × min(WIS × 3 × 0.004, 5))",
    player_other: "Base heal + round(base heal × min(WIS × 0.004, 5))",
    merc: "Base heal + round(base heal × min(WIS × 0.004, 5)). Ranger mercenaries do not get the 3× bonus",
    none: "No Wisdom bonus",
  };

  const HEAL_BONUS_LABEL: Record<HealBonusKind, string> = {
    player_ranger: "Player Ranger",
    player_other: "Other players",
    merc: "Mercenaries",
    none: "Monsters, NPCs, and other pets",
  };
  const HEAL_BONUS_KINDS = Object.keys(HEAL_BONUS_DESC) as HealBonusKind[];
</script>

<Seo
  title="Combat Mechanics - Ancient Kingdoms"
  description="How damage, armor and resistance, healing, haste, and buff and debuff scaling work in Ancient Kingdoms combat."
  path="/mechanics/combat"
/>

<div class="container mx-auto p-8 space-y-8 max-w-4xl">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics", href: "/mechanics" },
      { label: "Combat" },
    ]}
  />

  <h1 class="text-4xl font-bold">Combat Mechanics</h1>

  <PageSections sections={SECTIONS} />

  <div class="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm">
    For per-weapon and per-class auto-attack damage estimates, see the
    <a href="/tools/combat-simulator" class="underline hover:text-foreground"
      >Auto-Attack DPS Simulator</a
    >.
  </div>

  <!-- Source: server-scripts/Player.cs:4315-4325; PlayerSkills.cs:439-473 — players attack living monsters or NPCs, exclude charmed monsters, and choose the closest attackable monster within 10 units when a targeted attack lacks a valid target. -->
  <Card.Root id="targeting" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Targets, Range and Casting</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <p>
        <span class="block"
          >Players can attack living monsters and NPCs, but not other players or
          Bard-charmed monsters.</span
        >
        <span class="block"
          >A targeted attack without a valid target selects the nearest
          non-hidden, attackable monster within 10 units if one exists.</span
        >
      </p>
      <!-- Source: server-scripts/TargetHealSkill.cs:17-80,83-135; PlayerSkills.cs:414-437 — heal targets depend on canHealSelf/canHealOthers; a selected monster can redirect a heal to its player or pet target; resurrection requires remains or a dead mercenary. -->
      <p>
        <span class="block"
          >A targeted heal can reach yourself, another player, or a pet when the
          skill permits it.</span
        >
        <span class="block"
          >Selecting a monster can instead heal the player or pet it is
          attacking.</span
        >
        <span class="block"
          >Heals that target only yourself cannot heal another character.</span
        >
        <span class="block"
          >Resurrection targets player remains or a dead mercenary, not a living
          ally.</span
        >
      </p>
      <!-- Source: server-scripts/PlayerSkills.cs:310-317,399-405,475-557 — fear and stun block normal skill use; learned status, readiness, resources, equipment, ammunition, range, and visibility are checked. -->
      <!-- Source: server-scripts/PlayerSkills.cs:506-537 — out-of-range and obscured targets can start navigation and queue the cast. -->
      <p>
        <span class="block">Fear and stun stop you from using skills.</span>
        <span class="block"
          >Casting also requires a learned, ready skill, enough Mana or Rage,
          suitable equipment, and ammunition for applicable projectiles.</span
        >
        <span class="block"
          >When a target is too far away or out of sight, your character can
          move closer before casting the queued skill.</span
        >
      </p>
      <!-- Source: server-scripts/PlayerSkills.cs:620-679,825-854 — Bard song use and repetition continue while moving or casting ordinary skills. -->
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

  <!-- ── §1 Damage Pipeline ─────────────────────────────────────────────── -->
  <Card.Root id="damage-pipeline" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Damage Pipeline</Card.Title>
      <Card.Description
        >Damaging hits follow these steps, except Manaburn, which skips
        mitigation and critical hit checks.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-4">
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-2 pr-4 font-medium w-8">Step</th>
              <th class="text-left py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-4 text-muted-foreground">1</td>
              <td class="py-2"
                ><strong>Base damage</strong>: depends on the attack (see Damage
                Formulas below)</td
              >
            </tr>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-4 text-muted-foreground">2</td>
              <td class="py-2"><strong>Variance</strong>: random ×0.9–1.1</td>
            </tr>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-4 text-muted-foreground">3</td>
              <td class="py-2"
                ><strong>Backstab</strong>: +10% (+25% with Improved Backstab)
                plus 1 flat, when the attacker is behind the target</td
              >
            </tr>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-4 text-muted-foreground">4</td>
              <td class="py-2"
                ><strong>Level difference</strong>: ±2% per level, max ±20%</td
              >
            </tr>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-4 text-muted-foreground">5</td>
              <td class="py-2"
                ><strong>Slayer reduction</strong>: −(Slayer level × 10%)</td
              >
            </tr>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-4 text-muted-foreground">6</td>
              <td class="py-2"
                ><strong>Enrage</strong>: monsters with an enrage passive deal
                50–75% more damage below 10% health on non-spell attacks</td
              >
            </tr>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-4 text-muted-foreground">7</td>
              <td class="py-2">
                <strong>Physical mitigation</strong>:
                <code class="font-mono text-xs bg-muted px-1 rounded"
                  >damage − ⌈damage × clamp(defense × 0.0005, 0, 0.9)⌉</code
                > (max 90%)
              </td>
            </tr>
            <tr>
              <td class="py-2 pr-4 text-muted-foreground">8</td>
              <td class="py-2"
                ><strong>Critical hit</strong>: attacker Critical Chance + skill
                critical bonus determines the chance. A critical hit deals ×1.5
                damage (Radiant Aether: ×3). Target Critical Resist reduces only
                the extra damage: multiplier = 1 + (critical multiplier − 1) ×
                (1 − Critical Resist). At full Critical Resist, the hit deals
                the same damage as a non-critical hit</td
              >
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-sm text-muted-foreground">
        <strong>Manaburn exception:</strong> ignores physical mitigation and critical
        hits. Damage = current Rage or Mana × 2.
      </p>
    </Card.Content>
  </Card.Root>

  <!-- ── §2 Damage Formulas ─────────────────────────────────────────────── -->
  <Card.Root id="damage-formulas" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Damage Formulas</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-6">
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
            {#each DAMAGE_FORMULA_ORDER as kind (kind)}
              <tr class="border-b border-border/40 hover:bg-muted/20">
                <td class="py-1 pr-4 text-muted-foreground text-sm"
                  >{DAMAGE_FORMULA_GROUP_LABEL[kind]}</td
                >
                <td class="py-1 pr-4 text-sm">{DAMAGE_FORMULA_LABEL[kind]}</td>
                <td class="py-1 text-sm text-muted-foreground"
                  >{DAMAGE_FORMULA_DESC[kind]}</td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- ── §3 Resistance & Mitigation ────────────────────────────────────── -->
  <Card.Root id="resistance" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Resistance &amp; Mitigation</Card.Title>
      <Card.Description
        >How Defense and resistance reduce physical, magic, fire, cold, poison,
        and disease damage.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-5">
      <div>
        <!-- Source: server-scripts/Combat.cs:1528-1531,1534-1537,1540-1543,1546-1549,1552-1555 GetProbResist* (formula), Combat.cs:632-639 (damage); TargetDebuffSkill.cs:105-143 / AreaDebuffSkill.cs:113-158 (debuff & dispel landing) -->
        <h3 class="font-semibold mb-1">Resist Roll</h3>
        <pre
          class="text-xs bg-muted px-3 py-2 rounded overflow-x-auto">resist chance = clamp(
  matching resistance × 0.0005
  + clamp((target level − attacker level) × 0.005, −0.1, 0.1)
  − attacker Accuracy
, 0, 0.9)</pre>
        <p class="text-sm text-muted-foreground mt-1">
          <span class="block"
            >Magic, fire, cold, poison, and disease hits have a resistance roll.</span
          >
          <span class="block"
            >When resistance succeeds, you take no damage from that hit.</span
          >
          <span class="block"
            >Physical hits instead check whether the target blocks or the
            attacker misses.</span
          >
          <span class="block"
            >The matching resistance also decides whether debuffs and dispels
            land.</span
          >
          <span class="block">Physical debuffs check Defense.</span>
          <span class="block"
            >Attacker Accuracy lowers that resistance chance.</span
          >
        </p>
      </div>

      <div>
        <h3 class="font-semibold mb-2">Mitigation</h3>
        <pre
          class="text-xs bg-muted px-3 py-2 rounded overflow-x-auto">damage prevented = ⌈damage × clamp(matching stat × 0.0005, 0, 0.9)⌉
damage taken = damage − damage prevented</pre>
        <p class="text-sm text-muted-foreground mt-1">
          <span class="block"
            >When a hit lands, the matching stat reduces its damage by up to
            90%.</span
          >
          <span class="block"
            >You take the damage left after the reduction.</span
          >
          <span class="block"
            >The table shows which stat reduces each damage type.</span
          >
        </p>
        <div class="overflow-x-auto mt-2">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left py-1 pr-4 font-medium">Damage type</th>
                <th class="text-left py-1 font-medium">Mitigation stat</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4">Physical</td>
                <td class="py-1 text-muted-foreground">Defense</td>
              </tr>
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4">Magic</td>
                <td class="py-1 text-muted-foreground">Magic Resist</td>
              </tr>
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4">Fire</td>
                <td class="py-1 text-muted-foreground">Fire Resist</td>
              </tr>
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4">Cold</td>
                <td class="py-1 text-muted-foreground">Cold Resist</td>
              </tr>
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4">Disease</td>
                <td class="py-1 text-muted-foreground">Disease Resist</td>
              </tr>
              <tr>
                <td class="py-1 pr-4">Poison</td>
                <td class="py-1 text-muted-foreground">Poison Resist</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 class="font-semibold mb-1">Physical Block / Miss</h3>
        <pre
          class="text-xs bg-muted px-3 py-2 rounded overflow-x-auto">miss or block chance = clamp(
  clamp(base block chance + Defense × 0.0001 + block bonuses, 0, 0.8)
  + clamp((target level − attacker level) × 0.005, −0.1, 0.1)
  − attacker Accuracy
, 0, 0.9)</pre>
        <p class="text-sm text-muted-foreground mt-1">
          A blocked or missed physical hit deals no damage.
        </p>
      </div>

      <div>
        <h3 class="font-semibold mb-2">Situational Modifiers</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left py-1 pr-4 font-medium">Modifier</th>
                <th class="text-left py-1 font-medium">Effect</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4">Moving target</td>
                <td class="py-1 text-muted-foreground"
                  >Resist chance −0.25, damage +10%</td
                >
              </tr>
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4">Backstab</td>
                <td class="py-1 text-muted-foreground">Resist chance ×0.8</td>
              </tr>
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4">Manaburn</td>
                <td class="py-1 text-muted-foreground"
                  >Bypasses all mitigation and resist</td
                >
              </tr>
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4">Resistance-reducing skill</td>
                <td class="py-1 text-muted-foreground"
                  >Target resistance chance −30 percentage points</td
                >
              </tr>
              <tr>
                <td class="py-1 pr-4">Boss/elite + large speed debuff</td>
                <td class="py-1 text-muted-foreground"
                  >Forced resist regardless of roll</td
                >
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Source: server-scripts/Combat.cs:671-690,774-779 — targeted damage and projectile skills gain advantage when both look directions match; resist chance is multiplied by 0.8, and damage gains 10% rounded up plus 1. -->
  <Card.Root id="combat-advantage" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Combat Advantage</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm text-muted-foreground">
      <p>
        <span class="block"
          >Targeted strikes and projectiles gain combat advantage when attacker
          and target face the same direction.</span
        >
        <span class="block"
          >The target's chance to avoid the hit falls by 20% of its current
          chance.</span
        >
        <span class="block">The hit gains 10% damage, rounded up, plus 1.</span>
      </p>
      <!-- Source: server-scripts/Combat.cs:774-779 — Rogues with learned skill index 15 and Rogue mercenaries receive 25% rather than 10% damage, rounded up, plus 1. -->
      <p>
        <span class="block"
          >A Rogue with <a
            href="/skills/improved_backstab"
            class="text-blue-600 hover:underline dark:text-blue-400"
            >Improved Backstab</a
          > gains 25% damage, rounded up, plus 1 instead.</span
        >
        <span class="block">Rogue mercenaries receive the same bonus.</span>
      </p>
      <!-- Source: server-scripts/Combat.cs:687-696 — a moving player has 25 percentage points subtracted from avoidance chance, takes truncated 10% additional pre-mitigation damage, and may receive extra stun chance from Normal hits by attackers above level 5. -->
      <p>
        <span class="block"
          >While you move, your chance to avoid a hit drops by 25 percentage
          points, to a minimum of zero.</span
        >
        <span class="block"
          >The incoming hit also gains 10% damage before mitigation, with the
          extra amount rounded down.</span
        >
        <span class="block"
          >Physical hits from attackers above level 5 gain 1–10 percentage
          points of stun chance and at least 0.5 seconds of stun duration.</span
        >
      </p>
      <!-- Source: server-scripts/Combat.cs:565-569 — a monster returning home evades damage. -->
      <p>
        <span class="block">A monster returning home evades incoming hits.</span
        >
        <span class="block"
          >See <MechanicsLink section="monster-spawns#leashing"
            >Leashing and Resets</MechanicsLink
          > for its reset rules.</span
        >
      </p>
      <p>
        See <a href="#damage-pipeline" class="underline hover:text-foreground"
          >Damage Pipeline</a
        >
        and
        <a href="#resistance" class="underline hover:text-foreground"
          >Resistance and Mitigation</a
        >
        for the rest of the hit calculation.
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
        <h3 class="font-semibold mb-2">WIS Heal Bonus</h3>
        <div class="space-y-3">
          <div>
            <p class="text-sm text-muted-foreground mb-1">
              All classes except Ranger:
            </p>
            <pre
              class="text-xs bg-muted px-3 py-2 rounded overflow-x-auto">finalHeal = baseHeal + round(baseHeal × min(WIS × 0.004, 5.0))</pre>
          </div>
          <div>
            <p class="text-sm text-muted-foreground mb-1">
              Ranger (all heals):
            </p>
            <pre
              class="text-xs bg-muted px-3 py-2 rounded overflow-x-auto">finalHeal = baseHeal + round(baseHeal × min(WIS×3 × 0.004, 5.0))</pre>
          </div>
        </div>
      </div>

      <div>
        <!-- Source: BuffSkill.cs:252-259, Skills.cs:1583-1602, and BardFinalCadenceSkill.cs:78-103 -->
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
            >Healing-over-time ticks can also crit for ×1.5.</span
          >
          <span class="block"
            >Their chance uses the caster's Critical Chance when the buff
            starts.</span
          >
        </p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-1 pr-4 font-medium">Healer</th>
              <th class="text-left py-1 font-medium">Formula Applied</th>
            </tr>
          </thead>
          <tbody>
            {#each HEAL_BONUS_KINDS as kind (kind)}
              <tr class="border-b border-border/40 hover:bg-muted/20">
                <td class="py-1 pr-4 text-sm">{HEAL_BONUS_LABEL[kind]}</td>
                <td class="py-1 text-muted-foreground"
                  >{HEAL_BONUS_DESC[kind]}</td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- ── §5 Buff Scaling ───────────────────────────────────────────────── -->
  <Card.Root id="buffs" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Buff Scaling</Card.Title>
      <Card.Description
        >How Charisma, Wisdom, and character level change buffs.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-5">
      <div>
        <!-- Source: server-scripts/Charisma.cs:21-36, Buff.cs:ScaleWithCharisma, and BuffSkill.cs:ScaleFearResistChanceBonus and ScaleHealingPerSecondBonus -->
        <h3 class="font-semibold mb-2">Bard Song Scaling</h3>
        <pre
          class="text-xs bg-muted px-3 py-2 rounded overflow-x-auto">songPower = 1 + min(max(CHA, 0) × 0.001, 2)
wholeNumberValue = round(baseValue × songPower)
percentageValue = baseValue × songPower</pre>
        <p class="text-sm text-muted-foreground mt-2">
          <span class="block"
            >Each Charisma point adds 0.1% of the base value.</span
          >
          <span class="block"
            >At 2,000 Charisma, the bonus reaches its 200% limit and the value
            triples.</span
          >
          <span class="block"
            >Songs can increase Ward, Defense, damage, resistance, resource
            recovery, Accuracy, Critical Chance, Haste, and Spell Haste.</span
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
            >Cacophony instead gains a rounded 0.75 damage per second for each
            non-negative Charisma point.</span
          >
        </p>
        <p class="text-sm text-muted-foreground mt-2">
          <span class="block"
            >Charisma does not increase a song's Movement Speed, primary
            attributes, maximum Mana percentage, Damage Shield, or Heal on Hit.</span
          >
          <span class="block"
            >Each song page shows the formulas for that song's effects.</span
          >
        </p>
      </div>

      <div>
        <h3 class="font-semibold mb-2">Wisdom Bonuses by Buff Effect</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left py-1 pr-4 font-medium">Buff Field</th>
                <th class="text-left py-1 font-medium">WIS Scaling</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Max Health</td><td
                  class="py-1 text-muted-foreground">base + WIS×2</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Defense</td><td
                  class="py-1 text-muted-foreground">base + WIS×0.15</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Magic Resist</td><td
                  class="py-1 text-muted-foreground">base + WIS×0.15</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Ward</td><td
                  class="py-1 text-muted-foreground">base + WIS×2</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Damage Shield</td><td
                  class="py-1 text-muted-foreground">base + WIS×0.75</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Elemental Resists</td><td
                  class="py-1 text-muted-foreground">base + WIS×0.15 each</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Heal-over-Time (&lt;60s)</td><td
                  class="py-1 text-muted-foreground"
                  >base × (1 + min(WIS×0.004, 5.0))</td
                ></tr
              >
              <tr
                ><td class="py-1 pr-4">Heal-over-Time (60s+)</td><td
                  class="py-1 text-muted-foreground">base + WIS×0.3</td
                ></tr
              >
            </tbody>
          </table>
        </div>
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
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4 text-sm">Other players</td><td
                  class="py-1 text-muted-foreground"
                  >Targeted and area buffs use Wisdom</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4 text-sm">Player Rangers</td><td
                  class="py-1 text-muted-foreground"
                  >Targeted buffs use triple Wisdom. Area buffs use Wisdom</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4 text-sm">Area buffs on mercenaries</td><td
                  class="py-1 text-muted-foreground"
                  >Use round((Wisdom + Constitution) / 2)</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4 text-sm">Leadership</td><td
                  class="py-1 text-muted-foreground"
                  >Uses round((Wisdom + Constitution + Charisma) / 2)</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4 text-sm">Mercenary buffs</td><td
                  class="py-1 text-muted-foreground">Use Wisdom</td
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

  <!-- Source: server-scripts/Buff.cs:9-25; Skills.cs:1178-1197 — effects have a timed end, a same-name effect replaces the old instance, and effects in a shared overwrite category expire when a new one arrives. -->
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
        <span class="block"
          >Applying an effect replaces other effects in the same overwrite
          group.</span
        >
      </p>
      <!-- Source: server-scripts/Monster.cs:1560-1564 — a heavy slow resets monster movement. -->
      <!-- Source: server-scripts/PlayerSkills.cs:310-317 — FEAR and STUNNED states block skill use. -->
      <!-- Source: server-scripts/Skills.cs:1547-1563 — BreakMezz ends mesmerize buffs. -->
      <!-- Source: server-scripts/Combat.cs:760-762 — damage calls BreakMezz. -->
      <!-- Source: server-scripts/Skills.cs:233-238 — a damage-over-time recovery tick calls BreakMezz. -->
      <p>
        <span class="block"
          >Root stops movement but does not end on damage.</span
        >
        <span class="block">Stun prevents skill use.</span>
        <span class="block"
          >Direct damage or a damage-over-time tick ends Sleep.</span
        >
        <span class="block"
          >See <a href="#special" class="underline hover:text-foreground"
            >Special Mechanics</a
          > for the control rules.</span
        >
      </p>
      <!-- Source: server-scripts/Skills.cs:1832-1879 — ApplyWardToDoTDamage takes tick damage from the ward pool and passes the excess. -->
      <!-- Source: server-scripts/Combat.cs:908-950 — damageShield buffs deal damage back to the attacker. -->
      <p>
        <span class="block"
          >A ward absorbs damage-over-time ticks until its pool runs out.</span
        >
        <span class="block"
          >Any damage beyond the remaining ward reduces health.</span
        >
        <span class="block"
          >A damage shield deals damage back to attackers instead of adding
          health.</span
        >
        <span class="block"
          >See <a href="#special" class="underline hover:text-foreground"
            >Ward and Mana Shield Priority</a
          > for direct hits.</span
        >
      </p>
      <!-- Source: server-scripts/TargetBuffSkill.cs:318-331; BuffSkill.cs:43-54 — cleansing removes only debuffs whose elements match the spell; the exported Cleric Cleanse skill enables poison and disease. -->
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
        <!-- Source: server-scripts/Buff.cs:ScaleWithCharisma, BuffSkill.cs:ScaleHealingPerSecondBonus, and Charisma.cs:21-36 -->
        <h3 class="font-semibold mb-1">Bard Debuff Songs</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >Charisma multiplies the whole-number and percentage effects of Bard
            debuff songs by Song Power.</span
          >
          <span class="block"
            >Cacophony instead gains a rounded 0.75 damage per non-negative
            Charisma point.</span
          >
          <span class="block"
            >Strength, Dexterity, and Intelligence do not improve Bard debuff
            songs.</span
          >
          <span class="block"
            >Charisma does not increase Song of Varensea's Movement Speed
            reduction.</span
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
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4"
                  >Melee debuffs (reduce physical defense)</td
                >
                <td class="py-1 text-muted-foreground">STR</td>
              </tr>
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4">Poison and disease debuffs</td>
                <td class="py-1 text-muted-foreground">DEX</td>
              </tr>
              <tr>
                <td class="py-1 pr-4"
                  >All other debuffs (magic, fire, cold, untagged)</td
                >
                <td class="py-1 text-muted-foreground">INT</td>
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
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Defense reduction</td><td
                  class="py-1 text-muted-foreground"
                  >−STR×0.5 (melee-type debuffs) or −INT×0.4 (all others)</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Magic Resist reduction</td><td
                  class="py-1 text-muted-foreground">−INT×0.4</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Fire Resist reduction</td><td
                  class="py-1 text-muted-foreground">−INT×0.4</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Cold Resist reduction</td><td
                  class="py-1 text-muted-foreground">−INT×0.4</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Disease Resist reduction</td><td
                  class="py-1 text-muted-foreground">−INT×0.4</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Poison Resist reduction</td><td
                  class="py-1 text-muted-foreground">−INT×0.4</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Damage reduction</td><td
                  class="py-1 text-muted-foreground">−INT×0.5</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Magic Damage reduction</td><td
                  class="py-1 text-muted-foreground">−INT×0.5</td
                ></tr
              >
              <!-- Source: server-scripts/Skills.cs:1609-1625 — poison and disease debuffs add RoundToInt(bonusAttribute * 1.5) before resistance. -->
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Poison/disease damage over time</td><td
                  class="py-1 text-muted-foreground"
                  >+DEX×1.5, then reduced by Poison Resist</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Physical damage over time</td><td
                  class="py-1 text-muted-foreground"
                  >+STR×0.5, reduced by defense mitigation</td
                ></tr
              >
              <tr
                ><td class="py-1 pr-4">Fire/cold/magic damage over time</td><td
                  class="py-1 text-muted-foreground"
                  >+INT×1.25, reduced by the matching resist</td
                ></tr
              >
            </tbody>
          </table>
        </div>
        <p class="text-sm text-muted-foreground mt-2">
          <span class="block"
            >Poison and disease damage-over-time effects add round(DEX × 1.5) to
            each damage tick.</span
          >
          <span class="block"
            >Poison Resist reduces both types, while Disease Resist does not
            reduce these ticks.</span
          >
          <span class="block"
            >Debuff layers, critical hits, and wards then change the damage.</span
          >
        </p>
        <p class="text-sm text-muted-foreground mt-2">
          <span class="block"
            ><strong>Damage after cleansing:</strong> with 3 debuff layers, each tick
            deals full damage.</span
          >
          <span class="block"
            >At 2 layers it deals 85%, and at 1 layer it deals 70%.</span
          >
        </p>
        <p class="text-sm text-muted-foreground mt-2">
          <span class="block"
            ><strong>Critical damage-over-time:</strong> a critical tick deals ×1.5
            damage.</span
          >
          <span class="block"
            >The chance uses the caster's Critical Chance when the debuff
            starts.</span
          >
          <span class="block"
            >Target Critical Resist reduces the extra damage.</span
          >
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
      <!-- Interval formulas -->
      <!-- Sources: Player.cs:2783, Skills.cs:673-675, Skills.cs:765-768, Skills.cs:814-815, Combat.cs:314-324, Monster.cs:2553, Npc.cs:625 -->
      <div>
        <h3 class="font-semibold mb-2">Interval Formulas</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left py-1 pr-4 font-medium">Attack</th>
                <th class="text-left py-1 pr-4 font-medium">Attacker</th>
                <th class="text-left py-1 font-medium">Interval</th>
              </tr>
            </thead>
            <tbody>
              <!-- Source: server-scripts/Player.cs:GetSkillRefractoryPeriod and 3190-3192 -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 text-sm">Auto attack</td>
                <td class="py-2 pr-4 text-muted-foreground text-sm">Player</td>
                <td class="py-2 font-mono text-sm"
                  >cast time + clamp(weapon delay × (1 − haste) / 25, 0.25, 2.0)</td
                >
              </tr>
              <!-- Source: server-scripts/Skills.cs:902-904 — castTimeEnd -= spellHasteBonus × castTime -->
              <!-- Source: server-scripts/Combat.cs:346-358 — Mathf.Clamp(spellHaste, -0.5f, 0.5f) -->
              <!-- Source: server-scripts/Player.cs:refractoryPeriodSkill — refractoryPeriodSkill = 0.75f (post-cast refractory, blocks next cast) -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 text-sm">Spell auto attack</td>
                <td class="py-2 pr-4 text-muted-foreground text-sm">Player</td>
                <td class="py-2 font-mono text-sm"
                  >cast time × (1 − spell haste) + 0.75 s</td
                >
              </tr>
              <!-- Source: server-scripts/Skills.cs:1009-1012 -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 text-sm">Attack</td>
                <td class="py-2 pr-4 text-muted-foreground text-sm"
                  >Companions and familiars</td
                >
                <td class="py-2 font-mono text-sm">cast time + cooldown</td>
              </tr>
              <!-- Source: server-scripts/Skills.cs:888-891 -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 text-sm">Auto attack</td>
                <td class="py-2 pr-4 text-muted-foreground text-sm"
                  >Mercenaries</td
                >
                <td class="py-2 font-mono text-sm"
                  >cast time + cooldown × (1 − haste)</td
                >
              </tr>
              <!-- Source: server-scripts/Skills.cs:888-891 -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 text-sm">Spell</td>
                <td class="py-2 pr-4 text-muted-foreground text-sm"
                  >Mercenaries</td
                >
                <td class="py-2 font-mono text-sm"
                  >cast time × (1 − spell haste) + cooldown</td
                >
              </tr>
              <!-- Source: server-scripts/Skills.cs:914-915 -->
              <tr>
                <td class="py-2 pr-4 text-sm">All attacks</td>
                <td class="py-2 pr-4 text-muted-foreground text-sm"
                  >Monsters and NPCs</td
                >
                <td class="py-2 font-mono text-sm"
                  >Non-spell: cast time + cooldown × (1 − haste)<br />Spell:
                  cast time + cooldown</td
                >
              </tr>
            </tbody>
          </table>
        </div>
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
              <!-- Source: server-scripts/Combat.cs:337-343 — Mathf.Clamp(num, -0.8f, 0.8f) -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 text-sm">Player auto attack</td>
                <td class="py-2 pr-4 text-muted-foreground text-sm"
                  >Reduces delay (minimum 0.25 s, maximum 2.0 s, haste limit
                  80%).</td
                >
                <td class="py-2 text-muted-foreground text-sm">No effect</td>
              </tr>
              <!-- Source: server-scripts/Skills.cs:902-904, server-scripts/Combat.cs:346-358 -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 text-sm">Player spell auto attack</td>
                <td class="py-2 pr-4 text-muted-foreground text-sm"
                  >No effect</td
                >
                <td class="py-2 text-muted-foreground text-sm"
                  >Reduces cast time by up to 50%. The 0.75 s wait afterward
                  stays unchanged.</td
                >
              </tr>
              <!-- Source: server-scripts/Pet.cs -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 text-sm">Companion or familiar</td>
                <td class="py-2 pr-4 text-muted-foreground text-sm"
                  >No effect</td
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
              <!-- Source: server-scripts/Combat.cs:346-358 -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 text-sm">Mercenary spell</td>
                <td class="py-2 pr-4 text-muted-foreground text-sm"
                  >No effect</td
                >
                <td class="py-2 text-muted-foreground text-sm"
                  >Reduces cast time by up to 50%. Cooldown stays unchanged.</td
                >
              </tr>
              <tr>
                <td class="py-2 pr-4 text-sm">Monster or NPC</td>
                <td class="py-2 pr-4 text-muted-foreground text-sm"
                  >Reduces cooldown for non-spell attacks, but not for spells</td
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
        <pre
          class="text-xs bg-muted px-3 py-2 rounded overflow-x-auto">threat gained = skill threat + (attacker maximum health if skill threat > 0)
       + damage dealt
       + round(stun chance × stun duration × 10)
       + round(fear chance × fear duration × 10)</pre>
        <p class="text-sm text-muted-foreground mt-1">
          Monsters gain at most their target's current health as threat from one
          attack.
        </p>
      </div>
      <div>
        <!-- Source: server-scripts/DamageSkill.cs:49-67 — TryConsumeWildStrike checks the active Ranger follow-up buff, rounds ×(1 + 0.1 × buff level), sets DamageType.Magic, and selects WildStrikeTargetEffect. -->
        <!-- Source: server-scripts/TargetDamageSkill.cs:239,282 — Apply consumes the override for a sword follow-up and passes it to DealDamageAt. -->
        <!-- Source: server-scripts/TargetProjectileSkill.cs:221-222,252-256 — Apply consumes the override for a bow follow-up and passes it to the projectile effect. -->
        <!-- Source: server-scripts/Combat.cs:368,774,840-847,944-955 — DealDamageAt runs the common pipeline, mitigates Magic once, and instantiates the override effect. -->
        <h3 id="wild-strike" class="font-semibold mb-1 scroll-mt-24">
          Wild Strike
        </h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >Wild Strike empowers the Ranger's next sword or bow auto attack.</span
          >
          <span class="block"
            >Add Wild Strike's damage to that attack, multiply by (1 + 0.1 ×
            Wild Strike's level), and round the total.</span
          >
          <span class="block"
            >The whole hit deals magic damage, which Magic Resist can block or
            reduce.</span
          >
        </p>
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
        <ul class="ml-4 list-disc text-sm text-muted-foreground">
          <li>
            An auto attack that deals damage grants ⌊min(damage, target health
            before the hit) × 0.25⌋ Rage.
          </li>
          <li>
            Taking physical damage from a single-target skill grants
            ⌊clamp(√damage × 0.35, 1, 25)⌋ Rage. Warrior and Rogue mercenaries
            use the same rule for those hits.
          </li>
        </ul>
      </div>

      <div>
        <!-- Source: server-scripts/Combat.cs:847-884 — DealDamageAt stun branch -->
        <h3 class="font-semibold mb-1">Stun</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >A hit stuns its target if the skill's stun chance roll succeeds.</span
          >
          <span class="block"
            >Stun cannot affect a target that is already feared.</span
          >
          <span class="block"
            >Another stun extends the existing stun instead of replacing it.</span
          >
          <span class="block">Bear mounts resist 90% of stuns.</span>
          <span class="block">A stun dismounts a player.</span>
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/Combat.cs:86 (knockbackTime = 0.25f), 88 (knockbackObstacleDamageBonus = 0.0125f), 1348-1369 -->
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
            >If an obstacle blocks the path, the target takes at least 1 extra
            damage, or 1.25% of the hit's damage rounded up.</span
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
            >Ward also absorbs damage-over-time ticks before they reduce health.</span
          >
          <span class="block"
            >Wisdom adds 2 points to a ward's capacity per point.</span
          >
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/Combat.cs:276-288 (fearResistChance), 885-910 (DealDamageAt fear branch) -->
        <h3 class="font-semibold mb-1">Fear</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >Fear applies when the skill's fear chance succeeds and the target
            fails a separate fear resistance roll.</span
          >
          <span class="block"
            >Fear lasts for a random duration between half and all of the
            skill's listed fear duration.</span
          >
          <span class="block"
            >Equipment and skills add fear resistance, up to 100%.</span
          >
          <span class="block">At 100%, the target is immune to fear.</span>
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
          <span class="block">Damage does not break Root.</span>
          <span class="block"
            >Every 2 seconds, a rooted monster has a Magic Resist / 1,000 chance
            to break free, limited to 5–95%.</span
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
        <!-- Source: server-scripts/Skills.cs:1547-1552 (BreakMezz — entity.speed <= -50f) -->
        <!-- Source: server-scripts/Combat.cs:DealDamageAt (damage > 0 calls BreakMezz) -->
        <!-- Source: server-scripts/Skills.cs:233-236 (DoT tick also calls BreakMezz) -->
        <!-- Source: server-scripts/Monster.cs:1546-1560 (monster self-break: magic resist roll every 6s) -->
        <!-- Source: server-scripts/TargetDebuffSkill.cs:141 (boss/elite auto-resist speedBonus < -10) -->
        <h3 class="font-semibold mb-1">Sleep</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >A debuff that reduces movement speed to −50 or below causes Sleep.</span
          >
          <span class="block"
            >A direct hit or damage-over-time tick immediately ends Sleep.</span
          >
          <span class="block"
            >Bosses and elite monsters automatically resist debuffs that reduce
            movement speed below −10.</span
          >
          <span class="block"
            >Every 6 seconds, a sleeping monster has a Magic Resist / 1,000
            chance to wake, limited to 5–95%.</span
          >
        </p>
      </div>

      <div>
        <h3 class="font-semibold mb-1">Enrage</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >Below 10% health, a monster with the Enrage passive deals 50–75%
            more damage with non-spell skills.</span
          >
          <span class="block">The bonus is rolled separately for each hit.</span
          >
          <span class="block"
            >The Warrior skill Enrage is a different effect that changes damage
            and maximum health as shown on its skill page.</span
          >
          <!-- Source: server-scripts/Combat.cs:770-803 — only Monster and Npc skill lists are scanned for PassiveSkill.isEnrage; threshold health/max < 0.1f -->
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/Combat.cs:1106-1119, 1556-1566; Player.cs:12047-12051 -->
        <h3 id="parry" class="font-semibold mb-1 scroll-mt-24">Parry</h3>
        <p class="text-sm text-muted-foreground">
          <span class="block"
            >A Warrior or Ranger can cast Parry while targeting the attacker.</span
          >
          <span class="block"
            >During the cast, Parry blocks a single-target physical melee hit
            from that attacker.</span
          >
          <span class="block"
            >The counterattack deals half of the health damage the hit would
            have dealt after mitigation, Ward, and Mana Shield.</span
          >
          <span class="block"
            >That amount is rounded and limited to 1–5,000 damage.</span
          >
          <span class="block"
            >A fully absorbed hit does not trigger the counterattack.</span
          >
        </p>
      </div>

      <div>
        <h3 class="font-semibold mb-1">Assassination</h3>
        <p class="text-sm text-muted-foreground">
          Assassination skills require the target to be below 25% health.
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/TargetDamageSkill.cs — slot 13 fires at procEffectProbability * 0.5f; durability > 0 guard on both slots -->
        <!-- Source: server-scripts/Combat.cs:1235 — proc weapons and scrolls are excluded from the damage-shield trigger. -->
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
          <span class="block"
            >Weapon on-hit effects do not trigger damage shields.</span
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
        <!-- Source: server-scripts/Buff.cs:19 (3 counters); RelicItem.cs:20-35 (finite-charge item gate); BuffSkill.cs:470-492 (GetCleanseCountersRemoved); TargetBuffSkill.cs:134-158 (HasMatchingCleanseDebuff), 236-458 (Apply cleanse branch); AreaBuffSkill.cs:184,262 (area cleanse counter rolls); Skills.cs:1611-1616 (DoT per-counter scaling) -->
        <h3 id="cleanse" class="font-semibold mb-1 scroll-mt-24">Cleanse</h3>
        <p class="text-sm text-muted-foreground mb-2">
          <span class="block"
            >Cleanse is cast on yourself or an ally and removes harmful debuffs.</span
          >
          <span class="block"
            >Cleanse does not have a resistance roll when it lands.</span
          >
          <span class="block"
            >Each debuff's Cleanse Resist determines how many layers a cast
            removes.</span
          >
          <span class="block"
            >At 100% Cleanse Resist, Cleanse removes none.</span
          >
          <span class="block"
            >Cleanse removes debuffs only of its listed elements.</span
          >
          <span class="block"
            >A fire-and-cold cleanse cannot remove poison, disease, or magic
            debuffs.</span
          >
        </p>
        <p class="text-sm text-muted-foreground mb-2">
          <span class="block"
            >An item with limited Cleanse uses cannot be used unless the target
            has a debuff it can remove.</span
          >
          <span class="block"
            >A Cleanse skill can still be cast with no matching debuff.</span
          >
        </p>
        <p class="text-sm text-muted-foreground mb-2">
          <span class="block"
            >Each debuff starts with three layers and disappears only after all
            three are removed.</span
          >
          <span class="block"
            >Cleanse Resist determines how many layers each cast removes:</span
          >
        </p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left py-1 pr-4 font-medium">Cleanse Resist</th>
                <th class="text-left py-1 font-medium">Result of one cast</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">0</td><td
                  class="py-1 text-muted-foreground"
                  >Removes all 3 layers in one cast</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Between 0 and 100%</td><td
                  class="py-1 text-muted-foreground"
                  >Removes 1 layer for certain, then tries twice more. Each
                  extra layer has a (100% &minus; Cleanse Resist) &times; (1 +
                  caster Accuracy) chance to come off. At 100% chance, all 3
                  layers come off at once</td
                ></tr
              >
              <tr
                ><td class="py-1 pr-4">100%</td><td
                  class="py-1 text-muted-foreground">Cannot be cleansed</td
                ></tr
              >
            </tbody>
          </table>
        </div>
        <p class="text-sm text-muted-foreground mt-2">
          <span class="block"
            >A debuff remains until a later Cleanse removes its last layer.</span
          >
          <span class="block"
            >Damage-over-time ticks deal 85% of full damage with 2 layers and
            70% with 1 layer.</span
          >
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/TargetDebuffSkill.cs:105-143 (resist gate), 173-205,209-234,238-250 (removal); AreaDebuffSkill.cs:113-158 (resist gate), 184-281 (removal); Combat.cs:1529-1556 GetProbResistMagic/Disease -->
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
          <span class="block"
            >The resistance roll and buff removal are separate steps.</span
          >
        </p>
        <p class="text-sm text-muted-foreground mb-2">
          <span class="block"
            ><strong>1. Resist:</strong> the target uses the resistance matching the
            dispel's element, adjusted for level difference and the caster's Accuracy.</span
          >
          <span class="block"
            >Higher caster Accuracy lowers the chance of resisting.</span
          >
          <span class="block"
            >If the target resists, Dispel removes no buffs.</span
          >
        </p>
        <p class="text-sm text-muted-foreground mb-2">
          <span class="block"
            ><strong>2. Removal:</strong> if Dispel lands on a player, it removes
            all buffs except Rest.</span
          >
          <span class="block"
            >If Dispel lands on a pet, it removes all buffs.</span
          >
          <span class="block"
            >For monsters, Dispel checks each buff separately.</span
          >
          <span class="block"
            >A monster loses a buff only if a random number from 0 to 1 exceeds
            its Dispel Resist minus the caster's reduction:</span
          >
        </p>
        <pre
          class="text-xs bg-muted px-3 py-2 rounded overflow-x-auto">Dispel Resist reduction
  single-target spell:   Accuracy × 0.5
  single-target scroll:  clamp(round(Mastery% ÷ 5), 1, 20) × 0.01
  area dispel:           0</pre>
        <p class="text-sm text-muted-foreground mt-2">
          <span class="block"
            >The caster lowers a monster buff's Dispel Resist with Accuracy when
            using a spell.</span
          >
          <span class="block"
            >A scroll instead uses the caster's
            <a
              href="/professions/scroll_mastery"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >Scroll Mastery</a
            >, lowering Dispel Resist by 1 percentage point per rank.</span
          >
        </p>
      </div>

      <!-- Source: server-scripts/Skills.cs:938-958 AddOrRefreshBuff -->
      <div>
        <h3 class="font-semibold mb-1">Buff &amp; Debuff Overwrite</h3>
        <p class="text-sm text-muted-foreground mb-2">
          <span class="block"
            >A newly applied buff replaces every existing buff in its overwrite
            group, regardless of level or strength.</span
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
