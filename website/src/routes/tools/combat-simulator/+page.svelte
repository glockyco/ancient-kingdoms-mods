<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import * as Card from "$lib/components/ui/card";
  import { getQualityTextColorClass } from "$lib/utils/format";
  import {
    CLASSES,
    CLASS_MODES,
    CLASS_DEFAULT_MODE,
    CLASS_LABEL,
    MODE_LABEL,
    SPELL_PLAYER_CAST,
    SPELL_MERC_CAST,
    SPELL_MERC_CD,
    FORMULA_TABLE,
    isDelayBased,
    isSpellMode,
    calcInterval,
    calcDamage,
    getSecondaryWeaponHaste,
    buildComparisonRows,
    fmtSoftCap,
    fmtInterval,
    type PlayerClass,
    type AttackMode,
    type SortKey,
  } from "$lib/utils/combat-sim";
  import type { WeaponItem } from "./+page.server";

  let { data } = $props();

  // ─── State ───────────────────────────────────────────────────────────────────

  let selectedClass = $state<PlayerClass>("warrior");
  let attackMode = $state<AttackMode>("player");
  let baseSTR = $state(700);
  let baseDEX = $state(300);
  let baseINT = $state(500);
  let hastePercent = $state(50);
  let spellHastePercent = $state(0);
  let otherEquipDmg = $state(0);
  let otherMagicEquipDmg = $state(0);
  let mainWeaponId = $state("");
  let offWeaponId = $state("");
  let bowId = $state("");
  let meleeWeaponId = $state("");
  let wandId = $state("");
  let sortKey = $state<SortKey>("dps");
  let levelMin = $state(1);
  let levelMax = $state(9999);

  // Defined here so {#each SORT_KEYS as [key, label]} avoids `as const` in template.
  const SORT_KEYS: [SortKey, string][] = [
    ["dps", "DPS"],
    ["damage", "Damage"],
    ["interval", "Interval"],
  ];

  // ─── Weapon lists ────────────────────────────────────────────────────────────

  function classCanUseWeapon(w: WeaponItem, cls: PlayerClass): boolean {
    return (
      w.class_required.length === 0 ||
      w.class_required.includes("all") ||
      w.class_required.includes(cls)
    );
  }

  // Swords (warrior) or daggers (rogue) — only populated for warrior/rogue.
  const mainWeapons = $derived(
    selectedClass === "warrior" || selectedClass === "rogue"
      ? data.weapons.filter(
          (w) =>
            (selectedClass === "warrior"
              ? ["WeaponSword", "WeaponSword2H"].includes(w.weapon_category)
              : w.weapon_category === "WeaponDagger") &&
            classCanUseWeapon(w, selectedClass),
        )
      : [],
  );

  // Rogue off-hand daggers (player mode only).
  const offHandWeapons = $derived(
    selectedClass === "rogue"
      ? data.weapons.filter(
          (w) =>
            w.weapon_category === "WeaponDagger" &&
            classCanUseWeapon(w, "rogue"),
        )
      : [],
  );

  // Ranger bows.
  const bowWeapons = $derived(
    selectedClass === "ranger"
      ? data.weapons.filter(
          (w) => w.weapon_category === "Bow" && classCanUseWeapon(w, "ranger"),
        )
      : [],
  );

  // Ranger melee weapons (non-bow, non-wand).
  const meleeWeapons = $derived(
    selectedClass === "ranger"
      ? data.weapons.filter(
          (w) =>
            w.weapon_category !== "Bow" &&
            w.weapon_category !== "WeaponWand" &&
            classCanUseWeapon(w, "ranger"),
        )
      : [],
  );

  // Wands for caster classes.
  const wandWeapons = $derived(
    selectedClass === "wizard" ||
      selectedClass === "druid" ||
      selectedClass === "cleric"
      ? data.weapons.filter(
          (w) =>
            w.weapon_category === "WeaponWand" &&
            classCanUseWeapon(w, selectedClass),
        )
      : [],
  );

  // ─── Weapon lookups ──────────────────────────────────────────────────────────

  const mainWeapon = $derived(
    mainWeapons.find((w) => w.id === mainWeaponId) ?? null,
  );
  const offWeapon = $derived(
    offHandWeapons.find((w) => w.id === offWeaponId) ?? null,
  );
  const bowWeapon = $derived(bowWeapons.find((w) => w.id === bowId) ?? null);
  const meleeWeapon = $derived(
    meleeWeapons.find((w) => w.id === meleeWeaponId) ?? null,
  );
  const wandWeapon = $derived(wandWeapons.find((w) => w.id === wandId) ?? null);

  // The primary weapon for the current mode — drives Results card and interval calc.
  const activeWeapon = $derived.by((): WeaponItem | null => {
    switch (attackMode) {
      case "player":
      case "merc":
        return mainWeapon;
      case "bow_player":
      case "bow_merc":
        return bowWeapon;
      case "melee_player":
        return meleeWeapon;
      case "spell_player":
      case "staff_player":
      case "spell_merc":
        return wandWeapon;
    }
  });

  // ─── Computed results ────────────────────────────────────────────────────────

  // Clamp haste to the game cap of 80%.
  const h = $derived(Math.min(hastePercent / 100, 0.8));
  const sp = $derived(spellHastePercent / 100);

  // Haste contributed by secondary equipped weapons, mode-aware.
  // Rogue player/merc: off-hand dagger. Ranger bow_merc: melee sword. All others: zero.
  const secondaryWeapon = $derived(
    getSecondaryWeaponHaste(attackMode, selectedClass, offWeapon, meleeWeapon),
  );

  // Effective haste for the currently-selected weapon: base + weapon bonuses, capped at 80%.
  const effectiveHastePercent = $derived(
    Math.min(
      hastePercent +
        (activeWeapon?.haste ?? 0) * 100 +
        secondaryWeapon.haste * 100,
      80,
    ),
  );
  const effectiveSpellHastePercent = $derived(
    Math.min(
      spellHastePercent +
        (activeWeapon?.spell_haste ?? 0) * 100 +
        secondaryWeapon.spellHaste * 100,
      80,
    ),
  );

  // null = no weapon selected for this mode yet.
  const interval = $derived.by((): number | null => {
    if (!activeWeapon) return null;
    const eh = Math.min(h + activeWeapon.haste + secondaryWeapon.haste, 0.8);
    const esp = Math.min(
      sp + activeWeapon.spell_haste + secondaryWeapon.spellHaste,
      0.8,
    );
    return calcInterval(
      attackMode,
      selectedClass,
      activeWeapon.weapon_delay,
      eh,
      esp,
    );
  });

  const damagePerHit = $derived(
    calcDamage(
      attackMode,
      selectedClass,
      {
        main: mainWeapon,
        off: offWeapon,
        bow: bowWeapon,
        melee: meleeWeapon,
        wand: wandWeapon,
      },
      baseSTR,
      baseDEX,
      baseINT,
      otherEquipDmg,
      otherMagicEquipDmg,
    ),
  );

  const dps = $derived(
    damagePerHit !== null && interval !== null && interval > 0
      ? damagePerHit / interval
      : null,
  );

  // Delay for the active weapon — null when mode doesn't use weapon delay.
  const activeDelay = $derived(
    isDelayBased(attackMode) ? (activeWeapon?.weapon_delay ?? null) : null,
  );

  // ─── Comparison table ────────────────────────────────────────────────────────

  // Which weapon list to iterate depends on the attack mode.
  const weaponList = $derived.by((): WeaponItem[] => {
    switch (attackMode) {
      case "player":
      case "merc":
        return mainWeapons;
      case "bow_player":
      case "bow_merc":
        return bowWeapons;
      case "melee_player":
        return meleeWeapons;
      case "spell_player":
      case "spell_merc":
      case "staff_player":
        return wandWeapons;
      default:
        return [];
    }
  });

  // The currently-selected weapon ID for this mode (marks the row as selected).
  const selectedId = $derived.by((): string => {
    switch (attackMode) {
      case "player":
      case "merc":
        return mainWeaponId;
      case "bow_player":
      case "bow_merc":
        return bowId;
      case "melee_player":
        return meleeWeaponId;
      case "spell_player":
      case "spell_merc":
      case "staff_player":
        return wandId;
      default:
        return "";
    }
  });

  // Off-hand is fixed for rogue player mode (we iterate main weapons, off is constant).
  // Off-hand is fixed for rogue modes (we iterate main weapons; off-hand is constant across rows).
  // Player: ⌊dmg×0.5⌋ penalty applies. Merc: both daggers at full damage (rogue_melee_merc).
  const fixedOff = $derived(selectedClass === "rogue" ? offWeapon : null);
  // Melee weapon is fixed for bow_merc mode (we iterate bows, melee is constant).
  const fixedMelee = $derived(attackMode === "bow_merc" ? meleeWeapon : null);

  const comparisonRows = $derived(
    buildComparisonRows({
      mode: attackMode,
      cls: selectedClass,
      weaponList,
      fixedOff,
      fixedMelee,
      selectedId,
      str: baseSTR,
      dex: baseDEX,
      int_: baseINT,
      haste01: h,
      spellHaste01: sp,
      otherPhys: otherEquipDmg,
      otherMagic: otherMagicEquipDmg,
      sortKey,
    }),
  );

  const filteredRows = $derived(
    comparisonRows.filter(
      (r) => r.weapon.item_level >= levelMin && r.weapon.item_level <= levelMax,
    ),
  );

  const showDelayCol = $derived(isDelayBased(attackMode));

  // ─── Display helpers ─────────────────────────────────────────────────────────

  const softCapText = $derived(fmtSoftCap(attackMode, activeDelay));

  const intervalBreakdown = $derived(
    fmtInterval(
      attackMode,
      selectedClass,
      interval ?? 0,
      activeWeapon,
      effectiveHastePercent,
      effectiveSpellHastePercent,
    ),
  );

  // Haste contribution breakdown for the formula section.
  // Shows: "{base}% base + {weapon}% {label} [+ {secondary}% {label}] = {effective}%"
  // Returns empty string when there is nothing informative to show (all zeros).
  const hasteBreakdownText = $derived.by((): string => {
    if (!activeWeapon || isSpellMode(attackMode)) return "";

    const wh = Math.round(activeWeapon.haste * 100);
    const sh = Math.round(secondaryWeapon.haste * 100);
    if (hastePercent === 0 && wh === 0 && sh === 0) return "";

    // Label for the primary weapon slot, context-aware.
    const primaryLabel =
      attackMode === "bow_player" || attackMode === "bow_merc"
        ? "bow"
        : attackMode === "melee_player"
          ? "melee"
          : selectedClass === "rogue"
            ? "main"
            : "weapon";
    const secondaryLabel = selectedClass === "rogue" ? "off" : "melee";

    const terms: string[] = [`${hastePercent}% base`];
    if (wh !== 0) terms.push(`${wh}% ${primaryLabel}`);
    if (sh !== 0) terms.push(`${sh}% ${secondaryLabel}`);

    const sum = hastePercent + wh + sh;
    return sum > 80
      ? `${terms.join(" + ")} → capped at ${effectiveHastePercent}%`
      : `${terms.join(" + ")} = ${effectiveHastePercent}%`;
  });

  const spellHasteBreakdownText = $derived.by((): string => {
    if (!activeWeapon || !isSpellMode(attackMode)) return "";

    const wsh = Math.round(activeWeapon.spell_haste * 100);
    if (spellHastePercent === 0 && wsh === 0) return "";

    const terms: string[] = [`${spellHastePercent}% base`];
    if (wsh !== 0) terms.push(`${wsh}% wand`);

    const sum = spellHastePercent + wsh;
    return sum > 80
      ? `${terms.join(" + ")} → capped at ${effectiveSpellHastePercent}%`
      : `${terms.join(" + ")} = ${effectiveSpellHastePercent}%`;
  });

  function fmt(n: number, dec = 2): string {
    return n.toFixed(dec);
  }

  // Stat summary line for weapon pick-list entries (mode-aware).
  function weaponStatLine(w: WeaponItem): string {
    const parts: string[] = [`delay ${w.weapon_delay}`];
    if (isSpellMode(attackMode)) {
      parts.push(`magic ${w.magic_damage}`);
      if (w.spell_haste > 0)
        parts.push(`+${(w.spell_haste * 100).toFixed(0)}% spell haste`);
    } else {
      if (w.damage > 0) parts.push(`dmg ${w.damage}`);
      if (w.strength > 0) parts.push(`+${w.strength} STR`);
      if (w.dexterity > 0) parts.push(`+${w.dexterity} DEX`);
      if (w.haste > 0) parts.push(`+${(w.haste * 100).toFixed(0)}% haste`);
    }
    return parts.join(" · ");
  }

  function resetWeapons(): void {
    mainWeaponId = offWeaponId = bowId = meleeWeaponId = wandId = "";
  }
</script>

<svelte:head>
  <title>Auto-Attack DPS Simulator - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="Compare weapon DPS for all six classes at your stats and haste. Weapon haste and spell haste bonuses are included in the ranking. Accounts for Rogue off-hand, Ranger DEX scaling, Ranger melee mode, spell haste for casters, and the player vs merc distinction."
  />
</svelte:head>

<div class="container mx-auto p-8 space-y-8 max-w-5xl">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Tools" },
      { label: "Auto-Attack DPS Simulator" },
    ]}
  />

  <div class="space-y-2">
    <h1 class="text-4xl font-bold">Auto-Attack DPS Simulator</h1>
    <p class="text-muted-foreground">
      Models auto-attack DPS only — stab, archer_shot, melee_attack, and the
      caster equivalents. Does not include ability damage, crits, or weapon
      procs.
    </p>
  </div>

  <!-- Class + Mode selector -->
  <Card.Root class="bg-muted/30">
    <Card.Header class="pb-3">
      <Card.Title class="text-base">Class &amp; Mode</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-3">
      <!-- Class buttons — CLASSES is readonly PlayerClass[], no `as const` needed -->
      <div class="flex flex-wrap gap-2">
        {#each CLASSES as cls (cls)}
          <button
            onclick={() => {
              selectedClass = cls;
              attackMode = CLASS_DEFAULT_MODE[cls];
              resetWeapons();
            }}
            class={[
              "px-4 py-2 rounded-md border text-sm font-medium transition-colors",
              selectedClass === cls
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 border-border hover:bg-muted",
            ].join(" ")}
          >
            {CLASS_LABEL[cls]}
          </button>
        {/each}
      </div>

      <!-- Mode buttons (vary by class) -->
      <div class="flex flex-wrap gap-2 items-center">
        <span class="text-xs text-muted-foreground">Mode:</span>
        {#each CLASS_MODES[selectedClass] as mode (mode)}
          <button
            onclick={() => {
              attackMode = mode;
            }}
            class={[
              "px-3 py-1 rounded-md border text-sm transition-colors",
              attackMode === mode
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 border-border hover:bg-muted",
            ].join(" ")}
          >
            {MODE_LABEL[mode]}
          </button>
        {/each}
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Stat inputs + weapon selectors -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Stat inputs -->
    <Card.Root class="bg-muted/30">
      <Card.Header class="pb-3">
        <Card.Title class="text-base">Stats</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        <!-- STR (all physical modes) -->
        {#if !isSpellMode(attackMode)}
          <div class="space-y-1">
            <label class="text-sm font-medium" for="base-str">STR</label>
            <p class="text-xs text-muted-foreground">
              Your character's STR attribute. Do not include the selected
              weapon's own strength bonus — the simulator adds it automatically.
            </p>
            <input
              id="base-str"
              type="number"
              min="0"
              max="9999"
              bind:value={baseSTR}
              class="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
          </div>
        {/if}

        <!-- DEX (bow modes only) -->
        {#if attackMode === "bow_player" || attackMode === "bow_merc"}
          <div class="space-y-1">
            <label class="text-sm font-medium" for="base-dex">DEX</label>
            <p class="text-xs text-muted-foreground">
              Your character's DEX attribute. Do not include the selected bow's
              own dexterity bonus — the simulator adds it automatically.
            </p>
            <input
              id="base-dex"
              type="number"
              min="0"
              max="9999"
              bind:value={baseDEX}
              class="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
          </div>
        {/if}

        <!-- INT (spell modes) -->
        {#if isSpellMode(attackMode)}
          <div class="space-y-1">
            <label class="text-sm font-medium" for="base-int">INT</label>
            <input
              id="base-int"
              type="number"
              min="0"
              max="9999"
              bind:value={baseINT}
              class="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
          </div>
        {/if}

        <!-- Haste — spell haste for spell modes, regular haste otherwise -->
        {#if isSpellMode(attackMode)}
          <div class="space-y-1">
            <label class="text-sm font-medium" for="spell-haste-pct">
              Spell Haste % (reduces cast time)
            </label>
            <p class="text-xs text-muted-foreground">
              Regular haste has zero effect on spell auto-attack intervals.
            </p>
            <div class="flex gap-2 items-center">
              <input
                id="spell-haste-pct"
                type="range"
                min="0"
                max="80"
                step="1"
                bind:value={spellHastePercent}
                class="flex-1"
              />
              <input
                type="number"
                min="0"
                max="80"
                bind:value={spellHastePercent}
                class="w-16 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-right"
              />
            </div>
          </div>
        {:else}
          <div class="space-y-1">
            <label class="text-sm font-medium" for="haste-pct">
              Haste % (0–80)
            </label>
            <div class="flex gap-2 items-center">
              <input
                id="haste-pct"
                type="range"
                min="0"
                max="80"
                step="1"
                bind:value={hastePercent}
                class="flex-1"
              />
              <input
                type="number"
                min="0"
                max="80"
                bind:value={hastePercent}
                class="w-16 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-right"
              />
            </div>
          </div>
        {/if}

        <!-- Other equipment damage bonus -->
        {#if isSpellMode(attackMode)}
          <div class="space-y-1">
            <label class="text-sm font-medium" for="other-magic-equip">
              Equipment magic bonus
            </label>
            <p class="text-xs text-muted-foreground">
              Magic damage from armor, rings, etc. (not the wand slot)
            </p>
            <input
              id="other-magic-equip"
              type="number"
              min="0"
              max="9999"
              bind:value={otherMagicEquipDmg}
              class="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
          </div>
        {:else}
          <div class="space-y-1">
            <label class="text-sm font-medium" for="other-equip">
              Equipment damage bonus
            </label>
            <p class="text-xs text-muted-foreground">
              Damage from armor, rings, etc. (not weapon slots)
            </p>
            <input
              id="other-equip"
              type="number"
              min="0"
              max="9999"
              bind:value={otherEquipDmg}
              class="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
          </div>
        {/if}
      </Card.Content>
    </Card.Root>

    <!-- Weapon selectors (pick-list) -->
    <Card.Root class="bg-muted/30">
      <Card.Header class="pb-3">
        <Card.Title class="text-base">Weapons</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        {#if attackMode === "player" && selectedClass === "warrior"}
          <!-- Warrior: main sword -->
          <div class="space-y-1">
            <p class="text-sm font-medium">Weapon</p>
            <div
              class="max-h-52 overflow-y-auto border border-border rounded-md divide-y divide-border/50"
            >
              {#each mainWeapons as w (w.id)}
                <button
                  type="button"
                  onclick={() => {
                    mainWeaponId = mainWeaponId === w.id ? "" : w.id;
                  }}
                  class={[
                    "w-full px-3 py-2 text-left text-sm flex items-baseline gap-2 transition-colors",
                    mainWeaponId === w.id
                      ? "bg-primary/10"
                      : "hover:bg-muted/50",
                  ].join(" ")}
                >
                  <span class={getQualityTextColorClass(w.quality)}
                    >{w.name}</span
                  >
                  <span class="ml-auto text-xs text-muted-foreground shrink-0"
                    >{weaponStatLine(w)}</span
                  >
                </button>
              {/each}
              {#if mainWeapons.length === 0}
                <p class="px-3 py-3 text-sm text-muted-foreground">
                  No weapons found.
                </p>
              {/if}
            </div>
          </div>
        {:else if attackMode === "player" && selectedClass === "rogue"}
          <!-- Rogue player: main + off-hand -->
          <div class="space-y-1">
            <p class="text-sm font-medium">Main-hand Dagger</p>
            <div
              class="max-h-44 overflow-y-auto border border-border rounded-md divide-y divide-border/50"
            >
              {#each mainWeapons as w (w.id)}
                <button
                  type="button"
                  onclick={() => {
                    mainWeaponId = mainWeaponId === w.id ? "" : w.id;
                  }}
                  class={[
                    "w-full px-3 py-2 text-left text-sm flex items-baseline gap-2 transition-colors",
                    mainWeaponId === w.id
                      ? "bg-primary/10"
                      : "hover:bg-muted/50",
                  ].join(" ")}
                >
                  <span class={getQualityTextColorClass(w.quality)}
                    >{w.name}</span
                  >
                  <span class="ml-auto text-xs text-muted-foreground shrink-0"
                    >{weaponStatLine(w)}</span
                  >
                </button>
              {/each}
            </div>
          </div>
          <div class="space-y-1">
            <p class="text-sm font-medium">Off-hand Dagger</p>
            <p class="text-xs text-muted-foreground">
              Contributes floor(dmg×0.5) but full STR bonus. Comparison table
              uses selected off-hand.
            </p>
            <div
              class="max-h-36 overflow-y-auto border border-border rounded-md divide-y divide-border/50"
            >
              {#each offHandWeapons as w (w.id)}
                <button
                  type="button"
                  onclick={() => {
                    offWeaponId = offWeaponId === w.id ? "" : w.id;
                  }}
                  class={[
                    "w-full px-3 py-2 text-left text-sm flex items-baseline gap-2 transition-colors",
                    offWeaponId === w.id
                      ? "bg-primary/10"
                      : "hover:bg-muted/50",
                  ].join(" ")}
                >
                  <span class={getQualityTextColorClass(w.quality)}
                    >{w.name}</span
                  >
                  <span class="ml-auto text-xs text-muted-foreground shrink-0"
                    >{weaponStatLine(w)}</span
                  >
                </button>
              {/each}
            </div>
          </div>
        {:else if attackMode === "merc" && selectedClass === "rogue"}
          <!-- Rogue merc: main + off-hand (both at full damage — no 0.5× penalty for mercs) -->
          <div class="space-y-1">
            <p class="text-sm font-medium">Main-hand Dagger</p>
            <div
              class="max-h-44 overflow-y-auto border border-border rounded-md divide-y divide-border/50"
            >
              {#each mainWeapons as w (w.id)}
                <button
                  type="button"
                  onclick={() => {
                    mainWeaponId = mainWeaponId === w.id ? "" : w.id;
                  }}
                  class={[
                    "w-full px-3 py-2 text-left text-sm flex items-baseline gap-2 transition-colors",
                    mainWeaponId === w.id
                      ? "bg-primary/10"
                      : "hover:bg-muted/50",
                  ].join(" ")}
                >
                  <span class={getQualityTextColorClass(w.quality)}
                    >{w.name}</span
                  >
                  <span class="ml-auto text-xs text-muted-foreground shrink-0"
                    >{weaponStatLine(w)}</span
                  >
                </button>
              {/each}
            </div>
          </div>
          <div class="space-y-1">
            <p class="text-sm font-medium">Off-hand Dagger</p>
            <p class="text-xs text-muted-foreground">
              Both daggers deal full damage (no off-hand penalty for mercs).
              Comparison table uses the selected off-hand.
            </p>
            <div
              class="max-h-36 overflow-y-auto border border-border rounded-md divide-y divide-border/50"
            >
              {#each offHandWeapons as w (w.id)}
                <button
                  type="button"
                  onclick={() => {
                    offWeaponId = offWeaponId === w.id ? "" : w.id;
                  }}
                  class={[
                    "w-full px-3 py-2 text-left text-sm flex items-baseline gap-2 transition-colors",
                    offWeaponId === w.id
                      ? "bg-primary/10"
                      : "hover:bg-muted/50",
                  ].join(" ")}
                >
                  <span class={getQualityTextColorClass(w.quality)}
                    >{w.name}</span
                  >
                  <span class="ml-auto text-xs text-muted-foreground shrink-0"
                    >{weaponStatLine(w)}</span
                  >
                </button>
              {/each}
            </div>
          </div>
        {:else if attackMode === "merc"}
          <!-- Warrior merc: main weapon only -->
          <div class="space-y-1">
            <p class="text-sm font-medium">Weapon</p>
            <p class="text-xs text-muted-foreground">
              sword_strike — no off-hand.
            </p>
            <div
              class="max-h-52 overflow-y-auto border border-border rounded-md divide-y divide-border/50"
            >
              {#each mainWeapons as w (w.id)}
                <button
                  type="button"
                  onclick={() => {
                    mainWeaponId = mainWeaponId === w.id ? "" : w.id;
                  }}
                  class={[
                    "w-full px-3 py-2 text-left text-sm flex items-baseline gap-2 transition-colors",
                    mainWeaponId === w.id
                      ? "bg-primary/10"
                      : "hover:bg-muted/50",
                  ].join(" ")}
                >
                  <span class={getQualityTextColorClass(w.quality)}
                    >{w.name}</span
                  >
                  <span class="ml-auto text-xs text-muted-foreground shrink-0"
                    >{weaponStatLine(w)}</span
                  >
                </button>
              {/each}
            </div>
          </div>
        {:else if attackMode === "bow_player"}
          <!-- Ranger bow player: bow only -->
          <div class="space-y-1">
            <p class="text-sm font-medium">Bow</p>
            <div
              class="max-h-52 overflow-y-auto border border-border rounded-md divide-y divide-border/50"
            >
              {#each bowWeapons as w (w.id)}
                <button
                  type="button"
                  onclick={() => {
                    bowId = bowId === w.id ? "" : w.id;
                  }}
                  class={[
                    "w-full px-3 py-2 text-left text-sm flex items-baseline gap-2 transition-colors",
                    bowId === w.id ? "bg-primary/10" : "hover:bg-muted/50",
                  ].join(" ")}
                >
                  <span class={getQualityTextColorClass(w.quality)}
                    >{w.name}</span
                  >
                  <span class="ml-auto text-xs text-muted-foreground shrink-0"
                    >{weaponStatLine(w)}</span
                  >
                </button>
              {/each}
            </div>
          </div>
        {:else if attackMode === "melee_player"}
          <!-- Ranger melee player: melee weapon only -->
          <div class="space-y-1">
            <p class="text-sm font-medium">Melee Weapon</p>
            <p class="text-xs text-muted-foreground">
              swift_slash — no bow, no DEX scaling.
            </p>
            <div
              class="max-h-52 overflow-y-auto border border-border rounded-md divide-y divide-border/50"
            >
              {#each meleeWeapons as w (w.id)}
                <button
                  type="button"
                  onclick={() => {
                    meleeWeaponId = meleeWeaponId === w.id ? "" : w.id;
                  }}
                  class={[
                    "w-full px-3 py-2 text-left text-sm flex items-baseline gap-2 transition-colors",
                    meleeWeaponId === w.id
                      ? "bg-primary/10"
                      : "hover:bg-muted/50",
                  ].join(" ")}
                >
                  <span class={getQualityTextColorClass(w.quality)}
                    >{w.name}</span
                  >
                  <span class="ml-auto text-xs text-muted-foreground shrink-0"
                    >{weaponStatLine(w)}</span
                  >
                </button>
              {/each}
            </div>
          </div>
        {:else if attackMode === "bow_merc"}
          <!-- Ranger bow merc: bow + optional melee -->
          <div class="space-y-1">
            <p class="text-sm font-medium">Bow</p>
            <p class="text-xs text-muted-foreground">
              explorer_shot — both bow and melee damage count (no slot
              subtraction).
            </p>
            <div
              class="max-h-44 overflow-y-auto border border-border rounded-md divide-y divide-border/50"
            >
              {#each bowWeapons as w (w.id)}
                <button
                  type="button"
                  onclick={() => {
                    bowId = bowId === w.id ? "" : w.id;
                  }}
                  class={[
                    "w-full px-3 py-2 text-left text-sm flex items-baseline gap-2 transition-colors",
                    bowId === w.id ? "bg-primary/10" : "hover:bg-muted/50",
                  ].join(" ")}
                >
                  <span class={getQualityTextColorClass(w.quality)}
                    >{w.name}</span
                  >
                  <span class="ml-auto text-xs text-muted-foreground shrink-0"
                    >{weaponStatLine(w)}</span
                  >
                </button>
              {/each}
            </div>
          </div>
          <div class="space-y-1">
            <p class="text-sm font-medium">
              Melee Weapon <span class="text-muted-foreground font-normal"
                >(optional)</span
              >
            </p>
            <div
              class="max-h-36 overflow-y-auto border border-border rounded-md divide-y divide-border/50"
            >
              {#each meleeWeapons as w (w.id)}
                <button
                  type="button"
                  onclick={() => {
                    meleeWeaponId = meleeWeaponId === w.id ? "" : w.id;
                  }}
                  class={[
                    "w-full px-3 py-2 text-left text-sm flex items-baseline gap-2 transition-colors",
                    meleeWeaponId === w.id
                      ? "bg-primary/10"
                      : "hover:bg-muted/50",
                  ].join(" ")}
                >
                  <span class={getQualityTextColorClass(w.quality)}
                    >{w.name}</span
                  >
                  <span class="ml-auto text-xs text-muted-foreground shrink-0"
                    >{weaponStatLine(w)}</span
                  >
                </button>
              {/each}
            </div>
          </div>
        {:else}
          <!-- Caster modes: wand -->
          <div class="space-y-1">
            <p class="text-sm font-medium">Wand</p>
            {#if attackMode === "spell_player" || attackMode === "spell_merc"}
              <p class="text-xs text-muted-foreground">
                Ranked by magic damage. Physical dmg stat is unused in spell
                mode.
              </p>
            {:else}
              <p class="text-xs text-muted-foreground">
                Staff mode uses physical damage formula; magic_dmg stat is
                unused.
              </p>
            {/if}
            <div
              class="max-h-52 overflow-y-auto border border-border rounded-md divide-y divide-border/50"
            >
              {#each wandWeapons as w (w.id)}
                <button
                  type="button"
                  onclick={() => {
                    wandId = wandId === w.id ? "" : w.id;
                  }}
                  class={[
                    "w-full px-3 py-2 text-left text-sm flex items-baseline gap-2 transition-colors",
                    wandId === w.id ? "bg-primary/10" : "hover:bg-muted/50",
                  ].join(" ")}
                >
                  <span class={getQualityTextColorClass(w.quality)}
                    >{w.name}</span
                  >
                  <span class="ml-auto text-xs text-muted-foreground shrink-0"
                    >{weaponStatLine(w)}</span
                  >
                </button>
              {/each}
              {#if wandWeapons.length === 0}
                <p class="px-3 py-3 text-sm text-muted-foreground">
                  No wands found.
                </p>
              {/if}
            </div>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Results card (only when a weapon is selected and calc is valid) -->
  {#if interval !== null && damagePerHit !== null && dps !== null}
    <Card.Root class="bg-muted/30 border-primary/30">
      <Card.Header class="pb-3">
        <Card.Title class="text-base">
          Results —
          <!-- ItemLink is safe here: 1–3 instances max, never inside {#each} -->
          {#if activeWeapon}
            <ItemLink
              itemId={activeWeapon.id}
              itemName={activeWeapon.name}
              tooltipHtml={activeWeapon.tooltip_html || null}
              colorClass={getQualityTextColorClass(activeWeapon.quality)}
            />
          {/if}
          {#if (attackMode === "player" || attackMode === "merc") && selectedClass === "rogue" && offWeapon}
            &nbsp;+&nbsp;<ItemLink
              itemId={offWeapon.id}
              itemName={offWeapon.name}
              tooltipHtml={offWeapon.tooltip_html || null}
              colorClass={getQualityTextColorClass(offWeapon.quality)}
            />
          {:else if attackMode === "bow_merc" && meleeWeapon}
            &nbsp;+&nbsp;<ItemLink
              itemId={meleeWeapon.id}
              itemName={meleeWeapon.name}
              tooltipHtml={meleeWeapon.tooltip_html || null}
              colorClass={getQualityTextColorClass(meleeWeapon.quality)}
            />
          {/if}
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <dt class="text-xs text-muted-foreground mb-1">Attack Interval</dt>
            <dd class="text-2xl font-mono font-semibold">{fmt(interval)}s</dd>
            <dd class="text-xs text-muted-foreground mt-1">
              {intervalBreakdown}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground mb-1">Damage / Hit</dt>
            <dd class="text-2xl font-mono font-semibold">
              {Math.round(damagePerHit).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground mb-1">DPS</dt>
            <dd class="text-2xl font-mono font-semibold text-primary">
              {fmt(dps)}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground mb-1">
              {isDelayBased(attackMode)
                ? `Soft-cap Haste (delay=${activeDelay})`
                : "Soft-cap"}
            </dt>
            <dd class="text-2xl font-mono font-semibold">
              {#if isDelayBased(attackMode)}
                {softCapText}
              {:else}
                <span class="text-base font-normal">{softCapText}</span>
              {/if}
            </dd>
            {#if isDelayBased(attackMode)}
              <dd class="text-xs text-muted-foreground mt-1">
                haste beyond this has no effect
              </dd>
            {/if}
          </div>
        </dl>

        <!-- Formula breakdown -->
        <div
          class="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground space-y-1"
        >
          <p class="font-medium text-foreground">Formula</p>

          {#if (attackMode === "player" || attackMode === "merc") && mainWeapon}
            {#if selectedClass === "rogue"}
              {#if attackMode === "player"}
                <p>
                  Damage = (STR {baseSTR} + main STR {mainWeapon.strength}{offWeapon
                    ? " + off STR " + offWeapon.strength
                    : ""}) + main dmg {mainWeapon.damage}{offWeapon
                    ? " + ⌊" +
                      offWeapon.damage +
                      " × 0.5⌋ = " +
                      Math.floor(offWeapon.damage * 0.5)
                    : ""} + equip.dmg {otherEquipDmg} = {Math.round(
                    damagePerHit,
                  )}
                </p>
              {:else}
                <!-- merc rogue: both daggers at full damage -->
                <p>
                  Damage = (STR {baseSTR} + main STR {mainWeapon.strength}{offWeapon
                    ? " + off STR " + offWeapon.strength
                    : ""}) + main dmg {mainWeapon.damage}{offWeapon
                    ? " + off dmg " + offWeapon.damage
                    : ""} + equip.dmg {otherEquipDmg} = {Math.round(
                    damagePerHit,
                  )}
                </p>
              {/if}
            {:else}
              <p>
                Damage = (STR {baseSTR} + weapon STR {mainWeapon.strength}) +
                weapon dmg
                {mainWeapon.damage} + equip.dmg {otherEquipDmg} = {Math.round(
                  damagePerHit,
                )}
              </p>
            {/if}
            <p>
              Interval = {attackMode === "player"
                ? `${selectedClass === "warrior" ? "0.5" : "0.4"}s cast + max(${mainWeapon.weapon_delay} × (1−${effectiveHastePercent}%) / 25, 0.25s)`
                : `${selectedClass === "warrior" ? "0.5" : "0.4"}s cast + 1.0×(1−${effectiveHastePercent}%)`}
              = {fmt(interval)}s
            </p>
            {#if hasteBreakdownText}
              <p>Haste = {hasteBreakdownText}</p>
            {/if}
          {:else if attackMode === "bow_player" && bowWeapon}
            <p>
              Damage = (STR {baseSTR} + bow STR {bowWeapon.strength}) + bow dmg {bowWeapon.damage}
              + (DEX {baseDEX} + bow DEX {bowWeapon.dexterity}) × 1.5 +
              equip.dmg {otherEquipDmg}
              = {Math.round(damagePerHit)}
            </p>
            <p>
              Interval = 0.8s cast + max({bowWeapon.weapon_delay} × (1−{effectiveHastePercent}%)
              / 25, 0.25s) = {fmt(interval)}s
            </p>
            {#if hasteBreakdownText}
              <p>Haste = {hasteBreakdownText}</p>
            {/if}
          {:else if attackMode === "melee_player" && meleeWeapon}
            <p>
              Damage = (STR {baseSTR} + melee STR {meleeWeapon.strength}) +
              melee dmg
              {meleeWeapon.damage} + equip.dmg {otherEquipDmg} = {Math.round(
                damagePerHit,
              )}
            </p>
            <p>
              Interval = 0.5s cast + max({meleeWeapon.weapon_delay} × (1−{effectiveHastePercent}%)
              / 25, 0.25s) = {fmt(interval)}s
            </p>
            {#if hasteBreakdownText}
              <p>Haste = {hasteBreakdownText}</p>
            {/if}
          {:else if attackMode === "bow_merc" && bowWeapon}
            <p>
              Damage = (STR {baseSTR} + bow STR {bowWeapon.strength}{meleeWeapon
                ? " + melee STR " + meleeWeapon.strength
                : ""}) + bow dmg {bowWeapon.damage}{meleeWeapon
                ? " + melee dmg " + meleeWeapon.damage
                : ""} + (DEX {baseDEX} + bow DEX {bowWeapon.dexterity}) × 1.5 +
              equip.dmg
              {otherEquipDmg} = {Math.round(damagePerHit)}
            </p>
            <p>
              Interval = 0.8s cast + 1.0×(1−{effectiveHastePercent}%) = {fmt(
                interval,
              )}s
            </p>
            {#if hasteBreakdownText}
              <p>Haste = {hasteBreakdownText}</p>
            {/if}
          {:else if (attackMode === "spell_player" || attackMode === "spell_merc") && wandWeapon}
            <p>
              Damage = INT {baseINT} × 1.5 + wand magic dmg {wandWeapon.magic_damage}
              + equip.magic {otherMagicEquipDmg} = {Math.round(damagePerHit)}
            </p>
            {#if attackMode === "spell_player"}
              <p>
                Interval = {SPELL_PLAYER_CAST[selectedClass] ?? 1.0}s × (1−{effectiveSpellHastePercent}%
                spell haste) = {fmt(interval)}s
              </p>
              {#if spellHasteBreakdownText}
                <p>Spell haste = {spellHasteBreakdownText}</p>
              {/if}
            {:else}
              <p>
                Interval = {SPELL_MERC_CAST[selectedClass] ?? 1.0}s × (1−{effectiveSpellHastePercent}%)
                +
                {SPELL_MERC_CD[selectedClass] ?? 1.0}s cooldown = {fmt(
                  interval,
                )}s
              </p>
              {#if spellHasteBreakdownText}
                <p>Spell haste = {spellHasteBreakdownText}</p>
              {/if}
            {/if}
          {:else if attackMode === "staff_player" && wandWeapon}
            <p>
              Damage = (STR {baseSTR} + wand STR {wandWeapon.strength}) + wand
              dmg
              {wandWeapon.damage} + equip.dmg {otherEquipDmg} = {Math.round(
                damagePerHit,
              )}
            </p>
            <p>
              Interval = 0.5s cast + max({wandWeapon.weapon_delay} × (1−{effectiveHastePercent}%)
              / 25, 0.25s) = {fmt(interval)}s
            </p>
            {#if hasteBreakdownText}
              <p>Haste = {hasteBreakdownText}</p>
            {/if}
          {/if}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Comparison table -->
  <Card.Root class="bg-muted/30">
    <Card.Header class="pb-3">
      <div class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <Card.Title class="text-base">
            {CLASS_LABEL[selectedClass]} ({MODE_LABEL[attackMode]}) — DPS at
            Current Settings
          </Card.Title>
          <!-- Sort controls — SORT_KEYS defined in script, no `as const` in template -->
          <div class="flex gap-1 text-xs">
            <span class="text-muted-foreground mr-1">Sort by:</span>
            {#each SORT_KEYS as [key, label] (key)}
              <button
                onclick={() => (sortKey = key)}
                class={[
                  "px-2 py-1 rounded border text-xs transition-colors",
                  sortKey === key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted",
                ].join(" ")}
              >
                {label}
              </button>
            {/each}
          </div>
        </div>

        <!-- Item level filter -->
        <div class="flex items-center gap-2 text-xs">
          <span class="text-muted-foreground">Item level:</span>
          <input
            type="number"
            min="1"
            max="9999"
            bind:value={levelMin}
            class="w-20 rounded border border-border bg-background px-2 py-1 text-sm"
            placeholder="min"
          />
          <span class="text-muted-foreground">–</span>
          <input
            type="number"
            min="1"
            max="9999"
            bind:value={levelMax}
            class="w-20 rounded border border-border bg-background px-2 py-1 text-sm"
            placeholder="max"
          />
          <span class="text-muted-foreground"
            >({filteredRows.length} weapons)</span
          >
        </div>
      </div>
    </Card.Header>
    <Card.Content class="p-0">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border text-muted-foreground text-xs">
              <th class="text-left px-4 py-2 font-medium">Weapon</th>
              {#if attackMode === "player" && selectedClass === "rogue"}
                <th class="text-left px-4 py-2 font-medium">Off-hand</th>
              {/if}
              {#if showDelayCol}
                <th class="text-right px-4 py-2 font-medium">Delay</th>
                <th class="text-right px-4 py-2 font-medium">Soft-cap %</th>
              {/if}
              <th class="text-right px-4 py-2 font-medium">Dmg/Hit</th>
              <th class="text-right px-4 py-2 font-medium">Interval</th>
              <th class="text-right px-4 py-2 font-medium font-semibold">DPS</th
              >
            </tr>
          </thead>
          <tbody>
            {#each filteredRows as row, i (row.weapon.id)}
              <tr
                class={[
                  "border-b border-border/50 hover:bg-muted/30 transition-colors",
                  row.isSelected ? "bg-primary/5 border-primary/20" : "",
                ].join(" ")}
              >
                <td class="px-4 py-2">
                  <!--
                    Plain <a> here — NOT ItemLink. ItemLink spawns a HoverCard portal per
                    instance; 100+ simultaneous portals during hydration breaks rendering.
                    ItemLink is only used in the Results card title (1–3 instances max).
                  -->
                  <a
                    href="/items/{row.weapon.id}"
                    class={[
                      "hover:underline",
                      getQualityTextColorClass(row.weapon.quality),
                    ].join(" ")}>{row.weapon.name}</a
                  >
                  {#if i === 0}
                    <span class="ml-1 text-xs text-muted-foreground font-normal"
                      >(best)</span
                    >
                  {/if}
                  {#if row.isSelected}
                    <span class="ml-1 text-xs text-primary">(selected)</span>
                  {/if}
                </td>
                {#if attackMode === "player" && selectedClass === "rogue"}
                  <td class="px-4 py-2 text-muted-foreground text-xs">
                    {row.offWeapon ? row.offWeapon.name : "—"}
                  </td>
                {/if}
                {#if showDelayCol}
                  <td class="px-4 py-2 text-right font-mono text-xs"
                    >{row.delay}</td
                  >
                  <td class="px-4 py-2 text-right font-mono text-xs">
                    {row.softCap !== null ? fmt(row.softCap, 1) + "%" : "—"}
                  </td>
                {/if}
                <td class="px-4 py-2 text-right font-mono">
                  {Math.round(row.damage).toLocaleString()}
                </td>
                <td class="px-4 py-2 text-right font-mono"
                  >{fmt(row.interval)}s</td
                >
                <td class="px-4 py-2 text-right font-mono font-semibold"
                  >{fmt(row.dps)}</td
                >
              </tr>
            {/each}
            {#if filteredRows.length === 0}
              <tr>
                <td
                  colspan="7"
                  class="px-4 py-8 text-center text-muted-foreground text-sm"
                >
                  {comparisonRows.length === 0
                    ? "No weapons found for this class and mode."
                    : "No weapons in this item level range."}
                </td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Formula Reference — static table, no reactive state, no ItemLink -->
  <Card.Root class="bg-muted/30">
    <Card.Header class="pb-3">
      <Card.Title class="text-base">Formula Reference</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-4 text-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-border text-muted-foreground">
              <th class="text-left px-3 py-2 font-medium">Class</th>
              <th class="text-left px-3 py-2 font-medium">Mode</th>
              <th class="text-left px-3 py-2 font-medium">Skill</th>
              <th class="text-right px-3 py-2 font-medium">Cast</th>
              <th class="text-left px-3 py-2 font-medium">Timing</th>
              <th class="text-left px-3 py-2 font-medium">Damage</th>
              <th class="text-left px-3 py-2 font-medium">Soft-cap</th>
            </tr>
          </thead>
          <tbody>
            {#each FORMULA_TABLE as row (row.cls + row.mode)}
              <tr class="border-b border-border/50 hover:bg-muted/20">
                <td class="px-3 py-1.5 font-medium">{row.cls}</td>
                <td class="px-3 py-1.5 text-muted-foreground">{row.mode}</td>
                <td class="px-3 py-1.5">
                  <a
                    href="/skills/{row.skillId}"
                    class="text-blue-600 hover:underline dark:text-blue-400"
                    >{row.skillName}</a
                  >
                </td>
                <td class="px-3 py-1.5 text-right font-mono">{row.cast}</td>
                <td class="px-3 py-1.5 font-mono">{row.timing}</td>
                <td class="px-3 py-1.5 font-mono">{row.damage}</td>
                <td class="px-3 py-1.5 text-muted-foreground">{row.softCap}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="space-y-2 text-xs text-muted-foreground">
        <p>
          <span class="font-medium text-foreground"
            >Soft-cap (delay modes):</span
          >
          h = 1 &minus; 6.25 / delay — haste beyond this hits the 0.25s refractory
          floor. Hard cap: 80%.
        </p>
        <p>
          <span class="font-medium text-foreground"
            >Spell Haste vs Regular Haste:</span
          >
          Regular haste has zero effect on spell auto-attack intervals. Spell haste
          (from armor/augments/passives) reduces cast time per Skills.cs:675:
          <code class="font-mono"
            >castTimeEnd -= spellHasteBonus × castTime</code
          >. Cooldowns on merc spells are NOT reduced by any haste.
        </p>
        <p>
          This simulator models base auto-attack DPS before mitigation, variance
          (&times;0.9&ndash;1.1), crits, and defense. Weapon procs and passive
          multipliers are not modelled.
        </p>
      </div>
    </Card.Content>
  </Card.Root>
</div>
