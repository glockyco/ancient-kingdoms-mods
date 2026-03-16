<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import * as Card from "$lib/components/ui/card";
  import type { DamageFormulaKind, HealBonusKind } from "$lib/types/skills";

  // ---------------------------------------------------------------------------
  // Static formula metadata
  // ---------------------------------------------------------------------------

  const DAMAGE_FORMULA_DESC: Record<DamageFormulaKind, string> = {
    normal: "STR×1.0 + all equipment",
    ranger_melee: "STR×1.0 + all equip minus bow slot bonus",
    rogue_melee: "STR×1.0 + main-hand dmg + ⌊off-hand dmg × 0.5⌋ + other equip",
    rogue_melee_merc: "STR×1.0 + main-hand dmg + off-hand dmg + other equip",
    ranged_player: "STR×1.0 + bow + armour + DEX×1.5 minus melee slot bonus",
    ranged_player_frontal:
      "STR×1.0 + DEX×1.5 + all equip including melee weapons (unlike ranged_player)",
    ranged_merc: "STR×1.0 + bow + melee weapon + other equip + DEX×1.5",
    poison_rogue: "rogue_melee component + DEX×2.5",
    magic_spell: "INT×1.5 + wand magic stat + other magic equip",
    magic_weapon:
      "INT×1.5 + STR×1.0 + equipment, physical and magic components mitigated separately",
    magic_weapon_ranger:
      "Like magic_weapon, but the physical component excludes the bow's flat damage bonus",
    manaburn: "Current Rage or Mana × 2 (bypasses all mitigation and resist)",
    scroll: "Player Level × 15",
    monster_melee: "baseDamage(level), scales with monster level",
    monster_magic: "baseMagicDamage(level), scales with monster level",
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
    player_ranger: "base × min(WIS×3 × 0.004, 5.0), Ranger bonus",
    player_other: "base × min(WIS × 0.004, 5.0), non-Ranger",
    merc: "base × min(WIS × 0.004, 5.0), Ranger mercs do not receive the 3× multiplier",
    scroll: "Player Level × 8 (no WIS bonus)",
    none: "No bonus (monster, NPC, non-merc pet)",
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

  <div class="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm">
    For interactive per-weapon and per-class DPS modelling, see the
    <a href="/tools/combat-simulator" class="underline hover:text-foreground"
      >Auto-Attack DPS Simulator</a
    >.
  </div>

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
                ><strong>Base damage</strong>: formula-specific (see Damage
                Formulas below)</td
              >
            </tr>
            <tr class="border-b border-border/50">
              <td class="py-2 pr-4 text-muted-foreground">2</td>
              <td class="py-2"><strong>Variance</strong>: ×0.9–1.1 random</td>
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
                ><strong>Enrage</strong>: damage increases by 33% (players) or
                50–100% (monsters, random per hit), when the caster’s HP is
                below 25% (non-spell only)</td
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
                ><strong>Crit</strong>: ×1.5. Radiant Aether crits deal ×3 on
                top (×4.5 total)</td
              >
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-sm text-muted-foreground">
        <strong>Manaburn exception:</strong> bypasses steps 7–8 entirely. Damage =
        current Rage or Mana × 2.
      </p>
    </Card.Content>
  </Card.Root>

  <!-- ── §2 Damage Formulas ─────────────────────────────────────────────── -->
  <Card.Root id="damage-formulas" class="bg-muted/30">
    <Card.Header>
      <Card.Title>Damage Formulas</Card.Title>
      <Card.Description>
        Determines the base damage for step 1 of the pipeline.
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
        >Formulas for physical and magical damage reduction.</Card.Description
      >
    </Card.Header>
    <Card.Content class="space-y-5">
      <div>
        <h3 class="font-semibold mb-1">Resist Roll</h3>
        <pre
          class="text-xs bg-muted px-3 py-2 rounded overflow-x-auto">P(resist) = clamp(
  resistStat × 0.0005
  + clamp((target.level − attacker.level) × 0.005, −0.1, 0.1)
  − attacker.accuracy
, 0, 0.9)</pre>
        <p class="text-sm text-muted-foreground mt-1">
          Non-physical damage types only. A successful resist fully negates the
          hit, with no mitigation applied. Physical attacks have no resist roll,
          only a miss/block roll.
        </p>
      </div>

      <div>
        <h3 class="font-semibold mb-2">Mitigation</h3>
        <pre
          class="text-xs bg-muted px-3 py-2 rounded overflow-x-auto">reduction   = ⌈damage × clamp(mitigationStat × 0.0005, 0, 0.9)⌉
finalDamage = damage − reduction</pre>
        <p class="text-sm text-muted-foreground mt-1">
          Applies to all damage types when a hit lands (max 90% reduction). The
          mitigation stat depends on damage type:
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
          class="text-xs bg-muted px-3 py-2 rounded overflow-x-auto">P(miss) = clamp(
  clamp(baseBlock + defense×0.0001 + blockBuffs, 0, 0.8)
  + clamp((target.level − attacker.level) × 0.005, −0.1, 0.1)
  − attacker.accuracy
, 0, 0.9)</pre>
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
                <td class="py-1 pr-4">Bypasses Debuff Immunity</td>
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
          <div>
            <p class="text-sm text-muted-foreground mb-1">Scroll heals:</p>
            <pre
              class="text-xs bg-muted px-3 py-2 rounded overflow-x-auto">finalHeal = Player Level × 8</pre>
            <p class="text-xs text-muted-foreground mt-1">
              No WIS bonus applies to scroll heals.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 class="font-semibold mb-1">Critical Heal</h3>
        <p class="text-sm text-muted-foreground">
          Applies only to skills that can target other players (shown as "Others
          Only" or "Self &amp; Others" on the skill page). On crit: 90%→×2.0,
          10%→×3.0.
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
                  class="py-1 text-muted-foreground">+WIS×5</td
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
                  >Player Ranger (target_buff only, area_buff uses player_wis)</td
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
                  >Area buff + is_mercenary_skill</td
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
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">DoT poison/disease</td><td
                  class="py-1 text-muted-foreground"
                  >+DEX×1.0, reduced by Poison Resist</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">DoT melee</td><td
                  class="py-1 text-muted-foreground"
                  >+STR×0.5, reduced by defense mitigation</td
                ></tr
              >
              <tr
                ><td class="py-1 pr-4">DoT fire/cold/magic</td><td
                  class="py-1 text-muted-foreground"
                  >+INT×1.25, reduced by respective resist</td
                ></tr
              >
            </tbody>
          </table>
        </div>
        <p class="text-sm text-muted-foreground mt-2">
          <strong>DoT counter decay:</strong> 3 counters full damage, 2 → ×0.9, 1
          → ×0.8.
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
    <Card.Content class="space-y-6">
      <!-- Interval formulas -->
      <!-- Sources: Player.cs:2783, Skills.cs:673-675, Skills.cs:765-768, Skills.cs:814-815, Combat.cs:332, Monster.cs:2553, Npc.cs:625 -->
      <div>
        <h3 class="font-semibold mb-2">Interval Formulas</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left py-1 pr-4 font-medium">Model</th>
                <th class="text-left py-1 pr-4 font-medium">Caster</th>
                <th class="text-left py-1 font-medium">Interval</th>
              </tr>
            </thead>
            <tbody>
              <!-- Source: server-scripts/Player.cs:2783 -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 font-mono text-xs">player_auto</td>
                <td class="py-2 pr-4 text-muted-foreground text-xs"
                  >Player auto-attacks</td
                >
                <td class="py-2 font-mono text-xs"
                  >castTime + clamp(delay×(1−haste)/25, 0.25, 2.0)</td
                >
              </tr>
              <!-- Source: server-scripts/Skills.cs:673-675 — castTimeEnd -= spellHasteBonus × castTime -->
              <!-- Source: server-scripts/Combat.cs:332 — Mathf.Clamp(spellHaste, -0.5f, 0.5f) -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 font-mono text-xs">player_spell</td>
                <td class="py-2 pr-4 text-muted-foreground text-xs"
                  >Player spell auto-attacks</td
                >
                <td class="py-2 font-mono text-xs"
                  >castTime&times;(1&minus;spellHaste)</td
                >
              </tr>
              <!-- Source: server-scripts/Skills.cs:772 -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 font-mono text-xs">companion</td>
                <td class="py-2 pr-4 text-muted-foreground text-xs"
                  >Companions and familiars</td
                >
                <td class="py-2 font-mono text-xs">castTime + cooldown</td>
              </tr>
              <!-- Source: server-scripts/Skills.cs:765-768 -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 font-mono text-xs">merc_auto</td>
                <td class="py-2 pr-4 text-muted-foreground text-xs"
                  >Merc auto-attacks</td
                >
                <td class="py-2 font-mono text-xs"
                  >castTime + cooldown×(1−haste)</td
                >
              </tr>
              <!-- Source: server-scripts/Skills.cs:765-768 -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 font-mono text-xs">merc_spell</td>
                <td class="py-2 pr-4 text-muted-foreground text-xs"
                  >Merc spells</td
                >
                <td class="py-2 font-mono text-xs"
                  >castTime×(1−spellHaste) + cooldown</td
                >
              </tr>
              <!-- Source: server-scripts/Skills.cs:814-815 -->
              <tr>
                <td class="py-2 pr-4 font-mono text-xs">monster</td>
                <td class="py-2 pr-4 text-muted-foreground text-xs"
                  >All monster and NPC attacks</td
                >
                <td class="py-2 font-mono text-xs"
                  >Non-spell: castTime + cooldown×(1−haste)<br />Spell: castTime
                  + cooldown</td
                >
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-sm text-muted-foreground mt-2">
          Warrior and Rogue generate Rage from auto-attacks (⌊damage×0.25⌋ per
          hit, capped at the target's current HP).
        </p>
      </div>

      <!-- Haste effects -->
      <div>
        <h3 class="font-semibold mb-2">Haste Effects</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left py-1 pr-4 font-medium">Model</th>
                <th class="text-left py-1 pr-4 font-medium">Regular haste</th>
                <th class="text-left py-1 font-medium">Spell haste</th>
              </tr>
            </thead>
            <tbody>
              <!-- Source: server-scripts/Combat.cs:318 — Mathf.Clamp(num, -0.8f, 0.8f) -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 font-mono text-xs">player_auto</td>
                <td class="py-2 pr-4 text-muted-foreground text-xs"
                  >Reduces the delay term (min: 0.25 s, max: 2.0 s, cap: 80%).</td
                >
                <td class="py-2 text-muted-foreground text-xs">No effect</td>
              </tr>
              <!-- Source: server-scripts/Skills.cs:673-675, server-scripts/Combat.cs:332 -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 font-mono text-xs">player_spell</td>
                <td class="py-2 pr-4 text-muted-foreground text-xs"
                  >No effect</td
                >
                <td class="py-2 text-muted-foreground text-xs"
                  >Reduces cast time (cap: 50%).</td
                >
              </tr>
              <!-- Source: server-scripts/Pet.cs:1135 — non-merc pets always pass 0f spellHasteBonus -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 font-mono text-xs">companion</td>
                <td class="py-2 pr-4 text-muted-foreground text-xs"
                  >No effect</td
                >
                <td class="py-2 text-muted-foreground text-xs">No effect</td>
              </tr>
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 font-mono text-xs">merc_auto</td>
                <td class="py-2 pr-4 text-muted-foreground text-xs"
                  >Reduces cooldown</td
                >
                <td class="py-2 text-muted-foreground text-xs">No effect</td>
              </tr>
              <!-- Source: server-scripts/Combat.cs:332 -->
              <tr class="border-b border-border/40">
                <td class="py-2 pr-4 font-mono text-xs">merc_spell</td>
                <td class="py-2 pr-4 text-muted-foreground text-xs"
                  >No effect</td
                >
                <td class="py-2 text-muted-foreground text-xs"
                  >Reduces cast time (cap: 50%). Cooldown unaffected.</td
                >
              </tr>
              <tr>
                <td class="py-2 pr-4 font-mono text-xs">monster</td>
                <td class="py-2 pr-4 text-muted-foreground text-xs"
                  >Reduces cooldown for non-spell attacks. Spell attack
                  cooldowns are unaffected by haste</td
                >
                <!-- Source: server-scripts/Monster.cs:2553, server-scripts/Npc.cs:625 — hardcoded StartCast(skill, 0f) bypasses spell haste entirely -->
                <td class="py-2 text-muted-foreground text-xs">No effect</td>
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
          Ward absorbs first. Mana Shield absorbs any remaining damage. Ward
          pool size comes from the buff's WIS scaling (WIS×5).
        </p>
      </div>

      <div>
        <!-- Source: server-scripts/Combat.cs:266-277 (fearResistChance), 885-910 (DealDamageAt fear branch) -->
        <h3 class="font-semibold mb-1">Fear</h3>
        <p class="text-sm text-muted-foreground">
          Applies only if two independent rolls succeed: the skill's fear
          chance, then the target failing their fear resist roll. Duration is
          random between half and full fearTime. Fear resist accumulates from
          skills and equipment, capped at 100%. At 100% the target is immune.
        </p>
      </div>

      <div>
        <h3 class="font-semibold mb-1">Enrage</h3>
        <p class="text-sm text-muted-foreground">
          Non-spell skills only. When the caster's HP falls below 25%, their
          damage output increases by 33% (players) or 50–100% (monsters, random
          per hit).
        </p>
      </div>

      <div>
        <h3 class="font-semibold mb-1">Assassination</h3>
        <p class="text-sm text-muted-foreground">
          Skills with this mechanic can only be used when the target is below
          25% HP.
        </p>
      </div>

      <div>
        <h3 class="font-semibold mb-1">Cleanse</h3>
        <p class="text-sm text-muted-foreground mb-2">
          Cleanse removes debuff stacks from a target. Each debuff has a cleanse
          resistance level:
        </p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left py-1 pr-4 font-medium"
                  >Cleanse resistance</th
                >
                <th class="text-left py-1 font-medium">Behaviour</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">None</td><td
                  class="py-1 text-muted-foreground"
                  >Fully cleansable: all stacks removed in one cast</td
                ></tr
              >
              <tr class="border-b border-border/40"
                ><td class="py-1 pr-4">Partial</td><td
                  class="py-1 text-muted-foreground"
                  >One stack always removed. Each remaining stack has an
                  independent chance to resist</td
                ></tr
              >
              <tr
                ><td class="py-1 pr-4">Full</td><td
                  class="py-1 text-muted-foreground">Cannot be cleansed</td
                ></tr
              >
            </tbody>
          </table>
        </div>
        <p class="text-sm text-muted-foreground mt-2">
          Type matching: a cleanse skill only removes debuffs whose element
          matches (a poison cleanse only removes poison debuffs, etc.).
        </p>
      </div>

      <div>
        <h3 class="font-semibold mb-1">Dispel</h3>
        <p class="text-sm text-muted-foreground">
          When a Dispel skill lands on a player, all active buffs are removed
          (except the Rest buff). When it lands on a pet, all active buffs are
          removed. When it lands on a monster, each buff has an independent
          chance to resist removal.
        </p>
      </div>

      <!-- Source: server-scripts/Skills.cs:838-858 AddOrRefreshBuff -->
      <div>
        <h3 class="font-semibold mb-1">Buff &amp; Debuff Overwrite</h3>
        <p class="text-sm text-muted-foreground mb-2">
          When a buff that belongs to an overwrite group is applied, all
          existing buffs on the target in the same group expire immediately. No
          strength or level comparison is made. The overwrite is unconditional.
          For example, <a
            href="/skills/divine_shield"
            class="underline hover:text-foreground">Divine Shield</a
          >
          and
          <a
            href="/skills/shield_of_faith"
            class="underline hover:text-foreground">Shield of Faith</a
          > share the same overwrite group, so applying either one expires the other.
        </p>
        <ul
          class="text-sm text-muted-foreground list-disc list-inside space-y-1"
        >
          <li>
            Skills without an assigned overwrite group bypass this check and can
            stack freely.
          </li>
          <li>
            Multiple debuffs with different or no overwrite groups apply
            independently.
          </li>
          <li>
            Exception: when a <em>pet</em> casts an area buff, targets that already
            have any buff in the same overwrite group are skipped rather than overwritten.
            Player-cast buffs always overwrite.
          </li>
          <li>
            When multiple DoT skills are active on the same target
            simultaneously, each maintains its own counter stack independently.
          </li>
        </ul>
      </div>
    </Card.Content>
  </Card.Root>
</div>
