<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
</script>

<svelte:head>
  <title>Damage Mechanics | Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="Complete combat damage mechanics reference for Ancient Kingdoms, based on decompiled server scripts."
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
      Complete combat reference for Ancient Kingdoms. All formulas are sourced
      from decompiled server scripts in <code>server-scripts/Combat.cs</code>.
    </p>
  </div>

  <!-- Table of Contents -->
  <nav class="rounded-lg border p-4 space-y-2">
    <h2 class="text-sm font-semibold uppercase text-muted-foreground">
      Contents
    </h2>
    <ol class="list-decimal list-inside space-y-1 text-sm">
      <li>
        <a href="#stat-scaling" class="hover:underline">Stat Scaling</a>
      </li>
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
      <li>
        <a href="#hit-check" class="hover:underline">Hit Check (Resist/Block)</a
        >
      </li>
      <li>
        <a href="#damage-modifiers" class="hover:underline"
          >Pre-Mitigation Modifiers</a
        >
      </li>
      <li>
        <a href="#damage-mitigation" class="hover:underline"
          >Damage Mitigation</a
        >
      </li>
      <li>
        <a href="#critical-hits" class="hover:underline">Critical Hits</a>
      </li>
      <li>
        <a href="#damage-resolution" class="hover:underline"
          >Damage Resolution (Ward, Mana Shield, Lifetap, Parry)</a
        >
      </li>
      <li>
        <a href="#damage-shield" class="hover:underline"
          >Damage Shield (Thorns)</a
        >
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
        <a href="#full-pipeline" class="hover:underline">Full Damage Pipeline</a
        >
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
  </section>

  <!-- Section 2: Pre-Mitigation Damage -->
  <section id="pre-mitigation-damage" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">
      2. Pre-Mitigation Damage
    </h2>
    <p>
      When a monster uses a damage skill, the base damage is calculated by
      combining the monster's combat stat with the skill's flat damage, then
      optionally applying a percent multiplier:
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
      These use the same linear scaling.
    </p>
  </section>

  <!-- Section 3: Damage Type Routing -->
  <section id="damage-type-routing" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">3. Damage Type Routing</h2>
    <p>
      The skill's <code>damage_type</code> field (<code>SkillData.cs:68</code>,
      exported from <code>DamageSkill.damageType</code> at
      <code>SkillExporter.cs:182</code>) determines three things:
    </p>
    <ol class="list-decimal list-inside space-y-1 ml-2">
      <li>
        Which <strong>monster combat stat</strong> feeds into the damage formula
      </li>
      <li>
        Which <strong>defender stat</strong> determines
        <strong>resist/block chance</strong> (miss)
      </li>
      <li>
        Which <strong>defender stat</strong> determines
        <strong>damage mitigation</strong> (reduction)
      </li>
    </ol>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold">Damage Type</th>
            <th class="text-left py-2 pr-4 font-semibold">Monster Stat</th>
            <th class="text-left py-2 pr-4 font-semibold">Resist/Block Base</th>
            <th class="text-left py-2 font-semibold">Mitigation Stat</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4"><code>Normal</code></td>
            <td class="py-2 pr-4"><code>damage</code></td>
            <td class="py-2 pr-4"><code>blockChance</code>*</td>
            <td class="py-2"><code>defense * 0.0005</code></td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>Poison</code></td>
            <td class="py-2 pr-4"><code>damage</code></td>
            <td class="py-2 pr-4"><code>poisonResist * 0.0005</code></td>
            <td class="py-2"><code>poisonResist * 0.0005</code></td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>Magic</code></td>
            <td class="py-2 pr-4"><code>magic_damage</code></td>
            <td class="py-2 pr-4"><code>magicResist * 0.0005</code></td>
            <td class="py-2"><code>magicResist * 0.0005</code></td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>Fire</code></td>
            <td class="py-2 pr-4"><code>magic_damage</code></td>
            <td class="py-2 pr-4"><code>fireResist * 0.0005</code></td>
            <td class="py-2"><code>fireResist * 0.0005</code></td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>Cold</code></td>
            <td class="py-2 pr-4"><code>magic_damage</code></td>
            <td class="py-2 pr-4"><code>coldResist * 0.0005</code></td>
            <td class="py-2"><code>coldResist * 0.0005</code></td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>Disease</code></td>
            <td class="py-2 pr-4"><code>magic_damage</code></td>
            <td class="py-2 pr-4"><code>diseaseResist * 0.0005</code></td>
            <td class="py-2"><code>diseaseResist * 0.0005</code></td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-sm text-muted-foreground">
      *<code>blockChance</code> is a composite stat:
      <code
        >clamp(baseBlockChance(level) + defense * 0.0001 + equipmentBonus, 0,
        0.8)</code
      >. So defense contributes to both block chance AND damage mitigation for
      Normal hits. See <code>Combat.cs:280-292</code>.
    </p>
    <p class="text-sm text-muted-foreground">
      Poison is notable: it uses the physical <code>damage</code> stat (not
      <code>magic_damage</code>) but is mitigated by
      <code>poison_resist</code> (not <code>defense</code>).
    </p>
  </section>

  <!-- Section 4: Hit Check -->
  <section id="hit-check" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">
      4. Hit Check (Resist/Block)
    </h2>
    <p>
      Before damage is applied, the game rolls a resist/block check. If the roll
      succeeds, the attack misses entirely. The formula from
      <code>Combat.cs:479-508, 1216-1256</code>:
    </p>
    <div class="rounded-lg border bg-muted/30 p-4 font-mono text-sm space-y-2">
      <p>levelMod = clamp((victimLevel - attackerLevel) * 0.005, -0.1, 0.1)</p>
      <br />
      <p>probResist = clamp(baseResist + levelMod - accuracy, 0.0, 0.9)</p>
      <br />
      <p class="text-muted-foreground">// Attack misses if:</p>
      <p>if (probResist &gt; random(0.0, 1.0)) =&gt; MISS</p>
    </div>
    <p>
      Where <code>baseResist</code> depends on the damage type:
    </p>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold">Damage Type</th>
            <th class="text-left py-2 pr-4 font-semibold">Base Resist</th>
            <th class="text-left py-2 font-semibold">Function</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4"><code>Normal</code></td>
            <td class="py-2 pr-4"><code>blockChance</code></td>
            <td class="py-2"><code>GetProbResistMeleeDamage()</code></td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>Magic</code></td>
            <td class="py-2 pr-4"><code>magicResist * 0.0005</code></td>
            <td class="py-2"><code>GetProbResistMagic()</code></td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>Poison</code></td>
            <td class="py-2 pr-4"><code>poisonResist * 0.0005</code></td>
            <td class="py-2"><code>GetProbResistPoison()</code></td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>Fire</code></td>
            <td class="py-2 pr-4"><code>fireResist * 0.0005</code></td>
            <td class="py-2"><code>GetProbResistFire()</code></td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>Cold</code></td>
            <td class="py-2 pr-4"><code>coldResist * 0.0005</code></td>
            <td class="py-2"><code>GetProbResistCold()</code></td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>Disease</code></td>
            <td class="py-2 pr-4"><code>diseaseResist * 0.0005</code></td>
            <td class="py-2"><code>GetProbResistDisease()</code></td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 class="text-lg font-semibold mt-4">Accuracy</h3>
    <p>
      Accuracy is subtracted from the resist probability, making attacks more
      likely to land. It affects <strong>all damage types</strong> equally.
      Clamped to [-0.5, 1.0]. Sources (<code>Combat.cs:168-180</code>):
    </p>
    <ul class="list-disc list-inside space-y-1 ml-2 text-sm">
      <li>
        <strong>Base stat</strong>: <code>baseAccuracy(level)</code> (linear scaling)
      </li>
      <li>
        <strong>Equipment</strong>: sum of <code>accuracyBonus</code> from equipped
        items
      </li>
      <li>
        <strong>Dexterity</strong>: <code>dex * 0.0005</code> per point (<code
          >Dexterity.cs:67-70</code
        >)
      </li>
      <li>
        <strong>Passive skills</strong>: sum of
        <code>accuracyBonus(skillLevel)</code>
      </li>
      <li>
        <strong>Active buffs</strong>: sum of <code>accuracyBonus</code> from buffs
      </li>
    </ul>

    <h3 class="text-lg font-semibold mt-4">Debuff Resist</h3>
    <p>
      Melee debuffs use a separate function
      <code>GetProbResistMeleeDebuff()</code>
      (<code>Combat.cs:1222-1226</code>) which uses
      <code>defense * 0.0005</code> instead of <code>blockChance</code>:
    </p>
    <div class="rounded-lg border bg-muted/30 p-4 font-mono text-sm">
      probResistDebuff = clamp(defense * 0.0005 + levelMod - accuracy, 0.0, 0.9)
    </div>
    <p class="text-sm text-muted-foreground">
      Elemental debuffs use the same resist functions as their damage
      counterparts (e.g. poison debuffs use <code>GetProbResistPoison()</code>).
    </p>

    <h3 class="text-lg font-semibold mt-4">Resist Modifiers</h3>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold">Condition</th>
            <th class="text-left py-2 pr-4 font-semibold">Effect</th>
            <th class="text-left py-2 font-semibold">Source</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4">Backstab</td>
            <td class="py-2 pr-4"
              ><code>probResist *= 0.8</code> (20% reduction)</td
            >
            <td class="py-2"><code>Combat.cs:489-492</code></td>
          </tr>
          <tr>
            <td class="py-2 pr-4">Victim is moving (Player)</td>
            <td class="py-2 pr-4"
              ><code>probResist -= 0.25</code> (floor at 0)</td
            >
            <td class="py-2"><code>Combat.cs:493-495</code></td>
          </tr>
          <tr>
            <td class="py-2 pr-4">Manaburn skill</td>
            <td class="py-2 pr-4"><code>probResist = 0</code> (always hits)</td>
            <td class="py-2"><code>Combat.cs:504-507</code></td>
          </tr>
          <tr>
            <td class="py-2 pr-4">Invulnerable target</td>
            <td class="py-2 pr-4">Attack blocked entirely</td>
            <td class="py-2"><code>Combat.cs:464</code></td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-sm text-muted-foreground">
      Invulnerability: <code
        >defense &gt;= 10000 AND magicResist &gt;= 10000</code
      >, or the <code>invincible</code> flag. Visual feedback: "Miss" for melee
      (<code>Combat.cs:1418-1439</code>), "Resisted" for spells (<code
        >Combat.cs:1361-1378</code
      >).
    </p>
  </section>

  <!-- Section 5: Pre-Mitigation Modifiers -->
  <section id="damage-modifiers" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">
      5. Pre-Mitigation Modifiers
    </h2>
    <p>
      After the hit check passes, several modifiers are applied to the raw
      damage before mitigation. These are applied in order at
      <code>Combat.cs:581-647</code>:
    </p>

    <h3 class="text-lg font-semibold mt-4">Random Variance</h3>
    <div class="rounded-lg border bg-muted/30 p-4 font-mono text-sm">
      damage = round(damage * random(0.9, 1.1))
    </div>
    <p class="text-sm text-muted-foreground">
      All attacks have +/-10% random damage variance.
      <code>Combat.cs:581</code>.
    </p>

    <h3 class="text-lg font-semibold mt-4">Backstab Bonus</h3>
    <p>
      A backstab occurs when the attacker and victim face the same direction,
      and the skill is <code>TargetDamageSkill</code> or
      <code>TargetProjectileSkill</code> (<code>Combat.cs:477</code>).
    </p>
    <div class="rounded-lg border bg-muted/30 p-4 font-mono text-sm space-y-1">
      <p class="text-muted-foreground">// Default: +10% damage</p>
      <p>damage += ceil(damage * 0.10) + 1</p>
      <br />
      <p class="text-muted-foreground">
        // Rogue with "Backstab" passive (skill index 13): +25% damage
      </p>
      <p>damage += ceil(damage * 0.25) + 1</p>
    </div>
    <p class="text-sm text-muted-foreground">
      Interrupting a channeling victim (skill indices 22, 23, 26, 27) is also
      treated as a backstab and grants +75% critical chance.
      <code>Combat.cs:571-579</code>.
    </p>

    <h3 class="text-lg font-semibold mt-4">Level Difference</h3>
    <div class="rounded-lg border bg-muted/30 p-4 font-mono text-sm">
      damage += ceil(damage * clamp((attackerLevel - victimLevel) * 0.02, -0.2,
      0.2))
    </div>
    <p class="text-sm text-muted-foreground">
      Up to +/-20% damage based on level gap. Each level of difference = 2%.
      <code>Combat.cs:587</code>.
    </p>

    <h3 class="text-lg font-semibold mt-4">
      Movement Penalty (Player victims)
    </h3>
    <div class="rounded-lg border bg-muted/30 p-4 font-mono text-sm">
      damage += floor(damage * 0.10)
    </div>
    <p class="text-sm text-muted-foreground">
      Players who are moving when hit take +10% damage. Also reduces resist
      chance by 0.25 (see Hit Check). Normal melee attacks against moving
      players also gain a stun chance:
      <code>clamp(0.1 - levelDiff * 0.01, 0.01, 0.1)</code>.
      <code>Combat.cs:493-503</code>.
    </p>

    <h3 class="text-lg font-semibold mt-4">Slayer Reduction</h3>
    <p>
      When a Boss or Elite monster attacks a Player or Pet, the victim's slayer
      level reduces incoming damage (<code>Combat.cs:588-596</code>):
    </p>
    <div class="rounded-lg border bg-muted/30 p-4 font-mono text-sm">
      if (slayerLevel &gt;= 0.1) damage -= ceil(damage * slayerLevel * 0.1)
    </div>

    <h3 class="text-lg font-semibold mt-4">Enrage</h3>
    <p>
      Non-spell attacks when the attacker is below 25% HP. Only applies to
      entities with the <code>is_enrage</code> passive (<code
        >Combat.cs:597-647</code
      >):
    </p>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold">Attacker</th>
            <th class="text-left py-2 font-semibold">Bonus</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4">Player</td>
            <td class="py-2"><strong>+33%</strong> damage</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">Monster / NPC</td>
            <td class="py-2"><strong>+50% to +100%</strong> damage (random)</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- Section 6: Damage Mitigation -->
  <section id="damage-mitigation" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">6. Damage Mitigation</h2>
    <p>
      After pre-mitigation modifiers, the defender's relevant stat reduces the
      incoming damage. The formula is identical for all damage types (<code
        >Combat.cs:648-675</code
      >):
    </p>
    <div class="rounded-lg border bg-muted/30 p-4 font-mono text-sm space-y-2">
      <p>mitigationPct = clamp(stat * 0.0005, 0.0, 0.9)</p>
      <p>finalDamage = rawDamage - ceil(rawDamage * mitigationPct)</p>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold">Damage Type</th>
            <th class="text-left py-2 pr-4 font-semibold">Mitigation Stat</th>
            <th class="text-left py-2 font-semibold">Cap (90%) at</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4"><code>Normal</code></td>
            <td class="py-2 pr-4"><code>defense</code></td>
            <td class="py-2">1,800</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>Magic</code></td>
            <td class="py-2 pr-4"><code>magicResist</code></td>
            <td class="py-2">1,800</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>Poison</code></td>
            <td class="py-2 pr-4"><code>poisonResist</code></td>
            <td class="py-2">1,800</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>Fire</code></td>
            <td class="py-2 pr-4"><code>fireResist</code></td>
            <td class="py-2">1,800</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>Cold</code></td>
            <td class="py-2 pr-4"><code>coldResist</code></td>
            <td class="py-2">1,800</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>Disease</code></td>
            <td class="py-2 pr-4"><code>diseaseResist</code></td>
            <td class="py-2">1,800</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-sm text-muted-foreground">
      Maximum 90% damage reduction at 1,800 stat points.
      <strong>Manaburn skills bypass mitigation entirely</strong> &mdash; they
      deal full unmitigated damage (<code>Combat.cs:648-651</code>).
    </p>
    <p class="text-sm text-muted-foreground">
      For Normal damage, defense serves double duty: it contributes to both
      block chance (miss via <code>defense * 0.0001</code>) AND damage
      mitigation (<code>defense * 0.0005</code>).
    </p>
  </section>

  <!-- Section 7: Critical Hits -->
  <section id="critical-hits" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">7. Critical Hits</h2>
    <p>
      Critical hits are rolled after damage mitigation. The
      <code>criticalChance</code> property is capped at
      <strong>70%</strong> (<code>Combat.cs:294-306</code>). Only triggers if
      post-mitigation damage &gt; 3 (<code>Combat.cs:717</code>).
    </p>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold">Condition</th>
            <th class="text-left py-2 pr-4 font-semibold">Multiplier</th>
            <th class="text-left py-2 font-semibold">Probability</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4">Normal critical hit</td>
            <td class="py-2 pr-4"><strong>1.5x</strong></td>
            <td class="py-2">95% of crits</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">Super critical hit</td>
            <td class="py-2 pr-4"><strong>2.0x</strong></td>
            <td class="py-2">5% of crits</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">Radiant Aether crit</td>
            <td class="py-2 pr-4"><strong>3.0x</strong></td>
            <td class="py-2">Overrides both (special activation)</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 class="text-lg font-semibold mt-4">Crit Chance Modifiers</h3>
    <ul class="list-disc list-inside space-y-1 ml-2 text-sm">
      <li>
        <strong>Steadfast Guard</strong> (Warrior/Rogue passive): reduces
        incoming crit chance by 20% multiplicatively (<code
          >critChance *= 0.8</code
        >). <code>Combat.cs:706-716</code>.
      </li>
      <li>
        <strong>Interrupting a channeling target</strong>: +75% crit chance
        bonus. <code>Combat.cs:571-579</code>.
      </li>
      <li>
        Sources: <code>baseCriticalChance(level)</code>, equipment
        <code>criticalChanceBonus</code>, buff/passive
        <code>critical_chance_bonus</code>.
      </li>
    </ul>
    <p class="text-sm text-muted-foreground">
      Source: <code>Combat.cs:676-735</code>.
    </p>
  </section>

  <!-- Section 8: Damage Resolution -->
  <section id="damage-resolution" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">
      8. Damage Resolution (Ward, Mana Shield, Lifetap, Parry)
    </h2>
    <p>
      After mitigation and crit, the final damage passes through several
      absorption and reflection layers in order:
    </p>

    <h3 class="text-lg font-semibold mt-4">Ward</h3>
    <p>
      Ward absorbs incoming damage before HP. If the ward has enough HP, it
      absorbs all damage. Otherwise it shatters and remaining damage passes
      through (<code>Combat.cs:981-1030</code>).
    </p>
    <div class="rounded-lg border bg-muted/30 p-4 font-mono text-sm space-y-1">
      <p>wardHP = wardBonus(skillLevel) + wisdom * 5</p>
      <br />
      <p class="text-muted-foreground">// On each hit:</p>
      <p>if (wardHP &gt;= damage) wardHP -= damage; damage = 0</p>
      <p>if (wardHP &lt; damage) damage -= wardHP; ward shatters</p>
    </div>
    <p class="text-sm text-muted-foreground">
      Ward HP is initialized from <code>TargetBuffSkill.cs:421-424</code>.
    </p>

    <h3 class="text-lg font-semibold mt-4">Mana Shield</h3>
    <p>
      After ward, remaining damage is absorbed by mana at a
      <strong>1:1 ratio</strong>. When mana runs out, the buff is removed (<code
        >Combat.cs:1031-1061</code
      >).
    </p>
    <div class="rounded-lg border bg-muted/30 p-4 font-mono text-sm space-y-1">
      <p>if (mana &gt;= damage) mana -= damage; damage = 0</p>
      <p>if (mana &lt; damage) damage -= mana; mana = 0; buff removed</p>
    </div>

    <h3 class="text-lg font-semibold mt-4">Lifetap</h3>
    <p>
      The attacker heals for a percentage of the final damage dealt (after
      ward/mana shield). <code>Combat.cs:1062-1069</code>.
    </p>
    <div class="rounded-lg border bg-muted/30 p-4 font-mono text-sm">
      heal = floor(lifetapPercent * finalDamage)
    </div>
    <p class="text-sm text-muted-foreground">
      <code>lifetapPercent</code> is a per-skill stat on
      <code>DamageSkill</code>.
    </p>

    <h3 class="text-lg font-semibold mt-4">Parry</h3>
    <p>
      Warrior and Ranger can use the "Parry" skill while targeting the attacker.
      Reflects 50% of damage back (capped at 5,000), and the victim takes no
      damage (<code>Combat.cs:1081-1094, 1258-1269</code>).
    </p>
    <div class="rounded-lg border bg-muted/30 p-4 font-mono text-sm">
      reflectedDamage = clamp(round(damage * 0.5), 1, 5000)
    </div>
    <p class="text-sm text-muted-foreground">
      Only works against Normal <code>TargetDamageSkill</code> while the defender
      is casting Parry and targeting the attacker.
    </p>

    <h3 class="text-lg font-semibold mt-4">Radiant Aether Save</h3>
    <p>
      If damage would kill a player with Radiant Aether activated, they are
      fully healed instead of dying (<code>Combat.cs:1070-1078</code>).
    </p>
  </section>

  <!-- Section 9: Damage Shield (Thorns) -->
  <section id="damage-shield" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">
      9. Damage Shield (Thorns)
    </h2>
    <p>
      Damage shield buffs on the victim reflect damage back to melee attackers.
      Only triggers for non-spell <code>TargetDamageSkill</code> with
      <code>castRange &lt; 1.5</code> (<code>Combat.cs:761-841</code>).
    </p>
    <div class="rounded-lg border bg-muted/30 p-4 font-mono text-sm space-y-2">
      <p>baseDmgShield = buff.damageShield(skillLevel)</p>
      <p>attributeBonus = round(buff.bonusAttribute * 0.75)</p>
      <p>raw = baseDmgShield + attributeBonus</p>
      <br />
      <p class="text-muted-foreground">
        // Mitigated by the ATTACKER's resists (based on debuff type)
      </p>
      <p>
        mitigated = raw - ceil(raw * clamp(attackerResist * 0.0005, 0.0, 0.9))
      </p>
      <br />
      <p class="text-muted-foreground">// +/-10% random variance</p>
      <p>
        finalThorns = mitigated + random(-ceil(mitigated*0.1),
        ceil(mitigated*0.1))
      </p>
    </div>
    <p class="text-sm text-muted-foreground">
      The damage type of the thorns depends on the buff's debuff type flags (<code
        >isMeleeDebuff</code
      >, <code>isPoisonDebuff</code>, etc.), which determines which of the
      attacker's resist stats mitigates the reflected damage.
    </p>
  </section>

  <!-- Section 10: Player Defenses -->
  <section id="player-defenses" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">10. Player Defenses</h2>
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
            <td class="py-2"
              >Reduces Normal damage (mitigation) + contributes to block chance</td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>magic_resist</code></td>
            <td class="py-2 pr-4"><code>int</code></td>
            <td class="py-2">Reduces Magic damage + resist chance</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>poison_resist</code></td>
            <td class="py-2 pr-4"><code>int</code></td>
            <td class="py-2">Reduces Poison damage + resist chance</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>fire_resist</code></td>
            <td class="py-2 pr-4"><code>int</code></td>
            <td class="py-2">Reduces Fire damage + resist chance</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>cold_resist</code></td>
            <td class="py-2 pr-4"><code>int</code></td>
            <td class="py-2">Reduces Cold damage + resist chance</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>disease_resist</code></td>
            <td class="py-2 pr-4"><code>int</code></td>
            <td class="py-2">Reduces Disease damage + resist chance</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>block_chance</code></td>
            <td class="py-2 pr-4"><code>float</code></td>
            <td class="py-2">Chance to fully avoid Normal attacks (cap 80%)</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>accuracy</code></td>
            <td class="py-2 pr-4"><code>float</code></td>
            <td class="py-2">Reduces target's resist/block probability</td>
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
            <td class="py-2">Ward: absorbs damage (HP = bonus + wisdom * 5)</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>damage_shield</code></td>
            <td class="py-2">Reflects damage back to melee attacker</td>
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
        <strong>Mana Shield</strong> (<code>is_mana_shield</code>): Absorbs
        damage 1:1 from mana pool. Removed when mana hits 0.
      </li>
      <li>
        <strong>Ward</strong> (<code>ward_bonus</code>): Absorbs a flat amount
        (bonus + wisdom*5). Shatters when depleted.
      </li>
      <li>
        <strong>Damage Shield</strong> (<code>damage_shield</code>): Reflects
        damage to melee attackers (see Section 9).
      </li>
      <li>
        <strong>Invisibility</strong> (<code>is_invisibility</code>): Target
        cannot be targeted. Countered by monsters with
        <code>see_invisibility</code>.
      </li>
      <li>
        <strong>Parry</strong>: Warrior/Ranger reflect 50% of Normal melee
        damage (cap 5,000). See Section 8.
      </li>
    </ul>
  </section>

  <!-- Section 11: Buffs & Debuffs -->
  <section id="buffs-debuffs" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">
      11. Buffs &amp; Debuffs
    </h2>
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
              >Passive: triggers below 25% HP, grants +33-100% damage</td
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
              >Heals attacker for % of damage dealt on melee hit</td
            >
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-sm text-muted-foreground">
      Heal on Hit only works for non-spell <code>DamageSkill</code> with
      <code>castRange &lt; 2</code> (melee). <code>Combat.cs:736-760</code>.
    </p>

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
            <td class="py-2">Melee-type debuff (resisted by defense)</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>is_magic_debuff</code></td>
            <td class="py-2">Magic-type debuff (resisted by magic resist)</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>is_poison_debuff</code></td>
            <td class="py-2">Poison-type debuff</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>is_fire_debuff</code></td>
            <td class="py-2">Fire-type debuff</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>is_cold_debuff</code></td>
            <td class="py-2">Cold-type debuff</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>is_disease_debuff</code></td>
            <td class="py-2">Disease-type debuff</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>is_blindness</code></td>
            <td class="py-2"
              >Reduces accuracy (accuracy can go negative, increasing resist
              chance)</td
            >
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
        <strong>Cleanse</strong> (<code>is_cleanse</code>): Removes debuffs from
        the target.
      </li>
      <li>
        <strong>Dispel</strong> (<code>is_dispel</code>): Removes buffs from the
        enemy.
      </li>
      <li>
        <strong>Cleanse Resistance</strong> (<code>prob_ignore_cleanse</code>):
        Some debuffs have a probability of resisting cleanse attempts.
      </li>
    </ul>
  </section>

  <!-- Section 12: Side Effects -->
  <section id="side-effects" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">
      12. Side Effects (CC &amp; Utility)
    </h2>
    <p>
      Damage skills can apply crowd control and utility effects alongside
      damage. These are fields on <code>DamageSkill</code>, exported at
      <code>SkillExporter.cs:191-221</code>. Stun, fear, and knockback are
      applied after damage resolution (<code>Combat.cs:855-933</code>).
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
            <td class="py-2">Prevents target from acting</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">Fear</td>
            <td class="py-2 pr-4"
              ><code>fear_chance</code>, <code>fear_time</code></td
            >
            <td class="py-2"
              >Target runs uncontrollably. Resisted by
              <code>resist_fear_chance</code></td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4">Knockback</td>
            <td class="py-2 pr-4"><code>knockback_chance</code></td>
            <td class="py-2">Knocks target back</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">Lifetap</td>
            <td class="py-2 pr-4"><code>lifetap_percent</code></td>
            <td class="py-2"
              >Heals attacker for % of final damage (see Section 8)</td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4">Manaburn</td>
            <td class="py-2 pr-4"><code>is_manaburn_skill</code></td>
            <td class="py-2"
              >Burns target's mana/energy. Bypasses resist AND mitigation</td
            >
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

    <h3 class="text-lg font-semibold mt-4">Manaburn Details</h3>
    <p class="text-sm">
      Manaburn damage depends on the attacker's class (<code
        >TargetDamageSkill.cs:151-156</code
      >, <code>TargetProjectileSkill.cs:216-220</code>):
    </p>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold">Class</th>
            <th class="text-left py-2 font-semibold">Formula</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4">Warrior / Rogue</td>
            <td class="py-2"
              ><code>damage = energy * 2</code>; energy set to 0</td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4">Wizard</td>
            <td class="py-2"><code>damage = mana * 3</code>; mana set to 0</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 class="text-lg font-semibold mt-4">Energy Generation</h3>
    <p class="text-sm">
      Warrior and Rogue gain energy from default attacks (<code
        >skill.followupDefaultAttack</code
      >). <code>Combat.cs:961-966</code>:
    </p>
    <div class="rounded-lg border bg-muted/30 p-4 font-mono text-sm">
      energyGain = floor(min(victimCurrentHP, damage) * 0.25)
    </div>
    <p class="text-sm text-muted-foreground">
      Wizard's "Mystic Spark" uses the same formula but restores mana instead (<code
        >Combat.cs:951-959</code
      >).
    </p>
  </section>

  <!-- Section 13: Skill Type Hierarchy -->
  <section id="skill-types" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">
      13. Skill Type Hierarchy
    </h2>
    <p>
      The game's class hierarchy for skills is resolved in
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
            <th class="text-left py-2 pr-4 font-semibold">Class</th>
            <th class="text-left py-2 pr-4 font-semibold"
              ><code>skill_type</code></th
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
              ><code>skill_type</code></th
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

  <!-- Section 14: Monster Combat Flags -->
  <section id="monster-combat-flags" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">
      14. Monster Combat Flags
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

  <!-- Section 15: AoE Mechanics -->
  <section id="aoe-mechanics" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">15. AoE Mechanics</h2>
    <p>
      Area-of-effect skills have additional fields beyond standard damage.
      Defined in <code>SkillData.cs:80-83</code>, exported at
      <code>SkillExporter.cs:223-237</code>.
      <code>AreaDamageSkill</code> can hit up to 10 targets (<code
        >AreaDamageSkill.cs</code
      >).
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

  <!-- Section 16: Full Damage Pipeline -->
  <section id="full-pipeline" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">
      16. Full Damage Pipeline
    </h2>
    <p>
      The complete execution order of <code>DealDamageAt()</code> in
      <code>Combat.cs:349-1118</code>. Each step references the section above
      where it is documented in detail.
    </p>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold w-8">#</th>
            <th class="text-left py-2 pr-4 font-semibold">Step</th>
            <th class="text-left py-2 pr-4 font-semibold">Lines</th>
            <th class="text-left py-2 font-semibold">Section</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4">1</td>
            <td class="py-2 pr-4">Invulnerability check</td>
            <td class="py-2 pr-4">464</td>
            <td class="py-2">&sect;4</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">2</td>
            <td class="py-2 pr-4">Backstab detection</td>
            <td class="py-2 pr-4">477</td>
            <td class="py-2">&sect;5</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">3</td>
            <td class="py-2 pr-4">Resist/Block probability calculation</td>
            <td class="py-2 pr-4">479-488</td>
            <td class="py-2">&sect;4</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">4</td>
            <td class="py-2 pr-4">Backstab resist reduction (*0.8)</td>
            <td class="py-2 pr-4">489-492</td>
            <td class="py-2">&sect;4</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">5</td>
            <td class="py-2 pr-4"
              >Movement penalty (-0.25 resist, +10% damage, stun chance)</td
            >
            <td class="py-2 pr-4">493-503</td>
            <td class="py-2">&sect;4, &sect;5</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">6</td>
            <td class="py-2 pr-4">Manaburn resist bypass (= 0)</td>
            <td class="py-2 pr-4">504-507</td>
            <td class="py-2">&sect;4</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">7</td>
            <td class="py-2 pr-4"
              >Resist roll &mdash; if fails, attack misses</td
            >
            <td class="py-2 pr-4">508</td>
            <td class="py-2">&sect;4</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">8</td>
            <td class="py-2 pr-4"
              >Armor break (random equipment durability loss)</td
            >
            <td class="py-2 pr-4">539-563</td>
            <td class="py-2">&sect;12</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">9</td>
            <td class="py-2 pr-4">Break mezz (damage breaks CC)</td>
            <td class="py-2 pr-4">569</td>
            <td class="py-2">&sect;12</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">10</td>
            <td class="py-2 pr-4"
              >Channeling interrupt (backstab + 75% crit bonus)</td
            >
            <td class="py-2 pr-4">571-579</td>
            <td class="py-2">&sect;5, &sect;7</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">11</td>
            <td class="py-2 pr-4">Random variance (*0.9-1.1)</td>
            <td class="py-2 pr-4">581</td>
            <td class="py-2">&sect;5</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">12</td>
            <td class="py-2 pr-4">Backstab damage bonus (+10/25%)</td>
            <td class="py-2 pr-4">582-586</td>
            <td class="py-2">&sect;5</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">13</td>
            <td class="py-2 pr-4">Level difference modifier (+/-20%)</td>
            <td class="py-2 pr-4">587</td>
            <td class="py-2">&sect;5</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">14</td>
            <td class="py-2 pr-4"
              >Slayer reduction (Boss/Elite vs Player/Pet)</td
            >
            <td class="py-2 pr-4">588-596</td>
            <td class="py-2">&sect;5</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">15</td>
            <td class="py-2 pr-4">Enrage (+33-100% below 25% HP)</td>
            <td class="py-2 pr-4">597-647</td>
            <td class="py-2">&sect;5</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">16</td>
            <td class="py-2 pr-4">Damage mitigation (stat * 0.0005, cap 90%)</td
            >
            <td class="py-2 pr-4">648-675</td>
            <td class="py-2">&sect;6</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">17</td>
            <td class="py-2 pr-4">Critical hit (1.5x / 2x / 3x)</td>
            <td class="py-2 pr-4">676-735</td>
            <td class="py-2">&sect;7</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">18</td>
            <td class="py-2 pr-4">Heal on Hit (melee buff)</td>
            <td class="py-2 pr-4">736-760</td>
            <td class="py-2">&sect;11</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">19</td>
            <td class="py-2 pr-4">Damage Shield / Thorns (melee reflection)</td>
            <td class="py-2 pr-4">761-841</td>
            <td class="py-2">&sect;9</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">20</td>
            <td class="py-2 pr-4"
              >Energy generation (Warrior/Rogue) / Mana regen (Wizard)</td
            >
            <td class="py-2 pr-4">842-979</td>
            <td class="py-2">&sect;12</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">21</td>
            <td class="py-2 pr-4">Ward absorption</td>
            <td class="py-2 pr-4">981-1030</td>
            <td class="py-2">&sect;8</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">22</td>
            <td class="py-2 pr-4">Mana Shield absorption (1:1)</td>
            <td class="py-2 pr-4">1031-1061</td>
            <td class="py-2">&sect;8</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">23</td>
            <td class="py-2 pr-4">Lifetap (attacker heals)</td>
            <td class="py-2 pr-4">1062-1069</td>
            <td class="py-2">&sect;8</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">24</td>
            <td class="py-2 pr-4"
              >Radiant Aether save (full heal instead of death)</td
            >
            <td class="py-2 pr-4">1070-1078</td>
            <td class="py-2">&sect;8</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">25</td>
            <td class="py-2 pr-4"
              >Parry (50% reflect, cap 5000, victim takes 0)</td
            >
            <td class="py-2 pr-4">1081-1094</td>
            <td class="py-2">&sect;8</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">26</td>
            <td class="py-2 pr-4">Apply damage to victim HP</td>
            <td class="py-2 pr-4">1096</td>
            <td class="py-2">&mdash;</td>
          </tr>
          <tr>
            <td class="py-2 pr-4">27</td>
            <td class="py-2 pr-4">Stun / Fear / Knockback applied</td>
            <td class="py-2 pr-4">855-933</td>
            <td class="py-2">&sect;12</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- Section 17: Source Code Reference -->
  <section id="source-reference" class="space-y-4">
    <h2 class="text-2xl font-semibold border-b pb-2">
      17. Source Code Reference
    </h2>
    <p>
      Key files referenced throughout this document. Server scripts are
      decompiled from the game server and live in
      <code>server-scripts/</code> (see
      <code>docs/server-scripts-guide.md</code>).
    </p>

    <h3 class="text-lg font-semibold mt-4">Server Scripts (Formulas)</h3>
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
            <td class="py-2 pr-4"><code>server-scripts/Combat.cs</code></td>
            <td class="py-2 pr-4">349-1118, 1216-1269</td>
            <td class="py-2"
              >Core damage resolution pipeline (<code>DealDamageAt</code>),
              resist/block formulas, mitigation, crit, ward, mana shield, parry</td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>server-scripts/DamageType.cs</code></td>
            <td class="py-2 pr-4">1-9</td>
            <td class="py-2"
              >Enum: Normal, Magic, Poison, Fire, Cold, Disease</td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>server-scripts/DamageSkill.cs</code></td
            >
            <td class="py-2 pr-4">1-250</td>
            <td class="py-2"
              >Base class for damage skills; manaburn, lifetap, stun, fear
              fields</td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4"
              ><code>server-scripts/TargetDamageSkill.cs</code></td
            >
            <td class="py-2 pr-4">1-259</td>
            <td class="py-2"
              >Single-target skill <code>Apply()</code>; base damage calc,
              manaburn (Warrior/Rogue)</td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4"
              ><code>server-scripts/TargetProjectileSkill.cs</code></td
            >
            <td class="py-2 pr-4">216-220</td>
            <td class="py-2">Projectile skill; Wizard manaburn formula</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"
              ><code>server-scripts/AreaDamageSkill.cs</code></td
            >
            <td class="py-2 pr-4">1-162</td>
            <td class="py-2"
              >AoE skill <code>Apply()</code>; up to 10 targets</td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4"
              ><code>server-scripts/TargetBuffSkill.cs</code></td
            >
            <td class="py-2 pr-4">421-424</td>
            <td class="py-2">Ward HP calculation; mana shield flag</td>
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>server-scripts/Dexterity.cs</code></td>
            <td class="py-2 pr-4">67-70</td>
            <td class="py-2"
              >Dexterity contributes to accuracy: <code>dex * 0.0005</code></td
            >
          </tr>
        </tbody>
      </table>
    </div>

    <h3 class="text-lg font-semibold mt-4">Data Export (Mods)</h3>
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
              >Skill type hierarchy, damage field extraction, buff/passive bonus
              extraction</td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4"
              ><code>mods/DataExporter/Exporters/MonsterExporter.cs</code></td
            >
            <td class="py-2 pr-4">75-141</td>
            <td class="py-2">Monster stat extraction and combat flag export</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 class="text-lg font-semibold mt-4">Website Display</h3>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 pr-4 font-semibold">File</th>
            <th class="text-left py-2 font-semibold">Role</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr>
            <td class="py-2 pr-4"
              ><code>website/src/routes/monsters/[id]/+page.svelte</code></td
            >
            <td class="py-2"
              >Stat scaling display with level slider, pre-mitigation damage
              calculation</td
            >
          </tr>
          <tr>
            <td class="py-2 pr-4"><code>build-pipeline/schema.sql</code></td>
            <td class="py-2"
              >SQLite schema for monster stats (mirrors MonsterData.cs)</td
            >
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</div>
