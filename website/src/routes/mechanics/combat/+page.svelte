<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import * as Card from "$lib/components/ui/card";
  import type {
    DamageFormulaKind,
    HealBonusKind,
    BuffBonusAttrSource,
    DebuffBonusAttrKind,
    TimingModel,
  } from "$lib/types/skills";
  import type { SkillEntry } from "./+page.server";

  let { data } = $props();

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

  const BUFF_ATTR_DESC: Record<BuffBonusAttrSource, string> = {
    player_ranger_wis:
      "WIS×3 (TargetBuffSkill only — area_buff uses player_wis)",
    player_wis: "WIS (non-Ranger TargetBuffSkill, or any AreaBuffSkill player)",
    merc_wis: "Merc's own WIS",
    player_charisma:
      "Player CHA (AreaBuffSkill + is_mercenary_skill=true — Leadership only)",
    player_level: "Scroll: Player Level × 8",
    none: "Monster/NPC: bonus = 0",
  };

  const DEBUFF_ATTR_DESC: Record<DebuffBonusAttrKind, string> = {
    str: "STR (is_melee_debuff=true)",
    dex: "DEX (is_poison_debuff or is_disease_debuff)",
    int: "INT (default — magic/elemental debuff)",
    scroll: "Player Level × 8",
    none: "Monster/NPC/companion: bonus = 0",
  };

  const TIMING_MODEL_DESC: Record<TimingModel, string> = {
    player_auto: "interval = castTime + clamp(delay×(1−haste)/25, 0.25, 2.0)",
    player_skill:
      "interval = castTime + cooldown (spell: castTime reduced by spellHaste)",
    merc_auto: "interval = castTime + cooldown×(1−haste)",
    merc_skill:
      "interval = castTime + cooldown (NOT haste-reduced for spell mercs)",
    monster: "interval = castTime + cooldown×(1−haste)",
  };

  // ---------------------------------------------------------------------------
  // Pre-computed display arrays — all lookups happen here, not inside {#each}.
  // This runs identically during SSR and hydration; data is embedded in HTML.
  // ---------------------------------------------------------------------------

  interface DamageRow {
    kind: DamageFormulaKind;
    groupLabel: string;
    desc: string;
    skills: SkillEntry[];
  }

  interface HealRow {
    kind: HealBonusKind;
    desc: string;
    skills: SkillEntry[];
  }

  interface BuffRow {
    kind: BuffBonusAttrSource;
    desc: string;
    skills: SkillEntry[];
  }

  interface DebuffRow {
    kind: DebuffBonusAttrKind;
    desc: string;
    skills: SkillEntry[];
  }

  interface TimingRow {
    kind: TimingModel;
    desc: string;
    skills: SkillEntry[];
  }

  const damageRows: DamageRow[] = DAMAGE_FORMULA_ORDER.map((kind) => ({
    kind,
    groupLabel: DAMAGE_FORMULA_GROUP_LABEL[kind],
    desc: DAMAGE_FORMULA_DESC[kind],
    skills:
      (data.byDamageFormula ?? []).find((g) => g.kind === kind)?.skills ?? [],
  }));

  const healRows: HealRow[] = $derived(
    (data.byHealBonus ?? []).map((g) => ({
      kind: g.kind,
      desc: HEAL_BONUS_DESC[g.kind],
      skills: g.skills,
    })),
  );

  const buffRows: BuffRow[] = $derived(
    (data.byBuffAttr ?? []).map((g) => ({
      kind: g.kind,
      desc: BUFF_ATTR_DESC[g.kind],
      skills: g.skills,
    })),
  );

  const debuffRows: DebuffRow[] = $derived(
    (data.byDebuffAttr ?? []).map((g) => ({
      kind: g.kind,
      desc: DEBUFF_ATTR_DESC[g.kind],
      skills: g.skills,
    })),
  );

  const timingRows: TimingRow[] = $derived(
    (data.byTimingModel ?? []).map((g) => ({
      kind: g.kind,
      desc: TIMING_MODEL_DESC[g.kind],
      skills: g.skills,
    })),
  );
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
      {#each damageRows as f (f.kind)}
        <div>
          <div class="flex items-baseline gap-3 mb-1">
            <span
              class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >{f.groupLabel}</span
            >
            <span class="font-semibold font-mono text-sm">{f.kind}</span>
          </div>
          <p class="text-sm text-muted-foreground mb-2">{f.desc}</p>
          {#if f.skills.length > 0}
            <div class="overflow-x-auto">
              <table class="w-full text-sm border-collapse">
                <thead>
                  <tr class="border-b border-border">
                    <th class="text-left py-1 pr-4 font-medium">Skill</th>
                    <th class="text-left py-1 pr-4 font-medium">Casters</th>
                  </tr>
                </thead>
                <tbody>
                  {#each f.skills as s (s.id)}
                    <tr class="border-b border-border/40 hover:bg-muted/20">
                      <td class="py-1 pr-4"
                        ><a
                          href="/skills/{s.id}"
                          class="hover:underline text-foreground">{s.name}</a
                        ></td
                      >
                      <td class="py-1 pr-4 text-muted-foreground text-xs"
                        >{s.casterLabels.join(", ")}</td
                      >
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <p class="text-xs text-muted-foreground italic">
              No skills use this formula.
            </p>
          {/if}
        </div>
      {/each}
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

      <div class="space-y-4">
        <h3 class="font-semibold">Skills by Heal Bonus Kind</h3>
        {#each healRows as f (f.kind)}
          <div>
            <p class="font-semibold font-mono text-sm mb-1">{f.kind}</p>
            <p class="text-sm text-muted-foreground mb-2">{f.desc}</p>
            {#if f.skills.length > 0}
              <div class="overflow-x-auto">
                <table class="w-full text-sm border-collapse">
                  <thead>
                    <tr class="border-b border-border">
                      <th class="text-left py-1 pr-4 font-medium">Skill</th>
                      <th class="text-left py-1 pr-4 font-medium">Casters</th>
                      <th class="text-left py-1 font-medium">Can Crit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each f.skills as s (s.id)}
                      <tr class="border-b border-border/40 hover:bg-muted/20">
                        <td class="py-1 pr-4"
                          ><a
                            href="/skills/{s.id}"
                            class="hover:underline text-foreground">{s.name}</a
                          ></td
                        >
                        <td class="py-1 pr-4 text-muted-foreground text-xs"
                          >{s.casterLabels.join(", ")}</td
                        >
                        <td class="py-1 text-muted-foreground"
                          >{s.canCrit ? "yes" : "no"}</td
                        >
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>
        {/each}
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

      <div class="space-y-4">
        <h3 class="font-semibold">Skills by Buff Attribute Source</h3>
        {#each buffRows as f (f.kind)}
          <div>
            <p class="font-semibold font-mono text-sm mb-1">{f.kind}</p>
            <p class="text-sm text-muted-foreground mb-2">{f.desc}</p>
            {#if f.skills.length > 0}
              <div class="overflow-x-auto">
                <table class="w-full text-sm border-collapse">
                  <thead>
                    <tr class="border-b border-border">
                      <th class="text-left py-1 pr-4 font-medium">Skill</th>
                      <th class="text-left py-1 pr-4 font-medium">Casters</th>
                      <th class="text-left py-1 font-medium">Area Buff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each f.skills as s (s.id)}
                      <tr class="border-b border-border/40 hover:bg-muted/20">
                        <td class="py-1 pr-4"
                          ><a
                            href="/skills/{s.id}"
                            class="hover:underline text-foreground">{s.name}</a
                          ></td
                        >
                        <td class="py-1 pr-4 text-muted-foreground text-xs"
                          >{s.casterLabels.join(", ")}</td
                        >
                        <td class="py-1 text-muted-foreground"
                          >{s.isAreaBuff ? "yes" : "no"}</td
                        >
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>
        {/each}
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

      <div class="space-y-4">
        <h3 class="font-semibold">Skills by Debuff Attribute Kind</h3>
        {#each debuffRows as f (f.kind)}
          <div>
            <p class="font-semibold font-mono text-sm mb-1">{f.kind}</p>
            <p class="text-sm text-muted-foreground mb-2">{f.desc}</p>
            {#if f.skills.length > 0}
              <div class="overflow-x-auto">
                <table class="w-full text-sm border-collapse">
                  <thead>
                    <tr class="border-b border-border">
                      <th class="text-left py-1 pr-4 font-medium">Skill</th>
                      <th class="text-left py-1 pr-4 font-medium">Casters</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each f.skills as s (s.id)}
                      <tr class="border-b border-border/40 hover:bg-muted/20">
                        <td class="py-1 pr-4"
                          ><a
                            href="/skills/{s.id}"
                            class="hover:underline text-foreground">{s.name}</a
                          ></td
                        >
                        <td class="py-1 pr-4 text-muted-foreground text-xs"
                          >{s.casterLabels.join(", ")}</td
                        >
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>
        {/each}
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
      <div class="space-y-4">
        <h3 class="font-semibold">Models</h3>
        <div>
          <p class="font-mono text-sm font-semibold">player_auto</p>
          <pre
            class="text-xs bg-muted px-3 py-2 rounded mt-1 overflow-x-auto">interval = castTime + clamp(weaponDelay × (1 − haste) / 25, 0.25, 2.0)</pre>
          <p class="text-sm text-muted-foreground mt-1">
            Warrior/Rogue generate Rage (⌊damage×0.25⌋ per hit, capped at target
            current HP). All other classes use Mana.
          </p>
        </div>
        <div>
          <p class="font-mono text-sm font-semibold">player_skill</p>
          <pre
            class="text-xs bg-muted px-3 py-2 rounded mt-1 overflow-x-auto">interval = castTime + cooldown
// isSpell only: castTimeEnd −= spellHaste × castTime</pre>
        </div>
        <div>
          <p class="font-mono text-sm font-semibold">merc_auto</p>
          <pre
            class="text-xs bg-muted px-3 py-2 rounded mt-1 overflow-x-auto">interval = castTime + cooldown × (1 − haste)</pre>
          <p class="text-sm text-muted-foreground mt-1">
            Haste reduces cooldown, not a weapon delay.
          </p>
        </div>
        <div>
          <p class="font-mono text-sm font-semibold">merc_skill</p>
          <pre
            class="text-xs bg-muted px-3 py-2 rounded mt-1 overflow-x-auto">interval = castTime + cooldown</pre>
          <p class="text-sm text-muted-foreground mt-1">
            Cooldown is NOT haste-reduced for spell mercs.
          </p>
        </div>
        <div>
          <p class="font-mono text-sm font-semibold">monster</p>
          <pre
            class="text-xs bg-muted px-3 py-2 rounded mt-1 overflow-x-auto">interval = castTime + cooldown × (1 − haste)</pre>
          <p class="text-sm text-muted-foreground mt-1">
            FinishCastMeleeAttackMonster haste-reduces unconditionally
            regardless of isSpell — same model for Monster.cs and Npc.cs.
          </p>
        </div>
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

      <div class="space-y-4">
        <h3 class="font-semibold">Skills by Timing Model</h3>
        {#each timingRows as f (f.kind)}
          <div>
            <p class="font-semibold font-mono text-sm mb-1">{f.kind}</p>
            <p class="text-sm text-muted-foreground mb-2">{f.desc}</p>
            {#if f.skills.length > 0}
              <div class="overflow-x-auto">
                <table class="w-full text-sm border-collapse">
                  <thead>
                    <tr class="border-b border-border">
                      <th class="text-left py-1 pr-4 font-medium">Skill</th>
                      <th class="text-left py-1 pr-4 font-medium">Casters</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each f.skills as s (s.id)}
                      <tr class="border-b border-border/40 hover:bg-muted/20">
                        <td class="py-1 pr-4"
                          ><a
                            href="/skills/{s.id}"
                            class="hover:underline text-foreground">{s.name}</a
                          ></td
                        >
                        <td class="py-1 pr-4 text-muted-foreground text-xs"
                          >{s.casterLabels.join(", ")}</td
                        >
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>
        {/each}
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
    </Card.Content>
  </Card.Root>
</div>
