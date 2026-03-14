<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import * as Card from "$lib/components/ui/card";
  import type { DamageFormulaKind, HealBonusKind } from "$lib/types/skills";

  // ---------------------------------------------------------------------------
  // Static formula metadata
  // ---------------------------------------------------------------------------

  const DAMAGE_FORMULA_DESC: Record<DamageFormulaKind, string> = {
    normal: "STR×1.0 + all equipment",
    ranger_melee: "STR×1.0 + all equip − bow slot bonus",
    rogue_melee: "STR×1.0 + main-hand + ⌊50% off-hand⌋ + other equip",
    rogue_melee_merc: "STR×1.0 + main-hand + off-hand (full) + other equip",
    ranged_player: "STR×1.0 + bow+armour + DEX×1.5 − melee slot bonus",
    ranged_player_frontal:
      "STR×1.0 + all equip + DEX×1.5 (no melee subtraction)",
    ranged_merc: "STR×1.0 + bow + melee weapon + other equip + DEX×1.5",
    poison_rogue: "rogue_melee component + DEX×2.5",
    magic_spell: "INT×1.5 + wand magic stat + other magic equip",
    magic_weapon:
      "INT×1.5 + STR×1.0 + equipment (two pools, two mitigation rolls)",
    magic_weapon_ranger:
      "magic_weapon but bow.dmg excluded from physical component",
    manaburn: "Current Rage or Mana × 2 — bypasses all mitigation and resist",
    scroll: "Player Level × 15",
    monster_melee: "baseDamage(level) — level-scaled, no player stats",
    monster_magic: "baseMagicDamage(level) — level-scaled, no player stats",
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
    magic_weapon: "Magic",
    magic_weapon_ranger: "Magic",
    manaburn: "Special",
    scroll: "Special",
    monster_melee: "Monster",
    monster_magic: "Monster",
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
    "magic_weapon",
    "magic_weapon_ranger",
    "manaburn",
    "scroll",
    "monster_melee",
    "monster_magic",
  ];

  const HEAL_BONUS_DESC: Record<HealBonusKind, string> = {
    player_ranger: "base × min(WIS×3 × 0.004, 5.0) — Ranger target-heal bonus",
    player_other: "base × min(WIS × 0.004, 5.0) — Non-Ranger player",
    merc: "base × min(WIS × 0.004, 5.0) — Merc's own WIS (no ×3 for Ranger merc)",
    scroll: "Player Level × 8 — no WIS",
    none: "No bonus — monster, NPC, non-merc pet",
  };
</script>

<svelte:head>
  <title>Combat Mechanics - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="Complete reference for Ancient Kingdoms combat mechanics — damage pipeline, formula kinds, resistance and mitigation, healing, buff scaling, debuff mechanics, timing and haste, and special mechanics."
  />
</svelte:head>

<div class="container mx-auto p-8 space-y-8 max-w-4xl">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics" },
      { label: "Combat" },
    ]}
  />

  <h1 class="text-4xl font-bold">Combat Mechanics</h1>

  <nav aria-label="Page sections" class="text-sm text-muted-foreground">
    <ul class="flex flex-wrap gap-x-4 gap-y-1">
      <li>
        <a href="#damage-pipeline" class="hover:text-foreground hover:underline"
          >Damage Pipeline</a
        >
      </li>
      <li>
        <a href="#damage-formulas" class="hover:text-foreground hover:underline"
          >Damage Formulas</a
        >
      </li>
      <li>
        <a href="#resistance" class="hover:text-foreground hover:underline"
          >Resistance &amp; Mitigation</a
        >
      </li>
      <li>
        <a href="#healing" class="hover:text-foreground hover:underline"
          >Healing</a
        >
      </li>
      <li>
        <a href="#buffs" class="hover:text-foreground hover:underline"
          >Buff Scaling</a
        >
      </li>
      <li>
        <a href="#debuffs" class="hover:text-foreground hover:underline"
          >Debuff Mechanics</a
        >
      </li>
      <li>
        <a href="#timing" class="hover:text-foreground hover:underline"
          >Timing &amp; Haste</a
        >
      </li>
      <li>
        <a href="#special" class="hover:text-foreground hover:underline"
          >Special Mechanics</a
        >
      </li>
    </ul>
  </nav>

  <!-- ── §1 Damage Pipeline ─────────────────────────────────────────────── -->
  <Card.Root id="damage-pipeline" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Damage Pipeline</Card.Title>
      <Card.Description
        >Steps applied in order to every damaging hit.</Card.Description
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
                ><strong>Base damage</strong> — formula-specific (see Damage Formulas
                below)</td
              >
            </tr>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-4 text-muted-foreground">2</td>
              <td class="py-2"><strong>Variance</strong> — ×0.9–1.1 random</td>
            </tr>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-4 text-muted-foreground">3</td>
              <td class="py-2"
                ><strong>Backstab</strong> — +10% (+25% with Improved Backstab) +
                1 flat, if attacker is behind target</td
              >
            </tr>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-4 text-muted-foreground">4</td>
              <td class="py-2"
                ><strong>Level difference</strong> — ±2%/level, max ±20%</td
              >
            </tr>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-4 text-muted-foreground">5</td>
              <td class="py-2"
                ><strong>Slayer reduction</strong> — −(Slayer level × 10%)</td
              >
            </tr>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-4 text-muted-foreground">6</td>
              <td class="py-2"
                ><strong>Enrage</strong> — +33% player / +50–100% monster, when caster
                is below 25% HP (non-spell only)</td
              >
            </tr>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-4 text-muted-foreground">7</td>
              <td class="py-2">
                <strong>Physical mitigation</strong> —
                <code class="font-mono text-xs bg-muted px-1 rounded"
                  >damage − ⌈damage × clamp(defense × 0.0005, 0, 0.9)⌉</code
                > (max 90%)
              </td>
            </tr>
            <tr>
              <td class="py-2 pr-4 text-muted-foreground">8</td>
              <td class="py-2"
                ><strong>Crit</strong> — 95%→×1.5, 5%→×2.0; Radiant Aether stacks
                ×3 on top</td
              >
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-sm text-muted-foreground">
        <strong>Manaburn exception:</strong> bypasses steps 7–8 entirely. Damage =
        current Rage or Mana × 2.
      </p>
      <div
        class="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm"
      >
        For interactive per-weapon DPS modelling, see the
        <a
          href="/tools/combat-simulator"
          class="underline hover:text-foreground">Auto-Attack DPS Simulator</a
        >.
      </div>

      <!-- Worked Example -->
      <div>
        <h3 class="font-semibold mb-2">Worked Example</h3>
        <p class="text-sm text-muted-foreground mb-3">
          Warrior · Level 50 · STR 700 · haste 50% vs. Skullreaver (delay 25,
          dmg 500, STR-bonus 50) against a Level 50 enemy (defense 1000),
          frontal attack, above 25% HP.
        </p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left py-1 pr-4 font-medium">Step</th>
                <th class="text-left py-1 pr-4 font-medium">Operation</th>
                <th class="text-left py-1 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4">Base damage</td>
                <td class="py-1 pr-4 font-mono text-xs">(700+50)×1.0 + 500</td>
                <td class="py-1 text-muted-foreground">1250</td>
              </tr>
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4">Variance ×0.9–1.1</td>
                <td class="py-1 pr-4 text-muted-foreground text-xs"
                  >range: 1125–1375</td
                >
                <td class="py-1 text-muted-foreground">1250 (midpoint)</td>
              </tr>
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4">Backstab</td>
                <td class="py-1 pr-4 text-muted-foreground text-xs"
                  >frontal attack</td
                >
                <td class="py-1 text-muted-foreground">1250</td>
              </tr>
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4">Level difference</td>
                <td class="py-1 pr-4 text-muted-foreground text-xs"
                  >same level (±0%)</td
                >
                <td class="py-1 text-muted-foreground">1250</td>
              </tr>
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4">Slayer</td>
                <td class="py-1 pr-4 text-muted-foreground text-xs">none</td>
                <td class="py-1 text-muted-foreground">1250</td>
              </tr>
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4">Enrage</td>
                <td class="py-1 pr-4 text-muted-foreground text-xs"
                  >above 25% HP</td
                >
                <td class="py-1 text-muted-foreground">1250</td>
              </tr>
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4">Physical mitigation</td>
                <td class="py-1 pr-4 font-mono text-xs"
                  >ratio=clamp(1000×0.0005,0,0.9)=0.50; −⌈1250×0.50⌉=−625</td
                >
                <td class="py-1 font-semibold">625</td>
              </tr>
              <tr>
                <td class="py-1 pr-4">Critical hit</td>
                <td class="py-1 pr-4 text-muted-foreground text-xs"
                  >no crit → 625; ×1.5 → 937; ×2.0 → 1250</td
                >
                <td class="py-1 text-muted-foreground">625</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Source: server-scripts/Player.cs:2783 -->
        <p class="text-sm text-muted-foreground mt-2">
          At 50% haste, interval = 0.5 + clamp(25×0.5/25, 0.25, 2.0) = 1.0 s → <strong
            >625 DPS</strong
          >
          (no crit) / <strong>~953 DPS</strong>
          (expected with crits).
        </p>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- ── §2 Damage Formulas ─────────────────────────────────────────────── -->
  <Card.Root id="damage-formulas" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Damage Formulas</Card.Title>
      <Card.Description>
        Dispatched per-caster from skillMechanics.ts. A skill used by multiple
        class/mode combinations may appear under more than one formula.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-6">
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-1 pr-4 font-medium">Category</th>
              <th class="text-left py-1 pr-4 font-medium">Kind</th>
              <th class="text-left py-1 font-medium">Formula</th>
            </tr>
          </thead>
          <tbody>
            {#each DAMAGE_FORMULA_ORDER as kind (kind)}
              <tr class="border-b border-border/40 hover:bg-muted/20">
                <td class="py-1 pr-4 text-muted-foreground text-sm"
                  >{DAMAGE_FORMULA_GROUP_LABEL[kind]}</td
                >
                <td class="py-1 pr-4 font-mono text-xs">{kind}</td>
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
        >Combat.cs formulas for physical and magical damage reduction.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-5">
      <div>
        <h3 class="font-semibold mb-1">Physical Mitigation</h3>
        <pre
          class="text-xs bg-muted px-3 py-2 rounded overflow-x-auto">reduction   = ⌈damage × clamp(defense × 0.0005, 0, 0.9)⌉
finalDamage = damage − reduction</pre>
        <p class="text-sm text-muted-foreground mt-1">
          Max 90% reduction at defense ≥ 1800.
        </p>
      </div>

      <div>
        <h3 class="font-semibold mb-1">Physical Block / Miss</h3>
        <pre
          class="text-xs bg-muted px-3 py-2 rounded overflow-x-auto">P(miss) = clamp(
  clamp(baseBlock + defense×0.0001 + blockBuffs, 0, 0.8)
  + clamp((target.level − attacker.level) × 0.005, −0.1, 0.1)
  − attacker.accuracy
, 0, 0.9)</pre>
      </div>

      <div>
        <h3 class="font-semibold mb-1">Magic / Elemental Resist</h3>
        <pre
          class="text-xs bg-muted px-3 py-2 rounded overflow-x-auto">P(resist) = clamp(
  resistStat × 0.0005
  + clamp((target.level − attacker.level) × 0.005, −0.1, 0.1)
  − attacker.accuracy
, 0, 0.9)</pre>
        <p class="text-sm text-muted-foreground mt-1">
          <code class="font-mono text-xs bg-muted px-1 rounded">resistStat</code
          > by element: magicResist (magic/fire/cold/disease default), poisonResist,
          fireResist, coldResist, diseaseResist, defense (melee debuff).
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
                  >Resist chance −0.25; damage +10%</td
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
                <td class="py-1 pr-4"
                  ><code class="font-mono text-xs bg-muted px-1 rounded"
                    >isDecreaseResistsSkill</code
                  ></td
                >
                <td class="py-1 text-muted-foreground">Resist chance −0.30</td>
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

  <!-- ── §4 Healing ────────────────────────────────────────────────────── -->
  <Card.Root id="healing" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Healing</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-5">
      <div>
        <h3 class="font-semibold mb-1">WIS Heal Bonus</h3>
        <pre
          class="text-xs bg-muted px-3 py-2 rounded overflow-x-auto">finalHeal = baseHeal + round(baseHeal × min(WIS × 0.004, 5.0))</pre>
        <p class="text-sm text-muted-foreground mt-1">
          Ranger (TargetBuffSkill path): WIS multiplier is ×3. Scroll heals:
          bonus = Player Level × 8 (replaces WIS calculation).
        </p>
      </div>

      <div>
        <h3 class="font-semibold mb-1">Critical Heal</h3>
        <p class="text-sm text-muted-foreground">
          Applies only when <code
            class="font-mono text-xs bg-muted px-1 rounded"
            >can_heal_others</code
          > is true. On crit: 90%→×2.0, 10%→×3.0.
        </p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-1 pr-4 font-medium">Kind</th>
              <th class="text-left py-1 font-medium">Formula Applied</th>
            </tr>
          </thead>
          <tbody>
            {#each Object.entries(HEAL_BONUS_DESC) as [kind, desc] (kind)}
              <tr class="border-b border-border/40 hover:bg-muted/20">
                <td class="py-1 pr-4 font-mono text-xs">{kind}</td>
                <td class="py-1 text-muted-foreground">{desc}</td>
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
        >How WIS (or Player Level) scales buff field values.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-5">
      <div>
        <h3 class="font-semibold mb-2">Per-Field WIS Multipliers</h3>
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
                  class="py-1 text-muted-foreground">+WIS×2</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Defense</td><td
                  class="py-1 text-muted-foreground">+WIS×0.15</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Magic Resist</td><td
                  class="py-1 text-muted-foreground">+WIS×0.15</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Ward</td><td
                  class="py-1 text-muted-foreground"
                  >+WIS×5 (bonusAttribute becomes the full ward pool)</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Damage Shield</td><td
                  class="py-1 text-muted-foreground">+WIS×0.75</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Elemental Resists</td><td
                  class="py-1 text-muted-foreground">+WIS×0.15 each</td
                ></tr
              >
              <tr
                ><td class="py-1 pr-4">Heal-over-Time</td><td
                  class="py-1 text-muted-foreground"
                  >base × (1 + min(WIS×0.004, 3.0))</td
                ></tr
              >
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 class="font-semibold mb-2">Attribute Source Dispatch</h3>
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
                ><td class="py-1 pr-4 font-mono text-xs">player_wis</td><td
                  class="py-1 text-muted-foreground"
                  >Player non-Ranger (target_buff + area_buff)</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4 font-mono text-xs">player_ranger_wis</td
                ><td class="py-1 text-muted-foreground"
                  >Player Ranger (target_buff only; area_buff uses player_wis)</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4 font-mono text-xs">merc_wis</td><td
                  class="py-1 text-muted-foreground">Mercenary pets</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4 font-mono text-xs">player_charisma</td><td
                  class="py-1 text-muted-foreground"
                  >Area buff + is_mercenary_skill=true (Leadership only)</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4 font-mono text-xs">player_level</td><td
                  class="py-1 text-muted-foreground"
                  >Scroll: bonusAttribute = Player Level × 8</td
                ></tr
              >
              <tr
                ><td class="py-1 pr-4 font-mono text-xs">none</td><td
                  class="py-1 text-muted-foreground"
                  >Monster/NPC (bonusAttribute = 0)</td
                ></tr
              >
            </tbody>
          </table>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- ── §6 Debuff Mechanics ────────────────────────────────────────────── -->
  <Card.Root id="debuffs" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Debuff Mechanics</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-5">
      <div>
        <h3 class="font-semibold mb-2">Attribute Dispatch</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left py-1 pr-4 font-medium">Condition</th>
                <th class="text-left py-1 font-medium">Attribute</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4"
                  ><code class="font-mono text-xs bg-muted px-1 rounded"
                    >is_melee_debuff</code
                  ></td
                >
                <td class="py-1 text-muted-foreground">STR</td>
              </tr>
              <tr class="border-b border-border/40">
                <td class="py-1 pr-4">
                  <code class="font-mono text-xs bg-muted px-1 rounded"
                    >is_poison_debuff</code
                  >
                  or
                  <code class="font-mono text-xs bg-muted px-1 rounded"
                    >is_disease_debuff</code
                  >
                </td>
                <td class="py-1 text-muted-foreground">DEX</td>
              </tr>
              <tr>
                <td class="py-1 pr-4"
                  >All others (fire, cold, magic, untagged)</td
                >
                <td class="py-1 text-muted-foreground">INT</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 class="font-semibold mb-2">Per-Field Scaling</h3>
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
                  >−STR×0.4 (melee) or −INT×0.4 (magic)</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Magic Resist reduction</td><td
                  class="py-1 text-muted-foreground">−INT×0.4</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Elemental Resist reductions</td><td
                  class="py-1 text-muted-foreground">−INT×0.4 each</td
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
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">DoT poison/disease</td><td
                  class="py-1 text-muted-foreground"
                  >+DEX×1.0; reduced by poisonResist</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">DoT melee</td><td
                  class="py-1 text-muted-foreground"
                  >+STR×0.5; reduced by defense mitigation</td
                ></tr
              >
              <tr
                ><td class="py-1 pr-4">DoT fire/cold/magic</td><td
                  class="py-1 text-muted-foreground"
                  >+INT×1.25; reduced by respective resist</td
                ></tr
              >
            </tbody>
          </table>
        </div>
        <p class="text-sm text-muted-foreground mt-2">
          <strong>DoT counter decay:</strong> 3 counters → full damage, 2 → ×0.9,
          1 → ×0.8.
        </p>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- ── §7 Timing & Haste ──────────────────────────────────────────────── -->
  <Card.Root id="timing" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Timing &amp; Haste</Card.Title>
      <Card.Description
        >How attack interval and haste interact per caster model.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-5">
      <!-- Comparison table: all 5 models side-by-side -->
      <!-- Sources: Player.cs:2783, Skills.cs:673-675, Skills.cs:765-768, Skills.cs:814-815 -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-1 pr-4 font-medium">Model</th>
              <th class="text-left py-1 pr-4 font-medium">Who</th>
              <th class="text-left py-1 pr-4 font-medium">Interval</th>
              <th class="text-left py-1 pr-4 font-medium">Regular haste</th>
              <th class="text-left py-1 font-medium">Spell haste</th>
            </tr>
          </thead>
          <tbody>
            <!-- Source: server-scripts/Player.cs:2783 -->
            <tr class="border-b border-border/40 align-top">
              <td class="py-2 pr-4 font-mono text-xs">player_auto</td>
              <td class="py-2 pr-4 text-muted-foreground text-xs"
                >Player auto-attacks (non-spell, weapon required). Warrior/Rogue
                generate Rage (⌊damage×0.25⌋ per hit, capped at target current
                HP); all other classes use Mana.</td
              >
              <td class="py-2 pr-4 font-mono text-xs"
                >castTime + clamp(delay×(1−h)/25, 0.25, 2.0)</td
              >
              <td class="py-2 pr-4 text-muted-foreground text-xs"
                >Reduces delay term; floor 0.25 s, cap 2.0 s</td
              >
              <td class="py-2 text-muted-foreground text-xs">No effect</td>
            </tr>
            <!-- Source: server-scripts/Skills.cs:673-675 -->
            <tr class="border-b border-border/40 align-top">
              <td class="py-2 pr-4 font-mono text-xs">player_skill</td>
              <td class="py-2 pr-4 text-muted-foreground text-xs"
                >Player non-weapon skills; player spells; companions; familiars</td
              >
              <td class="py-2 pr-4 font-mono text-xs"
                >Non-spell: castTime + cooldown<br />Spell: castTime×(1−sh) +
                cooldown</td
              >
              <td class="py-2 pr-4 text-muted-foreground text-xs">No effect</td>
              <td class="py-2 text-muted-foreground text-xs"
                >Spells: reduces cast time only. Companions/familiars: no player
                stats → neither haste applies</td
              >
            </tr>
            <!-- Source: server-scripts/Skills.cs:765-768 -->
            <tr class="border-b border-border/40 align-top">
              <td class="py-2 pr-4 font-mono text-xs">merc_auto</td>
              <td class="py-2 pr-4 text-muted-foreground text-xs"
                >Merc auto-attacks (non-spell)</td
              >
              <td class="py-2 pr-4 font-mono text-xs"
                >castTime + cooldown×(1−h)</td
              >
              <td class="py-2 pr-4 text-muted-foreground text-xs"
                >Reduces cooldown</td
              >
              <td class="py-2 text-muted-foreground text-xs">No effect</td>
            </tr>
            <!-- Source: server-scripts/Skills.cs:765-768 -->
            <tr class="border-b border-border/40 align-top">
              <td class="py-2 pr-4 font-mono text-xs">merc_skill</td>
              <td class="py-2 pr-4 text-muted-foreground text-xs"
                >Merc spells</td
              >
              <td class="py-2 pr-4 font-mono text-xs"
                >castTime×(1−sh) + cooldown</td
              >
              <td class="py-2 pr-4 text-muted-foreground text-xs">No effect</td>
              <td class="py-2 text-muted-foreground text-xs"
                >Reduces cast time; cooldown is NOT reduced by either haste type
                (Skills.cs <code class="bg-muted px-0.5 rounded">!isSpell</code>
                gate)</td
              >
            </tr>
            <!-- Source: server-scripts/Skills.cs:814-815 -->
            <tr class="align-top">
              <td class="py-2 pr-4 font-mono text-xs">monster</td>
              <td class="py-2 pr-4 text-muted-foreground text-xs"
                >All monster/NPC attacks</td
              >
              <td class="py-2 pr-4 font-mono text-xs"
                >castTime + cooldown×(1−h)</td
              >
              <td class="py-2 pr-4 text-muted-foreground text-xs"
                >Reduces cooldown unconditionally — even when
                <code class="bg-muted px-0.5 rounded">is_spell=true</code>
                (Monster.cs/Npc.cs
                <code class="bg-muted px-0.5 rounded"
                  >FinishCastMeleeAttackMonster</code
                >)</td
              >
              <td class="py-2 text-muted-foreground text-xs"
                >No effect — monsters have no spell haste stat</td
              >
            </tr>
          </tbody>
        </table>
      </div>

      <div
        class="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm"
      >
        For interactive per-class interval and DPS modelling, see the
        <a
          href="/tools/combat-simulator"
          class="underline hover:text-foreground">Auto-Attack DPS Simulator</a
        >.
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
        <h3 class="font-semibold mb-1">Aggro</h3>
        <pre
          class="text-xs bg-muted px-3 py-2 rounded overflow-x-auto">added = skillAggro + (skillAggro > 0 ? caster.maxHP : 0)
       + damage
       + round(stunChance × stunTime × 10)
       + round(fearChance × fearTime × 10)</pre>
        <p class="text-sm text-muted-foreground mt-1">
          Capped at target's current HP.
        </p>
      </div>

      <div>
        <h3 class="font-semibold mb-1">Ward &amp; Mana Shield Priority</h3>
        <p class="text-sm text-muted-foreground">
          Ward absorbs first; Mana Shield absorbs the remainder. Ward pool =
          buff's bonusAttribute (WIS×5 from buff scaling).
        </p>
      </div>

      <div>
        <h3 class="font-semibold mb-1">Enrage</h3>
        <p class="text-sm text-muted-foreground">
          Non-spell skills only. Player: +33%. Monster: +50–100% random.
          Triggers when caster is below 25% HP.
        </p>
      </div>

      <div>
        <h3 class="font-semibold mb-1">Assassination</h3>
        <p class="text-sm text-muted-foreground">
          Pre-cast check — skill is only usable when target is below 25% HP.
          Verified per <code class="font-mono text-xs bg-muted px-1 rounded"
            >is_assassination_skill</code
          > flag.
        </p>
      </div>

      <div>
        <h3 class="font-semibold mb-1">Cleanse</h3>
        <p class="text-sm text-muted-foreground mb-2">
          Governed by <code class="font-mono text-xs bg-muted px-1 rounded"
            >prob_ignore_cleanse</code
          > on each debuff:
        </p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left py-1 pr-4 font-medium">Value</th>
                <th class="text-left py-1 font-medium">Behaviour</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">&lt;= 0</td><td
                  class="py-1 text-muted-foreground"
                  >Always removed (3 counters stripped in one cast)</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">0 &lt; p &lt; 1</td><td
                  class="py-1 text-muted-foreground"
                  >1 guaranteed + 2 independent probability rolls</td
                ></tr
              >
              <tr
                ><td class="py-1 pr-4">&gt;= 1</td><td
                  class="py-1 text-muted-foreground">Cannot be cleansed</td
                ></tr
              >
            </tbody>
          </table>
        </div>
        <p class="text-sm text-muted-foreground mt-2">
          Type matching: a cleanse skill only strips debuffs whose type flag
          matches (poison cleanse only removes poison debuffs, etc.).
        </p>
      </div>

      <div>
        <h3 class="font-semibold mb-1">Dispel</h3>
        <p class="text-sm text-muted-foreground">
          Players: all buffs removed (except Rest buff). Pets: all buffs
          removed. Monsters: each buff rolls independently against its
          <code class="font-mono text-xs bg-muted px-1 rounded"
            >prob_ignore_cleanse</code
          >.
        </p>
      </div>

      <!-- Source: server-scripts/Skills.cs:838-858 AddOrRefreshBuff -->
      <div>
        <h3 class="font-semibold mb-1">Buff &amp; Debuff Overwrite</h3>
        <p class="text-sm text-muted-foreground mb-2">
          Stacking is governed by <code
            class="font-mono text-xs bg-muted px-1 rounded">buff_category</code
          >. When a buff with a non-empty
          <code class="font-mono text-xs bg-muted px-1 rounded"
            >buff_category</code
          >
          is applied, all existing buffs sharing that category have their expiry
          set to 0 (expire immediately); the new buff is then added. Example:
          <em>Divine Shield</em>
          and <em>Shield of Faith</em> share
          <code class="font-mono text-xs bg-muted px-1 rounded"
            >"Cleric AC Buff"</code
          > — applying the higher-tier skill expires the lower.
        </p>
        <ul
          class="text-sm text-muted-foreground list-disc list-inside space-y-1"
        >
          <li>
            Skills with a null or empty <code
              class="font-mono text-xs bg-muted px-1 rounded"
              >buff_category</code
            > bypass the overwrite check and stack freely.
          </li>
          <li>Multiple debuffs of different categories apply independently.</li>
          <li>
            DoT effects use the counter-decay model from §6 — they do not stack
            multiplicatively.
          </li>
        </ul>
      </div>
    </Card.Content>
  </Card.Root>
</div>
