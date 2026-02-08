<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
</script>

<svelte:head>
  <title>Damage Mechanics | Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="Internal developer reference for combat damage mechanics in Ancient Kingdoms."
  />
</svelte:head>

<div class="container mx-auto p-8 space-y-8 max-w-5xl">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Docs" },
      { label: "Damage Mechanics" },
    ]}
  />

  <div class="space-y-2">
    <h1 class="text-4xl font-bold">Damage Mechanics</h1>
    <p class="text-muted-foreground">
      Internal developer reference. Documents how monster ability damage and hit
      chance are determined, based on the data we export from the game.
    </p>
    <p class="text-sm text-muted-foreground/70 italic">
      The actual combat resolution formulas live in the game's compiled IL2CPP
      code (not in this repo). This documents all the known <strong
        >inputs</strong
      > to that system.
    </p>
  </div>

  <!-- Table of Contents -->
  <nav class="rounded-lg border p-4 space-y-2">
    <h2 class="text-sm font-semibold uppercase text-muted-foreground">
      Contents
    </h2>
    <ol class="list-decimal list-inside space-y-1 text-sm">
      <li><a href="#stat-scaling" class="hover:underline">Stat Scaling</a></li>
      <li>
        <a href="#pre-mitigation-damage" class="hover:underline"
          >Pre-Mitigation Damage</a
        >
      </li>
      <li>
        <a href="#damage-type-routing" class="hover:underline"
          >Damage Type Routing</a
        >
      </li>
      <li><a href="#hit-check" class="hover:underline">Hit Check</a></li>
      <li>
        <a href="#critical-hits" class="hover:underline">Critical Hits</a>
      </li>
      <li>
        <a href="#player-defenses" class="hover:underline">Player Defenses</a>
      </li>
      <li>
        <a href="#buffs-debuffs" class="hover:underline">Buffs &amp; Debuffs</a>
      </li>
      <li>
        <a href="#side-effects" class="hover:underline"
          >Side Effects (CC &amp; Utility)</a
        >
      </li>
      <li>
        <a href="#skill-types" class="hover:underline">Skill Type Hierarchy</a>
      </li>
      <li>
        <a href="#monster-combat-flags" class="hover:underline"
          >Monster Combat Flags</a
        >
      </li>
      <li>
        <a href="#aoe-mechanics" class="hover:underline">AoE Mechanics</a>
      </li>
      <li>
        <a href="#source-reference" class="hover:underline"
          >Source Code Reference</a
        >
      </li>
    </ol>
  </nav>

  <!-- Section 1: Stat Scaling -->
  <section id="stat-scaling" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">1. Stat Scaling</h2>
    <p>
      All monster combat stats use the same linear scaling formula, defined as
      <code>LinearStatBonus</code>
      (int) or <code>LinearStatBonusFloat</code> (float) in
      <code>mods/DataExporter/Models/SkillData.cs:5-15</code>:
    </p>
    <div class="rounded-lg border bg-muted/30 p-4 font-mono text-sm">
      actual = base_value + bonus_per_level * (level - 1)
    </div>
    <p>
      This applies to all of the following monster stats, defined in
      <code>MonsterData.cs:55-80</code>:
    </p>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold">Stat</th>
            <th class="text-left py-2 pr-4 font-semibold">Type</th>
            <th class="text-left py-2 font-semibold">Fields</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4">Health</td>
            <td class="py-2 pr-4"><code>int</code></td>
            <td class="py-2"
              ><code>health_base</code>, <code>health_per_level</code>,
              <code>health_multiplier</code></td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4">Damage</td>
            <td class="py-2 pr-4"><code>int</code></td>
            <td class="py-2"
              ><code>damage_base</code>, <code>damage_per_level</code></td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4">Magic Damage (Spell Power)</td>
            <td class="py-2 pr-4"><code>int</code></td>
            <td class="py-2"
              ><code>magic_damage_base</code>,
              <code>magic_damage_per_level</code></td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4">Defense (AC)</td>
            <td class="py-2 pr-4"><code>int</code></td>
            <td class="py-2"
              ><code>defense_base</code>, <code>defense_per_level</code></td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4">Magic Resist</td>
            <td class="py-2 pr-4"><code>int</code></td>
            <td class="py-2"
              ><code>magic_resist_base</code>,
              <code>magic_resist_per_level</code></td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4">Poison Resist</td>
            <td class="py-2 pr-4"><code>int</code></td>
            <td class="py-2"
              ><code>poison_resist_base</code>,
              <code>poison_resist_per_level</code></td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4">Fire Resist</td>
            <td class="py-2 pr-4"><code>int</code></td>
            <td class="py-2"
              ><code>fire_resist_base</code>,
              <code>fire_resist_per_level</code></td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4">Cold Resist</td>
            <td class="py-2 pr-4"><code>int</code></td>
            <td class="py-2"
              ><code>cold_resist_base</code>,
              <code>cold_resist_per_level</code></td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4">Disease Resist</td>
            <td class="py-2 pr-4"><code>int</code></td>
            <td class="py-2"
              ><code>disease_resist_base</code>,
              <code>disease_resist_per_level</code></td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4">Block Chance</td>
            <td class="py-2 pr-4"><code>float</code></td>
            <td class="py-2"
              ><code>block_chance_base</code>,
              <code>block_chance_per_level</code></td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4">Critical Chance</td>
            <td class="py-2 pr-4"><code>float</code></td>
            <td class="py-2"
              ><code>critical_chance_base</code>,
              <code>critical_chance_per_level</code></td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4">Accuracy</td>
            <td class="py-2 pr-4"><code>float</code></td>
            <td class="py-2"
              ><code>accuracy_base</code>, <code>accuracy_per_level</code></td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4">Mana</td>
            <td class="py-2 pr-4"><code>int</code></td>
            <td class="py-2"
              ><code>mana_base</code>, <code>mana_per_level</code></td
            >
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-sm text-muted-foreground">
      Health has an additional <code>health_multiplier</code> (float) that is
      applied after the linear scaling. See
      <code>MonsterData.cs:58</code>.
    </p>
    <p class="text-sm text-muted-foreground">
      The website displays these scaling stats with a level slider at
      <code>website/src/routes/monsters/[id]/+page.svelte:88-168</code>.
    </p>
  </section>

  <!-- Section 2: Pre-Mitigation Damage -->
  <section id="pre-mitigation-damage" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">
      2. Pre-Mitigation Damage
    </h2>
    <p>
      When a monster uses a damage skill, the pre-mitigation damage is
      calculated by combining the monster's combat stat with the skill's flat
      damage, then optionally applying a percent multiplier. This logic is
      displayed in <code
        >website/src/routes/monsters/[id]/+page.svelte:311-343</code
      >:
    </p>
    <div class="rounded-lg border bg-muted/30 p-4 font-mono text-sm space-y-2">
      <p class="text-muted-foreground">
        // Which combat stat to use depends on damage_type (see next section)
      </p>
      <p>
        combatStat = monster.magic_damage &nbsp;&nbsp;// if Magic, Fire, Cold,
        Disease
      </p>
      <p>
        combatStat = monster.damage &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;// if
        Normal, Poison
      </p>
      <br />
      <p>totalDmg = combatStat + skill.damage</p>
      <br />
      <p class="text-muted-foreground">
        // damage_percent acts as a multiplier (e.g. 1.5 = 150%)
      </p>
      <p>
        if (damage_percent &gt; 0) totalDmg = round(totalDmg * damage_percent)
      </p>
    </div>
    <p>
      Skill damage also scales per level using the same
      <code>LinearStatBonus</code> pattern. Defined in
      <code>SkillData.cs:66-67</code>
      and extracted in <code>SkillExporter.cs:172-181</code>.
    </p>
    <p>
      Monsters can also have <strong>heal skills</strong> (<code>HealSkill</code
      >) that restore HP via <code>heals_health</code> (<code
        >SkillData.cs:86</code
      >) and mana via <code>heals_mana</code> (<code>SkillData.cs:87</code>).
      These use the same linear scaling and affect the effective damage output
      of a fight.
    </p>
  </section>

  <!-- Section 3: Damage Type Routing -->
  <section id="damage-type-routing" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">3. Damage Type Routing</h2>
    <p>
      The skill's <code>damage_type</code> field (<code>SkillData.cs:68</code>,
      exported from <code>DamageSkill.damageType</code> at
      <code>SkillExporter.cs:182</code>) determines two things:
    </p>
    <ol class="list-decimal list-inside space-y-1 ml-2">
      <li>
        Which <strong>monster combat stat</strong> feeds into the damage formula
      </li>
      <li>Which <strong>player resistance</strong> mitigates the damage</li>
    </ol>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold">Damage Type</th>
            <th class="text-left py-2 pr-4 font-semibold">Monster Stat Used</th>
            <th class="text-left py-2 font-semibold">Player Resistance</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4"><code>Normal</code></td>
            <td class="py-2 pr-4"><code>damage</code> (physical)</td>
            <td class="py-2"><code>defense</code> (AC)</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>Poison</code></td>
            <td class="py-2 pr-4"><code>damage</code> (physical)</td>
            <td class="py-2"><code>poison_resist</code></td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>Magic</code></td>
            <td class="py-2 pr-4"><code>magic_damage</code> (spell power)</td>
            <td class="py-2"><code>magic_resist</code></td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>Fire</code></td>
            <td class="py-2 pr-4"><code>magic_damage</code> (spell power)</td>
            <td class="py-2"><code>fire_resist</code></td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>Cold</code></td>
            <td class="py-2 pr-4"><code>magic_damage</code> (spell power)</td>
            <td class="py-2"><code>cold_resist</code></td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>Disease</code></td>
            <td class="py-2 pr-4"><code>magic_damage</code> (spell power)</td>
            <td class="py-2"><code>disease_resist</code></td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-sm text-muted-foreground">
      Poison is notable: it uses the physical <code>damage</code> stat (not
      <code>magic_damage</code>) but is mitigated by
      <code>poison_resist</code> (not <code>defense</code>).
    </p>
  </section>

  <!-- Section 4: Hit Check -->
  <section id="hit-check" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">4. Hit Check</h2>
    <p>
      Monsters have an <code>accuracy</code> stat (float, percentage 0.0-1.0)
      that scales linearly per level. Defined in
      <code>MonsterData.cs:53, 79-80</code>.
    </p>
    <p>
      Players gain <code>accuracy</code> from equipment (<code
        >ItemData.cs:183</code
      >) and from buff/passive skills via <code>accuracy_bonus</code> (<code
        >SkillData.cs:141</code
      >,
      <code>SkillExporter.cs:299</code>).
    </p>
    <div
      class="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm space-y-2"
    >
      <p class="font-semibold">Unknown</p>
      <p>
        No explicit <strong>evasion</strong> or <strong>dodge</strong> stat was found
        in the exported data. The accuracy stat on the attacker is likely checked
        against some defender stat by the game engine, but the exact formula lives
        in compiled IL2CPP code.
      </p>
    </div>
    <p>
      The <code>is_blindness</code> debuff flag (<code>SkillData.cs:117</code>,
      <code>SkillExporter.cs:339</code>) likely reduces accuracy when applied.
    </p>
  </section>

  <!-- Section 5: Critical Hits -->
  <section id="critical-hits" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">5. Critical Hits</h2>
    <p>
      Monsters have <code>critical_chance</code> (float, percentage 0.0-1.0)
      that scales per level. Defined in <code>MonsterData.cs:52, 77-78</code>.
    </p>
    <p>
      Players gain <code>critical_chance</code> from items (<code
        >ItemData.cs:184</code
      >) and from buff/passive skills via <code>critical_chance_bonus</code>
      (<code>SkillData.cs:142</code>).
    </p>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold">Condition</th>
            <th class="text-left py-2 font-semibold">Multiplier</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4">Normal critical hit</td>
            <td class="py-2"><strong>1.5x</strong> damage</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">With Radiant Aether equipped</td>
            <td class="py-2"><strong>3x</strong> damage</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-sm text-muted-foreground">
      The 1.5x default is inferred from the Radiant Aether item description
      which explicitly states "3x damage instead of 1.5x". See
      <code>website/src/routes/items/[id]/+page.svelte:752-753</code>.
    </p>
  </section>

  <!-- Section 6: Player Defenses -->
  <section id="player-defenses" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">6. Player Defenses</h2>
    <p>
      Player defenses come from two sources: <strong>equipment</strong> and
      <strong>buff/passive skills</strong>.
    </p>

    <h3 class="text-lg font-semibold mt-4">
      Equipment Stats
      <span class="text-sm font-normal text-muted-foreground"
        >(ItemData.cs:169-197)</span
      >
    </h3>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold">Stat</th>
            <th class="text-left py-2 pr-4 font-semibold">Type</th>
            <th class="text-left py-2 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4"><code>defense</code></td>
            <td class="py-2 pr-4"><code>int</code></td>
            <td class="py-2">Physical damage reduction (AC)</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>magic_resist</code></td>
            <td class="py-2 pr-4"><code>int</code></td>
            <td class="py-2">Magic damage reduction</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>poison_resist</code></td>
            <td class="py-2 pr-4"><code>int</code></td>
            <td class="py-2">Poison damage reduction</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>fire_resist</code></td>
            <td class="py-2 pr-4"><code>int</code></td>
            <td class="py-2">Fire damage reduction</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>cold_resist</code></td>
            <td class="py-2 pr-4"><code>int</code></td>
            <td class="py-2">Cold damage reduction</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>disease_resist</code></td>
            <td class="py-2 pr-4"><code>int</code></td>
            <td class="py-2">Disease damage reduction</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>block_chance</code></td>
            <td class="py-2 pr-4"><code>float</code></td>
            <td class="py-2">Chance to block an attack entirely</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>resist_fear_chance</code></td>
            <td class="py-2 pr-4"><code>float</code></td>
            <td class="py-2">Chance to resist fear effects</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 class="text-lg font-semibold mt-4">
      Buff/Passive Bonuses
      <span class="text-sm font-normal text-muted-foreground"
        >(SkillData.cs:124-160)</span
      >
    </h3>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold">Bonus</th>
            <th class="text-left py-2 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4"><code>defense_bonus</code></td>
            <td class="py-2">+AC from buff/passive</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>magic_resist_bonus</code></td>
            <td class="py-2">+Magic Resist</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>poison_resist_bonus</code></td>
            <td class="py-2">+Poison Resist</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>fire_resist_bonus</code></td>
            <td class="py-2">+Fire Resist</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>cold_resist_bonus</code></td>
            <td class="py-2">+Cold Resist</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>disease_resist_bonus</code></td>
            <td class="py-2">+Disease Resist</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>block_chance_bonus</code></td>
            <td class="py-2">+Block Chance</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>ward_bonus</code></td>
            <td class="py-2">Ward: absorbs incoming damage</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>damage_shield</code></td>
            <td class="py-2">Reflects damage back to attacker</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>fear_resist_chance_bonus</code></td>
            <td class="py-2">Chance to resist fear effects</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>health_max_bonus</code></td>
            <td class="py-2">Flat max HP increase</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>health_max_percent_bonus</code></td>
            <td class="py-2">Percentage max HP increase</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 class="text-lg font-semibold mt-4">Special Defensive Mechanics</h3>
    <ul class="list-disc list-inside space-y-2 ml-2">
      <li>
        <strong>Mana Shield</strong> (<code>is_mana_shield</code>,
        <code>SkillData.cs:106</code>, <code>SkillExporter.cs:272</code>):
        Damage hits mana instead of HP.
      </li>
      <li>
        <strong>Ward</strong> (<code>ward_bonus</code>,
        <code>SkillExporter.cs:337</code>): Absorbs a flat amount of damage
        before HP is affected.
      </li>
      <li>
        <strong>Damage Shield</strong> (<code>damage_shield</code>,
        <code>SkillData.cs:152</code>): Reflects damage back to the attacker.
      </li>
      <li>
        <strong>Invisibility</strong> (<code>is_invisibility</code>,
        <code>SkillData.cs:104</code>): Target cannot be targeted. Countered by
        monsters with <code>see_invisibility</code> flag.
      </li>
    </ul>
  </section>

  <!-- Section 7: Buffs & Debuffs -->
  <section id="buffs-debuffs" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">7. Buffs &amp; Debuffs</h2>
    <p>
      Active buffs/debuffs modify both attacker output and defender mitigation.
      Buff fields are populated via <code>BonusSkill</code> (the shared base of
      <code>BuffSkill</code> and <code>PassiveSkill</code>) at
      <code>SkillExporter.cs:277-360</code>.
    </p>

    <h3 class="text-lg font-semibold mt-4">Offensive Modifiers</h3>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold">Field</th>
            <th class="text-left py-2 font-semibold">Effect</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4"><code>damage_bonus</code></td>
            <td class="py-2">Flat physical damage modifier</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>damage_percent_bonus</code></td>
            <td class="py-2">% physical damage modifier</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>magic_damage_bonus</code></td>
            <td class="py-2">Flat spell power modifier</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>magic_damage_percent_bonus</code></td>
            <td class="py-2">% spell power modifier</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>is_enrage</code></td>
            <td class="py-2"
              >Passive: triggers below 25% HP, grants +50-100% damage</td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>haste_bonus</code></td>
            <td class="py-2">Attack speed modifier</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>spell_haste_bonus</code></td>
            <td class="py-2">Spell cast speed modifier</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>accuracy_bonus</code></td>
            <td class="py-2">Hit chance modifier</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>critical_chance_bonus</code></td>
            <td class="py-2">Critical hit chance modifier</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>cooldown_reduction_percent</code></td>
            <td class="py-2">Reduces skill cooldowns by percentage</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>heal_on_hit_percent</code></td>
            <td class="py-2"
              >Heals attacker for % of damage dealt on each hit</td
            >
          </tr>
        </tbody>
      </table>
    </div>

    <h3 class="text-lg font-semibold mt-4">Movement Modifiers</h3>
    <p>
      The <code>speed_bonus</code> field (<code>SkillData.cs:151</code>)
      modifies the target's movement speed. In the monster abilities table,
      values of -20 or below are displayed as "Root" (complete immobilization).
    </p>

    <h3 class="text-lg font-semibold mt-4">Regeneration &amp; Drain</h3>
    <p>
      Buff/debuff skills can apply per-second effects that tick over the skill's
      duration. Negative values drain instead of regenerate.
    </p>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold">Field</th>
            <th class="text-left py-2 font-semibold">Effect</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4"><code>healing_per_second_bonus</code></td>
            <td class="py-2">Flat HP regen/drain per second (negative = DoT)</td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4"
              ><code>health_percent_per_second_bonus</code></td
            >
            <td class="py-2">% of max HP regen per second</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>mana_per_second_bonus</code></td>
            <td class="py-2">Flat mana regen/drain per second</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>mana_percent_per_second_bonus</code></td
            >
            <td class="py-2">% of max mana regen per second</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>energy_per_second_bonus</code></td>
            <td class="py-2">Flat energy regen per second</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"
              ><code>energy_percent_per_second_bonus</code></td
            >
            <td class="py-2">% of max energy regen per second</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 class="text-lg font-semibold mt-4">Duration</h3>
    <p>
      Buff and debuff skills have <code>duration_base</code> and
      <code>duration_per_level</code> fields (<code>SkillData.cs:98-99</code>)
      that determine how long the effect persists, using the standard linear
      scaling formula.
    </p>

    <h3 class="text-lg font-semibold mt-4">Debuff Types</h3>
    <p>
      These flags on <code>BuffSkill</code> classify debuffs. Exported at
      <code>SkillExporter.cs:329-344</code>.
    </p>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold">Flag</th>
            <th class="text-left py-2 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4"><code>is_melee_debuff</code></td>
            <td class="py-2">Reduces target's melee damage</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>is_magic_debuff</code></td>
            <td class="py-2">Reduces target's magic damage</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>is_poison_debuff</code></td>
            <td class="py-2">Poison DoT effect</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>is_fire_debuff</code></td>
            <td class="py-2">Fire DoT effect</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>is_cold_debuff</code></td>
            <td class="py-2">Cold DoT effect</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>is_disease_debuff</code></td>
            <td class="py-2">Disease DoT effect</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>is_blindness</code></td>
            <td class="py-2">Likely reduces accuracy/hit chance</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>is_decrease_resists_skill</code></td>
            <td class="py-2">Lowers target's resistances</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 class="text-lg font-semibold mt-4">Buff/Debuff Removal</h3>
    <ul class="list-disc list-inside space-y-2 ml-2">
      <li>
        <strong>Cleanse</strong> (<code>is_cleanse</code>,
        <code>SkillExporter.cs:335</code>): Removes debuffs from the target.
      </li>
      <li>
        <strong>Dispel</strong> (<code>is_dispel</code>,
        <code>SkillExporter.cs:336</code>): Removes buffs from the enemy.
      </li>
      <li>
        <strong>Cleanse Resistance</strong> (<code>prob_ignore_cleanse</code>,
        <code>SkillData.cs:121</code>): Some debuffs have a probability of
        resisting cleanse attempts.
      </li>
    </ul>
  </section>

  <!-- Section 8: Side Effects -->
  <section id="side-effects" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">
      8. Side Effects (CC &amp; Utility)
    </h2>
    <p>
      Damage skills can apply crowd control and utility effects alongside
      damage. These are fields on <code>DamageSkill</code>, exported at
      <code>SkillExporter.cs:191-221</code>.
    </p>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold">Effect</th>
            <th class="text-left py-2 pr-4 font-semibold">Fields</th>
            <th class="text-left py-2 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4">Stun</td>
            <td class="py-2 pr-4"
              ><code>stun_chance</code>, <code>stun_time</code></td
            >
            <td class="py-2">Chance to stun; prevents target from acting</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">Fear</td>
            <td class="py-2 pr-4"
              ><code>fear_chance</code>, <code>fear_time</code></td
            >
            <td class="py-2"
              >Chance to fear; target runs uncontrollably. Resisted by
              <code>resist_fear_chance</code> /
              <code>fear_resist_chance_bonus</code></td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4">Knockback</td>
            <td class="py-2 pr-4"><code>knockback_chance</code></td>
            <td class="py-2">Chance to knock the target back</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">Lifetap</td>
            <td class="py-2 pr-4"><code>lifetap_percent</code></td>
            <td class="py-2">Heals attacker for a percentage of damage dealt</td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4">Manaburn</td>
            <td class="py-2 pr-4"><code>is_manaburn_skill</code></td>
            <td class="py-2">Burns target's mana</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">Assassination</td>
            <td class="py-2 pr-4"><code>is_assassination_skill</code></td>
            <td class="py-2">Special assassination mechanic</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">Break Armor</td>
            <td class="py-2 pr-4"><code>break_armor_prob</code></td>
            <td class="py-2">Probability to break the target's armor</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">Aggro</td>
            <td class="py-2 pr-4"><code>aggro</code></td>
            <td class="py-2">Threat generation value</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- Section 9: Skill Type Hierarchy -->
  <section id="skill-types" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">
      9. Skill Type Hierarchy
    </h2>
    <p>
      The game's IL2CPP class hierarchy for skills is resolved in
      <code>SkillExporter.cs:116-165</code> via
      <code>DetermineSkillType()</code>. The resulting
      <code>skill_type</code> string is stored in <code>SkillData.cs:22</code>.
    </p>

    <h3 class="text-lg font-semibold mt-4">Damage Skills</h3>
    <p>
      All inherit from <code>DamageSkill</code>. Fields populated at
      <code>SkillExporter.cs:167-237</code>.
    </p>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold">IL2CPP Class</th>
            <th class="text-left py-2 pr-4 font-semibold"
              ><code>skill_type</code> value</th
            >
            <th class="text-left py-2 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4"><code>DamageSkill</code></td>
            <td class="py-2 pr-4"><code>"damage"</code></td>
            <td class="py-2">Generic base damage skill</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>TargetDamageSkill</code></td>
            <td class="py-2 pr-4"><code>"target_damage"</code></td>
            <td class="py-2">Single-target damage</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>TargetProjectileSkill</code></td>
            <td class="py-2 pr-4"><code>"target_projectile"</code></td>
            <td class="py-2">Projectile attack at target</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>AreaDamageSkill</code></td>
            <td class="py-2 pr-4"><code>"area_damage"</code></td>
            <td class="py-2">Area of effect damage</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>FrontalDamageSkill</code></td>
            <td class="py-2 pr-4"><code>"frontal_damage"</code></td>
            <td class="py-2">Frontal cone damage</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>FrontalProjectilesSkill</code></td>
            <td class="py-2 pr-4"><code>"frontal_projectiles"</code></td>
            <td class="py-2">Frontal projectile spray</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>AreaObjectSpawnSkill</code></td>
            <td class="py-2 pr-4"><code>"area_object_spawn"</code></td>
            <td class="py-2"
              >Spawns persistent damage zones (e.g. fire patches)</td
            >
          </tr>
        </tbody>
      </table>
    </div>

    <h3 class="text-lg font-semibold mt-4">Other Skill Types</h3>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold"
              ><code>skill_type</code> value</th
            >
            <th class="text-left py-2 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4"
              ><code>"heal"</code> / <code>"target_heal"</code> /
              <code>"area_heal"</code></td
            >
            <td class="py-2">Healing skills</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"
              ><code>"buff"</code> / <code>"target_buff"</code> /
              <code>"area_buff"</code></td
            >
            <td class="py-2">Beneficial buffs</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"
              ><code>"debuff"</code> / <code>"target_debuff"</code> /
              <code>"area_debuff"</code></td
            >
            <td class="py-2">Harmful debuffs</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>"passive"</code></td>
            <td class="py-2">Passive (always-on) effects, e.g. enrage</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>"summon"</code></td>
            <td class="py-2">Player pet summoning</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>"summon_monsters"</code></td>
            <td class="py-2">Boss monster summoning (adds to fight)</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-sm text-muted-foreground">
      Note: <code>SummonSkillMonsters</code> inherits directly from
      <code>ScriptableSkill</code>, NOT from <code>SummonSkill</code>. See
      <code>SkillExporter.cs:160-162</code>.
    </p>
  </section>

  <!-- Section 10: Monster Combat Flags -->
  <section id="monster-combat-flags" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">
      10. Monster Combat Flags
    </h2>
    <p>
      Boolean flags on <code>MonsterData</code> that affect combat behavior.
      Defined at <code>MonsterData.cs:102-109</code>.
    </p>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold">Flag</th>
            <th class="text-left py-2 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4"><code>see_invisibility</code></td>
            <td class="py-2">Monster can detect and target invisible players</td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>is_immune_debuffs</code></td>
            <td class="py-2">Monster is immune to all debuffs</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>yell_friends</code></td>
            <td class="py-2">Calls nearby allies when engaged (social aggro)</td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>flee_on_low_hp</code></td>
            <td class="py-2">Monster runs away at low health</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>no_aggro_monster</code></td>
            <td class="py-2"
              >Passive: does not initiate combat (player must attack first)</td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>has_aura</code></td>
            <td class="py-2">Monster has a persistent aura effect</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-sm text-muted-foreground">
      Monster skills are listed in <code>skill_ids</code> (<code
        >MonsterData.cs:141</code
      >). Index 0 is the default auto-attack; index 1+ are special abilities.
    </p>
  </section>

  <!-- Section 11: AoE Mechanics -->
  <section id="aoe-mechanics" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">11. AoE Mechanics</h2>
    <p>
      Area-of-effect skills have additional fields beyond standard damage.
      Defined in <code>SkillData.cs:80-83</code>, exported at
      <code>SkillExporter.cs:223-237</code>.
    </p>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold">Field</th>
            <th class="text-left py-2 pr-4 font-semibold">Skill Type</th>
            <th class="text-left py-2 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4"><code>affects_random_target</code></td>
            <td class="py-2 pr-4"><code>AreaDamageSkill</code></td>
            <td class="py-2"
              >If true, hits random targets in the area rather than all</td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>area_object_size</code></td>
            <td class="py-2 pr-4"><code>AreaObjectSpawnSkill</code></td>
            <td class="py-2">Size of the spawned damage zone</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>area_object_delay_damage</code></td>
            <td class="py-2 pr-4"><code>AreaObjectSpawnSkill</code></td>
            <td class="py-2">Delay (seconds) before damage applies</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>area_objects_to_spawn</code></td>
            <td class="py-2 pr-4"><code>AreaObjectSpawnSkill</code></td>
            <td class="py-2">Number of damage zones spawned per cast</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- Section 12: Source Code Reference -->
  <section id="source-reference" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">
      12. Source Code Reference
    </h2>
    <p>Summary of key files and their roles in the damage pipeline.</p>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold">File</th>
            <th class="text-left py-2 pr-4 font-semibold">Key Lines</th>
            <th class="text-left py-2 font-semibold">Role</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4"
              ><code>mods/DataExporter/Models/MonsterData.cs</code></td
            >
            <td class="py-2 pr-4">42-80, 102-109</td>
            <td class="py-2"
              >Monster combat stats, scaling fields, combat flags</td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4"
              ><code>mods/DataExporter/Models/SkillData.cs</code></td
            >
            <td class="py-2 pr-4">5-15, 65-83, 97-160</td>
            <td class="py-2"
              >LinearStatBonus types, damage skill fields, buff/passive stat
              bonuses</td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4"
              ><code>mods/DataExporter/Models/ItemData.cs</code></td
            >
            <td class="py-2 pr-4">169-197</td>
            <td class="py-2">Equipment combat stats and resistances</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"
              ><code>mods/DataExporter/Exporters/SkillExporter.cs</code></td
            >
            <td class="py-2 pr-4">116-165, 167-237, 277-360</td>
            <td class="py-2"
              >Skill type hierarchy resolution, damage field extraction,
              buff/passive bonus extraction</td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4"
              ><code>mods/DataExporter/Exporters/MonsterExporter.cs</code></td
            >
            <td class="py-2 pr-4">75-141</td>
            <td class="py-2">Monster stat extraction and combat flag export</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"
              ><code>website/src/routes/monsters/[id]/+page.svelte</code></td
            >
            <td class="py-2 pr-4">88-168, 311-343</td>
            <td class="py-2"
              >Stat scaling display with level slider, pre-mitigation damage
              calculation in <code>formatSkillEffect()</code></td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4"
              ><code>website/src/routes/items/[id]/+page.svelte</code></td
            >
            <td class="py-2 pr-4">752-753</td>
            <td class="py-2"
              >Radiant Aether description (confirms 1.5x default crit
              multiplier)</td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>build-pipeline/schema.sql</code></td>
            <td class="py-2 pr-4">396-434</td>
            <td class="py-2"
              >SQLite schema for monster stats (mirrors MonsterData.cs)</td
            >
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</div>
