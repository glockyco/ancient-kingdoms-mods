<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import * as Card from "$lib/components/ui/card";
  import { getQualityTextColorClass } from "$lib/utils/format";
  import type { WeaponItem } from "./+page.server";

  let { data } = $props();

  // ─── Types ───────────────────────────────────────────────────────────────────

  type PlayerClass = "warrior" | "rogue" | "ranger";
  type RangerType = "player" | "merc";
  type SortKey = "dps" | "damage" | "interval";

  // ─── State ────────────────────────────────────────────────────────────────────

  let selectedClass = $state<PlayerClass>("warrior");
  let rangerType = $state<RangerType>("player");
  let baseSTR = $state(700);
  let baseDEX = $state(300);
  let hastePercent = $state(50);
  let otherEquipDmg = $state(0);
  let mainWeaponId = $state("");
  let offWeaponId = $state("");
  let bowId = $state("");
  let meleeWeaponId = $state("");
  let sortKey = $state<SortKey>("dps");

  // ─── Constants ────────────────────────────────────────────────────────────────

  // Cast time is fixed per class auto-attack skill (from DB: stab=0.4, archer_shot=0.8, crush_strike=0.5)
  const CAST_TIME: Record<PlayerClass, number> = {
    rogue: 0.4,
    ranger: 0.8,
    warrior: 0.5,
  };

  // Weapon categories each class uses as their primary (delay-determining) weapon
  const MAIN_CATEGORIES: Record<PlayerClass, string[]> = {
    warrior: ["WeaponSword", "WeaponSword2H"],
    rogue: ["WeaponDagger"],
    ranger: ["Bow"],
  };

  // ─── Filtered weapon lists ────────────────────────────────────────────────────

  function classCanUseWeapon(w: WeaponItem, cls: PlayerClass): boolean {
    return (
      w.class_required.length === 0 ||
      w.class_required.includes("all") ||
      w.class_required.includes(cls)
    );
  }

  const mainWeapons = $derived(
    data.weapons.filter(
      (w) =>
        MAIN_CATEGORIES[selectedClass].includes(w.weapon_category) &&
        classCanUseWeapon(w, selectedClass),
    ),
  );

  const offHandWeapons = $derived(
    selectedClass === "rogue"
      ? data.weapons.filter(
          (w) =>
            w.weapon_category === "WeaponDagger" &&
            classCanUseWeapon(w, "rogue"),
        )
      : [],
  );

  // Ranger merc melee (any non-Bow weapon usable by ranger, including swords)
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

  // ─── Weapon lookups ───────────────────────────────────────────────────────────

  const mainWeapon = $derived(
    mainWeapons.find((w) => w.id === mainWeaponId) ?? null,
  );
  const offWeapon = $derived(
    offHandWeapons.find((w) => w.id === offWeaponId) ?? null,
  );
  const bowWeapon = $derived(
    selectedClass === "ranger"
      ? (mainWeapons.find((w) => w.id === bowId) ?? null)
      : null,
  );
  const meleeWeapon = $derived(
    selectedClass === "ranger" && rangerType === "merc"
      ? (meleeWeapons.find((w) => w.id === meleeWeaponId) ?? null)
      : null,
  );

  // ─── Core formulas ────────────────────────────────────────────────────────────

  // Player.cs:2783: interval = castTime + max(delay * (1 - haste) / 25, 0.25)
  // haste clamped to [0, 0.8]
  function calcInterval(delay: number, cls: PlayerClass): number {
    const haste = Math.min(hastePercent / 100, 0.8);
    const refractory = Math.max((delay * (1 - haste)) / 25, 0.25);
    return CAST_TIME[cls] + refractory;
  }

  // Soft-cap haste: solve refractory = 0.25 → delay*(1-h)/25 = 0.25 → h = 1 - 6.25/delay
  function softCapHaste(delay: number): number {
    return Math.max(0, 1 - 6.25 / delay) * 100;
  }

  // Damage per hit — returns null when required weapons are missing
  function calcDamage(
    cls: PlayerClass,
    rType: RangerType,
    main: WeaponItem | null,
    off: WeaponItem | null,
    bow: WeaponItem | null,
    melee: WeaponItem | null,
    str: number,
    dex: number,
    other: number,
  ): number | null {
    if (cls === "warrior") {
      if (!main) return null;
      // TargetDamageSkill.cs: combat.damage = STR×1.0 + all equip
      return (str + main.strength) * 1.0 + main.damage + other;
    }
    if (cls === "rogue") {
      if (!main) return null;
      // TargetDamageSkill.cs rogue_melee: combat.damage + 50% off-hand
      const offContrib = off ? Math.floor(off.damage * 0.5) : 0;
      const offStr = off ? off.strength : 0;
      return (
        (str + main.strength + offStr) * 1.0 + main.damage + offContrib + other
      );
    }
    if (cls === "ranger") {
      if (!bow) return null;
      // TargetProjectileSkill.cs: combat.damage + DEX×1.5
      // Player: combat.damage subtracts melee slot; merc: no subtraction
      const meleeContrib =
        rType === "merc" && melee ? melee.damage + melee.strength * 1.0 : 0;
      return (
        (str + bow.strength) * 1.0 +
        bow.damage +
        (dex + bow.dexterity) * 1.5 +
        other +
        meleeContrib
      );
    }
    return null;
  }

  // ─── Selected weapon results ──────────────────────────────────────────────────

  // The delay that drives the interval depends on class:
  // - Warrior/Rogue: main weapon delay
  // - Ranger: bow delay
  const activeDelay = $derived(
    selectedClass === "ranger"
      ? (bowWeapon?.weapon_delay ?? null)
      : (mainWeapon?.weapon_delay ?? null),
  );

  const interval = $derived(
    activeDelay !== null ? calcInterval(activeDelay, selectedClass) : null,
  );

  const damagePerHit = $derived(
    calcDamage(
      selectedClass,
      rangerType,
      mainWeapon,
      offWeapon,
      bowWeapon,
      meleeWeapon,
      baseSTR,
      baseDEX,
      otherEquipDmg,
    ),
  );

  const dps = $derived(
    damagePerHit !== null && interval !== null && interval > 0
      ? damagePerHit / interval
      : null,
  );

  const activeSoftCap = $derived(
    activeDelay !== null ? softCapHaste(activeDelay) : null,
  );

  // ─── Comparison table ─────────────────────────────────────────────────────────

  interface CompRow {
    weapon: WeaponItem;
    offWeapon: WeaponItem | null;
    delay: number;
    damage: number;
    interval: number;
    dps: number;
    softCap: number;
    isSelected: boolean;
  }

  const comparisonRows = $derived.by((): CompRow[] => {
    const rows: CompRow[] = [];

    if (selectedClass === "warrior") {
      for (const w of mainWeapons) {
        const dmg = calcDamage(
          "warrior",
          "player",
          w,
          null,
          null,
          null,
          baseSTR,
          baseDEX,
          otherEquipDmg,
        );
        if (dmg === null) continue;
        const iv = calcInterval(w.weapon_delay, "warrior");
        rows.push({
          weapon: w,
          offWeapon: null,
          delay: w.weapon_delay,
          damage: dmg,
          interval: iv,
          dps: dmg / iv,
          softCap: softCapHaste(w.weapon_delay),
          isSelected: w.id === mainWeaponId,
        });
      }
    } else if (selectedClass === "rogue") {
      // For comparison: always use the selected off-hand (or no off-hand if none selected)
      for (const w of mainWeapons) {
        const dmg = calcDamage(
          "rogue",
          "player",
          w,
          offWeapon,
          null,
          null,
          baseSTR,
          baseDEX,
          otherEquipDmg,
        );
        if (dmg === null) continue;
        const iv = calcInterval(w.weapon_delay, "rogue");
        rows.push({
          weapon: w,
          offWeapon: offWeapon,
          delay: w.weapon_delay,
          damage: dmg,
          interval: iv,
          dps: dmg / iv,
          softCap: softCapHaste(w.weapon_delay),
          isSelected: w.id === mainWeaponId,
        });
      }
    } else {
      // Ranger: compare all bows; keep melee weapon selection fixed
      for (const w of mainWeapons) {
        const dmg = calcDamage(
          "ranger",
          rangerType,
          null,
          null,
          w,
          meleeWeapon,
          baseSTR,
          baseDEX,
          otherEquipDmg,
        );
        if (dmg === null) continue;
        const iv = calcInterval(w.weapon_delay, "ranger");
        rows.push({
          weapon: w,
          offWeapon: null,
          delay: w.weapon_delay,
          damage: dmg,
          interval: iv,
          dps: dmg / iv,
          softCap: softCapHaste(w.weapon_delay),
          isSelected: w.id === bowId,
        });
      }
    }

    // Sort
    rows.sort((a, b) => {
      if (sortKey === "dps") return b.dps - a.dps;
      if (sortKey === "damage") return b.damage - a.damage;
      return a.interval - b.interval;
    });

    return rows;
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  function fmt(n: number, dec = 2): string {
    return n.toFixed(dec);
  }

  function resetWeaponSelections() {
    mainWeaponId = "";
    offWeaponId = "";
    bowId = "";
    meleeWeaponId = "";
  }

  const classLabel: Record<PlayerClass, string> = {
    warrior: "Warrior",
    rogue: "Rogue",
    ranger: "Ranger",
  };
</script>

<svelte:head>
  <title>Auto-Attack DPS Simulator - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="Compare weapon DPS for Warrior, Rogue, and Ranger at your stats and haste level. Accounts for Rogue off-hand, Ranger DEX scaling, and the player vs merc distinction."
  />
</svelte:head>

<div class="container mx-auto p-8 space-y-8 max-w-5xl">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mechanics" },
      { label: "Auto-Attack DPS Simulator" },
    ]}
  />

  <div class="space-y-2">
    <h1 class="text-4xl font-bold">Auto-Attack DPS Simulator</h1>
    <p class="text-muted-foreground">
      Models auto-attack DPS only (stab / archer_shot / crush_strike). Does not
      include ability damage.
    </p>
  </div>

  <!-- Class selector -->
  <Card.Root class="bg-muted/30">
    <Card.Header class="pb-3">
      <Card.Title class="text-base">Class</Card.Title>
    </Card.Header>
    <Card.Content>
      <div class="flex flex-wrap gap-2">
        {#each ["warrior", "rogue", "ranger"] as const as cls (cls)}
          <button
            onclick={() => {
              selectedClass = cls;
              resetWeaponSelections();
            }}
            class={[
              "px-4 py-2 rounded-md border text-sm font-medium transition-colors",
              selectedClass === cls
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 border-border hover:bg-muted",
            ].join(" ")}
          >
            {classLabel[cls]}
          </button>
        {/each}
      </div>

      <!-- Ranger player / merc toggle -->
      {#if selectedClass === "ranger"}
        <div class="mt-4 flex gap-2 items-center">
          <span class="text-sm text-muted-foreground">Ranger type:</span>
          {#each ["player", "merc"] as const as rt (rt)}
            <button
              onclick={() => {
                rangerType = rt;
                meleeWeaponId = "";
              }}
              class={[
                "px-3 py-1 rounded-md border text-sm transition-colors",
                rangerType === rt
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 border-border hover:bg-muted",
              ].join(" ")}
            >
              {rt === "player" ? "Player" : "Merc"}
            </button>
          {/each}
          {#if rangerType === "merc"}
            <span class="text-xs text-muted-foreground ml-1">
              Merc counts both bow and melee weapon damage (no slot subtraction)
            </span>
          {/if}
        </div>
      {/if}
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
        <div class="space-y-1">
          <label class="text-sm font-medium" for="base-str">Base STR</label>
          <input
            id="base-str"
            type="number"
            min="0"
            max="9999"
            bind:value={baseSTR}
            class="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>

        {#if selectedClass === "ranger"}
          <div class="space-y-1">
            <label class="text-sm font-medium" for="base-dex">Base DEX</label>
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

        <div class="space-y-1">
          <label class="text-sm font-medium" for="other-equip">
            Other equipment damage bonus
          </label>
          <p class="text-xs text-muted-foreground">
            Total damage from armor, rings, etc. (not weapon slots)
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
      </Card.Content>
    </Card.Root>

    <!-- Weapon selectors -->
    <Card.Root class="bg-muted/30">
      <Card.Header class="pb-3">
        <Card.Title class="text-base">Weapons</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        {#if selectedClass === "warrior"}
          <div class="space-y-1">
            <label class="text-sm font-medium" for="main-weapon">Weapon</label>
            <select
              id="main-weapon"
              bind:value={mainWeaponId}
              class="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">-- none (use comparison table) --</option>
              {#each mainWeapons as w (w.id)}
                <option
                  value={w.id}
                  class={getQualityTextColorClass(w.quality)}
                >
                  {w.name} (delay={w.weapon_delay}, dmg={w.damage}{w.strength >
                  0
                    ? ", +" + w.strength + " STR"
                    : ""})
                </option>
              {/each}
            </select>
          </div>
        {:else if selectedClass === "rogue"}
          <div class="space-y-1">
            <label class="text-sm font-medium" for="main-weapon"
              >Main-hand Dagger</label
            >
            <select
              id="main-weapon"
              bind:value={mainWeaponId}
              class="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">-- none (use comparison table) --</option>
              {#each mainWeapons as w (w.id)}
                <option
                  value={w.id}
                  class={getQualityTextColorClass(w.quality)}
                >
                  {w.name} (delay={w.weapon_delay}, dmg={w.damage}{w.strength >
                  0
                    ? ", +" + w.strength + " STR"
                    : ""})
                </option>
              {/each}
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-sm font-medium" for="off-weapon"
              >Off-hand Dagger</label
            >
            <p class="text-xs text-muted-foreground">
              Off-hand contributes 50% of its damage + full STR bonus
            </p>
            <select
              id="off-weapon"
              bind:value={offWeaponId}
              class="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">-- none --</option>
              {#each offHandWeapons as w (w.id)}
                <option
                  value={w.id}
                  class={getQualityTextColorClass(w.quality)}
                >
                  {w.name} (delay={w.weapon_delay}, dmg={w.damage}{w.strength >
                  0
                    ? ", +" + w.strength + " STR"
                    : ""})
                </option>
              {/each}
            </select>
          </div>
        {:else}
          <div class="space-y-1">
            <label class="text-sm font-medium" for="bow-weapon">Bow</label>
            <select
              id="bow-weapon"
              bind:value={bowId}
              class="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">-- none (use comparison table) --</option>
              {#each mainWeapons as w (w.id)}
                <option
                  value={w.id}
                  class={getQualityTextColorClass(w.quality)}
                >
                  {w.name} (delay={w.weapon_delay}, dmg={w.damage}{w.dexterity >
                  0
                    ? ", +" + w.dexterity + " DEX"
                    : ""})
                </option>
              {/each}
            </select>
          </div>
          {#if rangerType === "merc"}
            <div class="space-y-1">
              <label class="text-sm font-medium" for="melee-weapon"
                >Melee Weapon (merc only)</label
              >
              <select
                id="melee-weapon"
                bind:value={meleeWeaponId}
                class="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              >
                <option value="">-- none --</option>
                {#each meleeWeapons as w (w.id)}
                  <option
                    value={w.id}
                    class={getQualityTextColorClass(w.quality)}
                  >
                    {w.name} (dmg={w.damage}{w.strength > 0
                      ? ", +" + w.strength + " STR"
                      : ""})
                  </option>
                {/each}
              </select>
            </div>
          {/if}
        {/if}
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Results card (only when a weapon is selected) -->
  {#if interval !== null && damagePerHit !== null && dps !== null && activeDelay !== null}
    <Card.Root class="bg-muted/30 border-primary/30">
      <Card.Header class="pb-3">
        <Card.Title class="text-base">
          Results
          {#if selectedClass === "warrior" && mainWeapon}
            — {mainWeapon.name}
          {:else if selectedClass === "rogue" && mainWeapon}
            — {mainWeapon.name}{offWeapon ? " + " + offWeapon.name : ""}
          {:else if selectedClass === "ranger" && bowWeapon}
            — {bowWeapon.name}{meleeWeapon ? " + " + meleeWeapon.name : ""}
          {/if}
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <dt class="text-xs text-muted-foreground mb-1">Attack Interval</dt>
            <dd class="text-2xl font-mono font-semibold">
              {fmt(interval)}s
            </dd>
            <dd class="text-xs text-muted-foreground mt-1">
              {fmt(CAST_TIME[selectedClass], 1)}s cast + {fmt(
                interval - CAST_TIME[selectedClass],
              )}s refractory
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
              Soft-cap Haste (delay={activeDelay})
            </dt>
            <dd class="text-2xl font-mono font-semibold">
              {fmt(activeSoftCap ?? 0, 1)}%
            </dd>
            <dd class="text-xs text-muted-foreground mt-1">
              haste beyond this has no effect
            </dd>
          </div>
        </dl>

        <!-- Formula breakdown -->
        <div
          class="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground space-y-1"
        >
          <p class="font-medium text-foreground">Formula</p>
          {#if selectedClass === "warrior" && mainWeapon}
            <p>
              Damage = (STR {baseSTR} + weapon STR {mainWeapon.strength}) +
              weapon damage {mainWeapon.damage} + other {otherEquipDmg}
              = {Math.round(damagePerHit)}
            </p>
          {:else if selectedClass === "rogue" && mainWeapon}
            <p>
              Damage = (STR {baseSTR} + main STR {mainWeapon.strength}{offWeapon
                ? " + off STR " + offWeapon.strength
                : ""}) + main dmg {mainWeapon.damage}{offWeapon
                ? " + floor(" +
                  offWeapon.damage +
                  " × 0.5) = " +
                  Math.floor(offWeapon.damage * 0.5)
                : ""} + other {otherEquipDmg} = {Math.round(damagePerHit)}
            </p>
          {:else if selectedClass === "ranger" && bowWeapon}
            <p>
              Damage = (STR {baseSTR} + bow STR {bowWeapon.strength}) + bow dmg {bowWeapon.damage}
              + (DEX {baseDEX} + bow DEX {bowWeapon.dexterity}) × 1.5{rangerType ===
                "merc" && meleeWeapon
                ? " + melee dmg " +
                  meleeWeapon.damage +
                  " + melee STR " +
                  meleeWeapon.strength
                : ""} + other {otherEquipDmg} = {Math.round(damagePerHit)}
            </p>
          {/if}
          <p>
            Interval = {fmt(CAST_TIME[selectedClass], 1)}s + max({activeDelay} × (1
            − {hastePercent}%) / 25, 0.25s) = {fmt(interval)}s
          </p>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Comparison table -->
  <Card.Root class="bg-muted/30">
    <Card.Header class="pb-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <Card.Title class="text-base">
          All {classLabel[selectedClass]} Weapons — DPS at Current Settings
        </Card.Title>
        <div class="flex gap-1 text-xs">
          <span class="text-muted-foreground mr-1">Sort by:</span>
          {#each [["dps", "DPS"], ["damage", "Damage"], ["interval", "Interval"]] as const as [key, label] (key)}
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
    </Card.Header>
    <Card.Content class="p-0">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border text-muted-foreground text-xs">
              <th class="text-left px-4 py-2 font-medium">Weapon</th>
              {#if selectedClass === "rogue"}
                <th class="text-left px-4 py-2 font-medium">Off-hand</th>
              {/if}
              <th class="text-right px-4 py-2 font-medium">Delay</th>
              <th class="text-right px-4 py-2 font-medium">Soft-cap %</th>
              <th class="text-right px-4 py-2 font-medium">Dmg/Hit</th>
              <th class="text-right px-4 py-2 font-medium">Interval</th>
              <th class="text-right px-4 py-2 font-medium font-semibold">DPS</th
              >
            </tr>
          </thead>
          <tbody>
            {#each comparisonRows as row, i (row.weapon.id)}
              <tr
                class={[
                  "border-b border-border/50 hover:bg-muted/30 transition-colors",
                  row.isSelected ? "bg-primary/5 border-primary/20" : "",
                ].join(" ")}
              >
                <td class="px-4 py-2">
                  <span class={getQualityTextColorClass(row.weapon.quality)}>
                    {row.weapon.name}
                  </span>
                  {#if i === 0}
                    <span class="ml-1 text-xs text-muted-foreground font-normal"
                      >(best)</span
                    >
                  {/if}
                  {#if row.isSelected}
                    <span class="ml-1 text-xs text-primary">(selected)</span>
                  {/if}
                </td>
                {#if selectedClass === "rogue"}
                  <td class="px-4 py-2 text-muted-foreground">
                    {row.offWeapon ? row.offWeapon.name : "—"}
                  </td>
                {/if}
                <td class="px-4 py-2 text-right font-mono text-xs">
                  {row.delay}
                </td>
                <td class="px-4 py-2 text-right font-mono text-xs">
                  {fmt(row.softCap, 1)}%
                </td>
                <td class="px-4 py-2 text-right font-mono">
                  {Math.round(row.damage).toLocaleString()}
                </td>
                <td class="px-4 py-2 text-right font-mono">
                  {fmt(row.interval)}s
                </td>
                <td class="px-4 py-2 text-right font-mono font-semibold">
                  {fmt(row.dps)}
                </td>
              </tr>
            {/each}
            {#if comparisonRows.length === 0}
              <tr>
                <td
                  colspan="7"
                  class="px-4 py-8 text-center text-muted-foreground text-sm"
                >
                  No weapons found for this class.
                </td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Timing formula reference -->
  <Card.Root class="bg-muted/30">
    <Card.Header class="pb-3">
      <Card.Title class="text-base">Formula Reference</Card.Title>
    </Card.Header>
    <Card.Content class="space-y-3 text-sm">
      <div>
        <p class="font-medium mb-1">Attack Interval (Player.cs:2783)</p>
        <p class="font-mono text-xs bg-muted px-3 py-2 rounded">
          interval = cast_time + max(delay &times; (1 &minus; haste) / 25,
          0.25s)
        </p>
        <ul class="mt-2 text-xs text-muted-foreground space-y-0.5">
          <li>
            cast_time: Rogue stab = 0.4s, Ranger archer_shot = 0.8s, Warrior
            crush_strike = 0.5s
          </li>
          <li>
            Soft-cap: h = 1 &minus; 6.25 / delay (refractory hits the 0.25s
            floor)
          </li>
          <li>Haste hard cap: 80%</li>
        </ul>
      </div>
      <div>
        <p class="font-medium mb-1">Damage per Hit</p>
        <ul class="text-xs text-muted-foreground space-y-0.5">
          <li>
            <span class="font-medium text-foreground">Warrior:</span> (STR + weapon
            STR) &times; 1.0 + weapon damage + other equip
          </li>
          <li>
            <span class="font-medium text-foreground">Rogue:</span> (STR + main STR
            + off STR) &times; 1.0 + main damage + floor(off damage &times; 0.5) +
            other equip
          </li>
          <li>
            <span class="font-medium text-foreground">Ranger (player):</span>
            (STR + bow STR) &times; 1.0 + bow damage + (DEX + bow DEX) &times;
            1.5 + other equip
            <em class="ml-1">(melee weapon slot subtracted by server)</em>
          </li>
          <li>
            <span class="font-medium text-foreground">Ranger (merc):</span> same
            + melee weapon damage + melee STR &times; 1.0
            <em class="ml-1">(no subtraction)</em>
          </li>
        </ul>
      </div>
      <p class="text-xs text-muted-foreground">
        This simulator models base auto-attack DPS before mitigation, variance
        (&times;0.9&ndash;1.1), crit, and defense. It does not model ability
        cooldowns, rage/mana costs, or proc effects.
      </p>
    </Card.Content>
  </Card.Root>
</div>
