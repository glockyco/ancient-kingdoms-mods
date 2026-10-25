<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MercenaryNav from "$lib/components/MercenaryNav.svelte";
  import NumberField from "$lib/components/NumberField.svelte";
  import RangeSlider from "$lib/components/RangeSlider.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Calculation from "$lib/components/Calculation.svelte";
  import {
    mercenaryStats,
    mercenaryHiringOdds,
  } from "$lib/calculation/mercenary-stats";
  import { formatPercent, formatNumber } from "$lib/utils/format";
  import { statName, formatStat } from "$lib/stats";
  import type { StatId } from "$lib/generated/stat-vocabulary";
  import {
    OWNER_LIMITS,
    mercenaryOwner,
    setMercenaryOwner,
  } from "$lib/utils/mercenary-owner.svelte";
  import { loadRemembered } from "$lib/calculation/remembered.svelte";
  import { onMount } from "svelte";
  import {
    CLASSES,
    RACE_ORDER,
    charismaDiscount,
    classCanBe,
    computeAll,
    obtainableRaces,
    hirePrice,
    pAtLeast,
    pHealthAtLeast,
    pManaAtLeast,
    pRaceAtRecruiter,
    type ClassResult,
    type MercRow,
  } from "$lib/utils/merc-stats";
  import { SvelteSet } from "svelte/reactivity";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  type StatKey = "hp" | "mana" | "atk" | "spell";
  type TargetKey = "hp" | "mana" | "atk";

  const CLASS_NAMES = Object.keys(CLASSES);
  const ATTRS: Record<string, StatId> = {
    STR: "strength",
    CON: "constitution",
    DEX: "dexterity",
    INT: "intelligence",
    WIS: "wisdom",
    CHA: "charisma",
  };
  const STAT_HUE: Record<StatKey, string> = {
    hp: "var(--stat-hp)",
    mana: "var(--stat-mana)",
    atk: "var(--stat-atk)",
    spell: "var(--stat-spell)",
  };
  const STAT_IDS: Record<StatKey, StatId> = {
    hp: "health",
    mana: "mana",
    atk: "attack_power",
    spell: "spell_power",
  };
  const RANGE_NOTE = "Base range before equipment or buffs.";
  const TARGET_LABELS: Record<TargetKey, string> = {
    hp: "Maximum Hit Points",
    mana: "Maximum Mana",
    atk: `${statName(STAT_IDS.atk)} / ${statName(STAT_IDS.spell)}`,
  };

  const goldFmt = (n: number) =>
    n >= 1e6
      ? formatNumber(n / 1e6, {
          decimals: n >= 1e7 ? 0 : 1,
          trailingZeros: true,
        }).replace(/\.0$/, "") + "M"
      : n >= 1e4
        ? formatNumber(n / 1e3, { decimals: 0 }) + "k"
        : n >= 1e3
          ? formatNumber(n / 1e3, {
              decimals: 1,
              trailingZeros: true,
            }).replace(/\.0$/, "") + "k"
          : formatNumber(Math.round(n));

  const level = $derived(mercenaryOwner.level);
  const veteran = $derived(mercenaryOwner.veteran);
  let active = new SvelteSet(CLASS_NAMES);
  let cCls = $state("Wizard");
  let cRace = $state<string>(CLASSES["Wizard"].pool[0]);
  /** Explicit recruiter choice; empty means "the one that hires the chosen race". */
  let cRecruiter = $state<string>("");
  const cCharisma = $derived(mercenaryOwner.charisma);

  onMount(loadRemembered);
  let frac = $state<Record<TargetKey, number>>({
    hp: 0.5,
    mana: 0.5,
    atk: 0.5,
  });

  const results = $derived(computeAll(level, veteran, data.curves));
  const shown = $derived(results.filter((c) => active.has(c.cls)));
  const cd = $derived(results.find((c) => c.cls === cCls)!);
  const row = $derived(cd.rows.find((r) => r.race === cRace)!);
  const meaningful = $derived<TargetKey[]>(
    cd.hasMana ? ["hp", "mana", "atk"] : ["hp", "atk"],
  );
  /** Races every listed recruiter can hire, in class-pool order. */
  const preferredRaces = $derived(
    data.taverns.map((t) => t.preferred_race).filter((r) => r !== ""),
  );
  const classRaceOptions = $derived(
    RACE_ORDER.filter((r) => classCanBe(cCls, r)),
  );
  const listedByClass = $derived(
    Object.fromEntries(
      CLASS_NAMES.map((cls) => [cls, obtainableRaces(cls, preferredRaces)]),
    ) as Record<string, string[]>,
  );
  const discount = $derived(charismaDiscount(cCharisma));
  const price = $derived(hirePrice(level, veteran, discount));
  const recruiter = $derived(
    cRecruiter || recruiterFor(cCls, cRace) || data.taverns[0]?.npc_name || "",
  );
  const preferredRace = $derived(preferredRaceOf(recruiter));
  const pRace = $derived(pRaceAtRecruiter(cCls, cRace, preferredRace));
  const targetReadout = $derived.by(() =>
    buildTargetReadout(cd, row, meaningful, veteran, frac),
  );
  const pRolls = $derived(
    meaningful.reduce((a, k) => a * targetReadout[k].p, 1),
  );
  const pTotal = $derived(pRace * pRolls);
  const avgHires = $derived(pTotal > 0 ? 1 / pTotal : Number.POSITIVE_INFINITY);
  const avgGold = $derived(
    pTotal > 0 ? price * avgHires : Number.POSITIVE_INFINITY,
  );
  const impossibleText = $derived(impossibleMessage());
  const chartSvg = $derived(
    pRace > 0 && pRolls > 0
      ? drawChart(price, pRace, meaningful.length, pRolls)
      : "",
  );

  function toggleClass(cls: string) {
    if (active.has(cls)) active.delete(cls);
    else active.add(cls);
    if (active.size === 0) for (const c of CLASS_NAMES) active.add(c);
  }

  function columnsFor(c: ClassResult): StatKey[] {
    return c.hasMana ? ["hp", "mana", "atk", "spell"] : ["hp", "atk", "spell"];
  }

  function statRange(r: MercRow, k: StatKey): [number, number] {
    return r[k] as [number, number];
  }

  function columnDomains(
    c: ClassResult,
    cols: StatKey[],
  ): Record<StatKey, [number, number]> {
    const out = {} as Record<StatKey, [number, number]>;
    for (const k of cols) {
      let lo = Infinity;
      let hi = -Infinity;
      for (const r of c.rows) {
        const cell = r[k];
        if (!r.eligible || !cell) continue;
        lo = Math.min(lo, cell[0]);
        hi = Math.max(hi, cell[1]);
      }
      out[k] = [lo, hi];
    }
    return out;
  }

  function barStyle(
    [lo, hi]: [number, number],
    [dlo, dhi]: [number, number],
    hue: string,
  ) {
    const span = dhi - dlo || 1;
    const left = ((lo - dlo) / span) * 100;
    const width = Math.max(2, ((hi - lo) / span) * 100);
    return `left:${left}%; width:${width}%; background:${hue}`;
  }

  function targetRange(r: MercRow, k: TargetKey): [number, number] {
    return k === "mana"
      ? (r.mana as [number, number])
      : (r[k] as [number, number]);
  }

  function buildTargetReadout(
    classData: ClassResult,
    selectedRow: MercRow,
    keys: TargetKey[],
    veteranPoints: number,
    fractions: Record<TargetKey, number>,
  ) {
    const out = {} as Record<
      TargetKey,
      { value: number; p: number; spellValue?: number }
    >;
    for (const k of keys) {
      const [lo, hi] = targetRange(selectedRow, k);
      const value = Math.round(lo + (fractions[k] ?? 0) * (hi - lo));
      const p =
        k === "atk"
          ? pAtLeast(selectedRow.atk as [number, number], value)
          : k === "hp"
            ? pHealthAtLeast(classData, cRace, veteranPoints, value)
            : pManaAtLeast(classData, cRace, veteranPoints, value);
      out[k] =
        k === "atk"
          ? {
              value,
              p,
              spellValue:
                (selectedRow.spell as [number, number])[0] +
                (value - (selectedRow.atk as [number, number])[0]),
            }
          : { value, p };
    }
    return out;
  }

  function setFrac(k: TargetKey, v: number) {
    frac = { ...frac, [k]: Math.max(0, Math.min(1, v)) };
  }

  /** The recruiter whose preference yields this race for this class, if any. */
  function recruiterFor(cls: string, race: string): string | null {
    if (!classCanBe(cls, race)) return null;
    return (
      data.taverns.find((t) => t.preferred_race === race)?.npc_name ?? null
    );
  }

  function preferredRaceOf(npcName: string): string | null {
    const t = data.taverns.find((x) => x.npc_name === npcName);
    return t && t.preferred_race ? t.preferred_race : null;
  }

  /** Switch to the recruiter that hires the chosen race, when one is released. */
  function fixRecruiter() {
    if (pRaceAtRecruiter(cCls, cRace, preferredRaceOf(cRecruiter)) > 0) return;
    const better = recruiterFor(cCls, cRace);
    if (better) cRecruiter = better;
  }

  function onClassChange(v: string) {
    cCls = v;
    if (!classCanBe(v, cRace))
      cRace = RACE_ORDER.find((r) => classCanBe(v, r))!;
    fixRecruiter();
  }

  function onRaceChange(v: string) {
    cRace = v;
    fixRecruiter();
  }

  function onRecruiterChange(v: string) {
    cRecruiter = v;
  }

  // Source: server-scripts/Utils.cs:GetRandomChar — invalid preferences roll the class pool.
  function recruiterSpecialty(preferred: string) {
    return preferred && classCanBe(cCls, preferred)
      ? `hires ${preferred}`
      : "random race for this class";
  }

  function impossibleMessage() {
    if (pRace !== 0) return "";
    if (!classCanBe(cCls, cRace)) return `A ${cCls} cannot be ${cRace}.`;
    if (!listedByClass[cCls].includes(cRace))
      return `No recruiter hires ${cRace}, so you cannot hire a ${cRace} ${cCls}.`;
    if (preferredRace)
      return `${recruiter} always hires ${preferredRace} for ${cCls}, not ${cRace}. Choose another recruiter.`;
    return "";
  }

  function drawChart(
    chartPrice: number,
    chartPRace: number,
    k: number,
    chartPRolls: number,
  ) {
    const W = 640;
    const H = 240;
    const L = 56;
    const R = 624;
    const T = 14;
    const B = 208;
    const tMin = 0.05;
    const tMax = 1;
    const goldOf = (t: number) => chartPrice / (chartPRace * Math.pow(t, k));
    const gMin = goldOf(tMax);
    const gMax = goldOf(tMin);
    const lg = Math.log10;
    const xOf = (t: number) => L + ((tMax - t) / (tMax - tMin)) * (R - L);
    const yOf = (g: number) =>
      B - ((lg(g) - lg(gMin)) / (lg(gMax) - lg(gMin) || 1)) * (B - T);
    const pts: string[] = [];
    for (let i = 0; i <= 80; i++) {
      const t = tMax - (tMax - tMin) * (i / 80);
      pts.push(`${xOf(t).toFixed(1)},${yOf(goldOf(t)).toFixed(1)}`);
    }
    let grid = "";
    for (let e = Math.ceil(lg(gMin)); e <= Math.floor(lg(gMax)); e++) {
      const g = Math.pow(10, e);
      const y = yOf(g);
      grid += `<line class="axis" x1="${L}" y1="${y.toFixed(1)}" x2="${R}" y2="${y.toFixed(1)}" opacity="0.5"/><text x="${L - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end">${goldFmt(g)}</text>`;
    }
    let xt = "";
    for (const t of [1, 0.75, 0.5, 0.25, 0.1, 0.05]) {
      xt += `<text x="${xOf(t).toFixed(1)}" y="${B + 16}" text-anchor="middle">${formatPercent(t, { decimals: 0 })}</text>`;
    }
    let dots = "";
    for (const t of [0.25, 0.1, 0.05])
      dots += `<circle class="ref" cx="${xOf(t).toFixed(1)}" cy="${yOf(goldOf(t)).toFixed(1)}" r="2.5"/>`;
    const tEff = chartPRolls > 0 ? Math.pow(chartPRolls, 1 / k) : 1;
    const tx = Math.max(tMin, Math.min(tMax, tEff));
    const x = xOf(tx);
    const y = yOf(goldOf(tx));
    const now = `<line class="nowline" x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${B}"/><line class="nowline" x1="${L}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/><circle class="now" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Expected gold versus demanded roll quality">
      <line class="axis" x1="${L}" y1="${T}" x2="${L}" y2="${B}"/>
      <line class="axis" x1="${L}" y1="${B}" x2="${R}" y2="${B}"/>
      ${grid}${xt}
      <polyline class="curve" points="${pts.join(" ")}"/>
      ${dots}${now}
      <text x="${(L + R) / 2}" y="${H - 2}" text-anchor="middle">Top percentage accepted for each stat roll</text>
    </svg>`;
  }
</script>

<Seo
  title="Mercenary Stat Ranges - Ancient Kingdoms"
  description="Compare possible maximum Hit Points, maximum Mana, Attack Power, and Spell Power for every mercenary race and class, by your level and total veteran points, plus hiring odds and expected costs."
  path="/mechanics/mercenary-stats"
/>

<div class="wrap">
  <div class="topbar">
    <Breadcrumb
      items={[
        { label: "Home", href: "/" },
        { label: "Mechanics", href: "/mechanics" },
        { label: "Mercenary stat ranges" },
      ]}
    />
  </div>

  <div class="mt-4 mb-8">
    <MercenaryNav mercenaries={data.links} current="stat-ranges" />
  </div>

  <h1>Mercenary stat ranges</h1>

  <details class="howto">
    <summary>How to read these ranges</summary>
    <div class="howto-body">
      <p>
        Set your level and total veteran points to compare stats without gear.
        Each mercenary keeps the rolls from when you hired them. Maximum Hit
        Points and maximum Mana roll separately. Attack Power and Spell Power
        share one roll.
      </p>
      <p>
        Hiring at a higher level gives you a chance at higher Attack Power and
        Spell Power bonuses. Mercenaries gain stats as your level and total
        veteran points rise.
      </p>
      <p>
        If a recruiter cannot hire its preferred race for your class, it picks a
        random race available to that class. A dash marks an unavailable class
        and race combination. Drassar cannot be hired.
      </p>
      <p>
        Warriors and Rogues use Rage, and Bards use songs instead of Mana. See <a
          href="/mercenaries#how-it-works">mercenary growth and skill ranks</a
        >.
      </p>
      <Calculation
        calculation={mercenaryStats(cd, level, veteran, data.curves, cRace)}
      />
    </div>
  </details>

  <section class="controls" aria-label="Query controls">
    <div class="controls-grid">
      <NumberField
        label="Level"
        hint="mercenaries unlock at level 10"
        value={level}
        min={OWNER_LIMITS.level[0]}
        max={OWNER_LIMITS.level[1]}
        onchange={(v) => setMercenaryOwner("level", v)}
      />
      <!-- Source: server-scripts/Player.cs:CmdBuyMercenary; UICharacterInfo.cs:Update — VT adds base-resource multipliers and both combat-power bonuses. -->
      <NumberField
        label="Total veteran points"
        hint="increases stats and skill ranks"
        value={veteran}
        min={OWNER_LIMITS.veteran[0]}
        max={OWNER_LIMITS.veteran[1]}
        onchange={(v) => setMercenaryOwner("veteran", v)}
      />
      <div class="chips">
        <span class="chips-label">Classes</span>
        <button
          type="button"
          class="chip"
          aria-pressed={active.size === CLASS_NAMES.length}
          onclick={() => {
            if (active.size === CLASS_NAMES.length) active.clear();
            else {
              active.clear();
              for (const cls of CLASS_NAMES) active.add(cls);
            }
          }}>All</button
        >
        {#each CLASS_NAMES as cls (cls)}
          <button
            type="button"
            class="chip"
            aria-pressed={active.has(cls)}
            onclick={() => toggleClass(cls)}>{cls}</button
          >
        {/each}
      </div>
    </div>
  </section>

  <div>
    {#each shown as c (c.cls)}
      {@const cols = columnsFor(c)}
      {@const dom = columnDomains(c, cols)}
      <section class="class-sec">
        <div class="class-head">
          <div class="class-id">
            <span class="class-name">{c.cls}</span>
            <span class={`resource ${c.role === "energy" ? "rage" : "mana"}`}
              >{c.resource === "Songs"
                ? c.resource
                : statName(c.resource)}</span
            >
          </div>
          <div class="class-meta">
            <span class="basehp"
              >Base {statName("health")}
              <b class="tnum">{formatStat("health", c.hpCurve)}</b></span
            >
            <span class="attrs">
              {#each Object.entries(ATTRS) as [key, id] (key)}<span class="attr"
                  >{statName(id)}<b>{formatStat(id, c.attrs[key])}</b></span
                >{/each}
            </span>
          </div>
        </div>
        <div class="tscroll">
          <table>
            <thead>
              <tr>
                <th>Race</th>
                {#each cols as k (k)}
                  <th title={RANGE_NOTE}
                    ><span class="colmark" style={`background:${STAT_HUE[k]}`}
                    ></span>{statName(STAT_IDS[k])}</th
                  >
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each RACE_ORDER as race (race)}
                {@const r = c.rows.find((x) => x.race === race)!}
                <tr class:ineligible={!r.eligible}>
                  <td class="race"
                    >{race}{#if r.eligible && !listedByClass[c.cls].includes(race)}<span
                        class="racenote"
                        title="No recruiter hires this race."
                        >cannot be hired</span
                      >{:else if r.preferredOnly}<span
                        class="racenote"
                        title="Only a recruiter that prefers this race can hire it for this class."
                        >recruiter only</span
                      >{/if}</td
                  >
                  {#if r.eligible}
                    {#each cols as k (k)}
                      {@const cell = statRange(r, k)}
                      {@const low = formatStat(STAT_IDS[k], cell[0])}
                      {@const high = formatStat(STAT_IDS[k], cell[1])}
                      <td class="cell">
                        <div class="cell-val">
                          <!-- The lower bound and separator are muted, so this range spells out formatRange's " - ". The outer span keeps the spaces, which a flex item would trim. -->
                          <span><span class="lo">{low} -</span> {high}</span>
                        </div>
                        <div class="bar">
                          <span style={barStyle(cell, dom[k], STAT_HUE[k])}
                          ></span>
                        </div>
                      </td>
                    {/each}
                  {:else}
                    {#each cols as k (k)}<td class="na">–</td>{/each}
                  {/if}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {/each}
  </div>

  <section class="cost-sec" aria-label="Hiring cost and odds">
    <h2>Hiring odds &amp; cost</h2>
    <p class="sub">
      Choose a class, race, and recruiter, then set the lowest stats you would
      accept. The calculator shows your chance per hire and average gold cost.
      <!-- Source: server-scripts/UIMercenaries.cs:ButtonSummonMercenary; Player.cs:CmdBuyMercenary — hiring checks active limits below level 40 and the ten-mercenary roster cap. -->
      <span class="block">
        Each hire joins your party if there is room. Below level 40, dismiss an
        active mercenary before hiring again if you are at your active limit. If
        you already have 10 mercenaries, delete one before hiring another.
      </span>
    </p>
    <div class="cost-grid">
      <div class="cost-inputs">
        <div class="field-grid">
          <label class="field"
            ><span>Class</span>
            <select
              value={cCls}
              onchange={(e) => onClassChange(e.currentTarget.value)}
            >
              {#each CLASS_NAMES as cls (cls)}<option value={cls}>{cls}</option
                >{/each}
            </select>
          </label>
          <label class="field"
            ><span>Race</span>
            <select
              value={cRace}
              onchange={(e) => onRaceChange(e.currentTarget.value)}
            >
              {#each classRaceOptions as race (race)}<option value={race}
                  >{race}</option
                >{/each}
            </select>
          </label>
          <label class="field span2"
            ><span>Recruiter</span>
            <select
              value={recruiter}
              onchange={(e) => onRecruiterChange(e.currentTarget.value)}
            >
              {#each data.taverns as tavern (tavern.npc_name)}
                <option value={tavern.npc_name}
                  >{tavern.zone_name} · {tavern.npc_name} ({recruiterSpecialty(
                    tavern.preferred_race,
                  )})</option
                >
              {/each}
            </select>
          </label>
          <label class="field"
            ><span>Your Charisma</span>
            <input
              class="num-in"
              type="number"
              min={OWNER_LIMITS.charisma[0]}
              max={OWNER_LIMITS.charisma[1]}
              value={cCharisma}
              inputmode="numeric"
              oninput={(e) =>
                setMercenaryOwner("charisma", e.currentTarget.valueAsNumber)}
            />
          </label>
          <div class="field">
            <span>Hire discount</span><span class="disc-val"
              >{discount > 0
                ? `−${formatPercent(discount, {
                    decimals: 2,
                    preserveNonzero: true,
                  })}`
                : "No discount"}</span
            >
          </div>
        </div>
        <div class="targets">
          {#each meaningful as k (k)}
            {@const read = targetReadout[k]}
            <div class="target">
              <div class="target-head">
                <span class="name"
                  ><span class="colmark" style={`background:${STAT_HUE[k]}`}
                  ></span>{TARGET_LABELS[k]}</span
                >
                <span class="top"
                  >top {formatPercent(read.p, {
                    decimals: 2,
                    preserveNonzero: true,
                  })}</span
                >
              </div>
              <RangeSlider
                value={Math.round((frac[k] ?? 0) * 1000)}
                min={0}
                max={1000}
                label={`Minimum ${TARGET_LABELS[k]}`}
                onchange={(v) => setFrac(k, v / 1000)}
              />
              <div class="sub">
                {#if k === "atk"}
                  {statName("attack_power")} ≥
                  <b>{formatStat("attack_power", read.value)}</b>
                  · {statName("spell_power")}
                  ≥
                  <b>{formatStat("spell_power", read.spellValue ?? 0)}</b>
                {:else}
                  ≥ <b>{formatStat(STAT_IDS[k], read.value)}</b>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
      <div class="cost-outputs">
        <div class="stats3">
          <div class="stat3">
            <span class="k">Qualifying hire chance</span><span class="v"
              >{formatPercent(pTotal, {
                decimals: 2,
                preserveNonzero: true,
              })}</span
            >
          </div>
          <div class="stat3">
            <span class="k">Expected hires</span><span class="v"
              >{Number.isFinite(avgHires)
                ? `about ${formatNumber(avgHires, { decimals: 1 })}`
                : "∞"}</span
            >
          </div>
          <div class="stat3">
            <span class="k">Expected gold</span><span class="v"
              >{Number.isFinite(avgGold)
                ? `about ${formatNumber(Math.round(avgGold))}`
                : "∞"}</span
            >
          </div>
        </div>
        {#if pRace === 0 && impossibleText}
          <p class="eq zero">{impossibleText}</p>
        {:else}
          <div class="text-sm">
            <Calculation
              calculation={mercenaryHiringOdds(pRace, pRolls, price)}
            />
          </div>
          <!-- eslint-disable-next-line svelte/no-at-html-tags — drawChart returns static SVG assembled from numeric inputs and fixed labels. -->
          <div id="c-chart">{@html chartSvg}</div>
          <p class="chart-cap">
            <span class="block"
              >Average gold cost to get your chosen race with at least these
              stats.</span
            >
            <span class="block"
              >Lower percentages demand stronger hires. At 25%, you accept only
              the best quarter of each stat roll. The dot marks the single
              percentage that gives your overall stat-roll chance when applied
              to every roll, so it may not line up with any one slider.</span
            >
          </p>
        {/if}
      </div>
    </div>
  </section>
</div>

<style>
  .tnum {
    font-variant-numeric: tabular-nums;
  }
  .wrap {
    max-width: 1120px;
    margin: 0 auto;
    padding: 1.5rem 1.5rem 5rem;
  }
  .topbar {
    display: block;
    margin-bottom: 0;
  }
  h1 {
    font-size: 2rem;
    line-height: 1.1;
    letter-spacing: -0.02em;
    margin: 0 0 0.5rem;
    font-weight: 700;
    text-wrap: balance;
  }

  .controls {
    z-index: 20;
    background: color-mix(in oklab, var(--background) 86%, transparent);
    backdrop-filter: blur(12px) saturate(1.4);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.1rem 1.25rem;
    margin-bottom: 2.5rem;
    box-shadow: 0 1px 2px oklch(0 0 0 / 0.04);
  }
  @media (min-width: 768px) and (min-height: 720px) {
    .controls {
      position: sticky;
      top: 0;
    }
  }
  .controls-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem 2.5rem;
    align-items: start;
  }
  @media (max-width: 720px) {
    .controls-grid {
      grid-template-columns: 1fr;
      gap: 1.25rem;
    }
  }

  .chips {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    padding-top: 1.1rem;
    border-top: 1px solid var(--border);
    margin-top: 1rem;
  }
  .chips-label {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted-foreground);
    margin-right: 0.25rem;
    align-self: center;
  }
  .chip {
    font-size: 0.8125rem;
    font-weight: 500;
    padding: 0.3rem 0.7rem;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--muted-foreground);
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .chip:hover {
    color: var(--foreground);
    border-color: var(--ring);
  }
  .chip[aria-pressed="true"] {
    background: var(--primary);
    color: var(--primary-foreground);
    border-color: var(--primary);
  }
  .chip:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 40%, transparent);
  }

  .class-sec {
    margin-bottom: 2.75rem;
  }
  .class-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 0.85rem;
  }
  .class-id {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }
  .class-name {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .resource {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    border: 1px solid;
  }
  .resource.mana {
    color: var(--stat-mana);
    border-color: color-mix(in oklab, var(--stat-mana) 35%, transparent);
    background: color-mix(in oklab, var(--stat-mana) 10%, transparent);
  }
  .resource.rage {
    color: var(--stat-atk);
    border-color: color-mix(in oklab, var(--stat-atk) 35%, transparent);
    background: color-mix(in oklab, var(--stat-atk) 10%, transparent);
  }
  .class-meta {
    display: flex;
    gap: 1.25rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .attrs {
    display: flex;
    gap: 0.9rem;
    flex-wrap: wrap;
    font-size: 0.8125rem;
  }
  .attr {
    color: var(--muted-foreground);
  }
  .attr b {
    color: var(--foreground);
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    margin-left: 0.15rem;
  }
  .basehp {
    color: var(--muted-foreground);
    font-size: 0.8125rem;
  }
  .basehp b {
    color: var(--foreground);
    font-weight: 600;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }
  .tscroll {
    overflow-x: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  thead th {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--muted-foreground);
    text-align: right;
    padding: 0.6rem 0.9rem;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  thead th:first-child {
    text-align: left;
  }
  .colmark {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 2px;
    margin-right: 0.35rem;
    vertical-align: middle;
  }
  tbody td {
    padding: 0.55rem 0.9rem;
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }
  tbody tr:last-child td {
    border-bottom: none;
  }
  tbody tr {
    transition: background 0.12s ease;
  }
  tbody tr:hover {
    background: color-mix(in oklab, var(--muted) 55%, transparent);
  }
  tbody tr.ineligible {
    color: var(--muted-foreground);
  }
  tbody tr.ineligible .race {
    opacity: 0.6;
  }
  .race {
    font-weight: 550;
    white-space: nowrap;
  }
  .racenote {
    display: block;
    font-weight: 400;
    font-size: 0.75rem;
    color: var(--muted-foreground);
  }
  .cell {
    min-width: 132px;
  }
  .cell-val {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-size: 0.875rem;
    white-space: nowrap;
  }
  .cell-val .lo {
    color: var(--muted-foreground);
  }
  .bar {
    position: relative;
    height: 5px;
    border-radius: 999px;
    background: var(--muted);
    margin-top: 0.35rem;
    overflow: hidden;
  }
  .bar > span {
    position: absolute;
    top: 0;
    bottom: 0;
    border-radius: 999px;
    opacity: 0.9;
  }
  .na {
    text-align: right;
    color: var(--muted-foreground);
  }

  .howto {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--card);
    margin: 0 0 2rem;
    overflow: hidden;
  }
  .howto > summary {
    cursor: pointer;
    padding: 0.8rem 1.05rem;
    font-weight: 600;
    font-size: 0.9rem;
    list-style: none;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    user-select: none;
  }
  .howto > summary::-webkit-details-marker {
    display: none;
  }
  .howto > summary::before {
    content: "";
    color: var(--muted-foreground);
    width: 0;
    height: 0;
    border-top: 0.32rem solid transparent;
    border-bottom: 0.32rem solid transparent;
    border-left: 0.45rem solid currentColor;
    transition: transform 0.15s ease;
  }
  .howto[open] > summary::before {
    transform: rotate(90deg);
  }
  .howto > summary:hover {
    background: color-mix(in oklab, var(--muted) 50%, transparent);
  }
  .howto-body {
    padding: 0.2rem 1.05rem 1.05rem;
    font-size: 0.875rem;
    color: var(--muted-foreground);
  }
  .howto-body p {
    max-width: 75ch;
    margin: 0 0 0.6rem;
    text-wrap: pretty;
  }

  .cost-sec {
    margin: 3.5rem 0 1rem;
    padding-top: 2rem;
    border-top: 1px solid var(--border);
  }
  .cost-sec > h2 {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    margin: 0 0 0.35rem;
  }
  .cost-sec > .sub {
    color: var(--muted-foreground);
    font-size: 0.875rem;
    margin: 0 0 1.75rem;
    max-width: 72ch;
    text-wrap: pretty;
  }
  .cost-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 2.5rem;
    align-items: start;
  }
  @media (max-width: 880px) {
    .cost-grid {
      grid-template-columns: 1fr;
      gap: 2rem;
    }
  }

  .field-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.85rem 1rem;
    margin-bottom: 1.75rem;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 0;
  }
  .field.span2 {
    grid-column: 1 / -1;
  }
  .field > span {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--muted-foreground);
  }
  select,
  .num-in {
    font: inherit;
    font-size: 0.875rem;
    color: var(--foreground);
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) - 3px);
    padding: 0 0.6rem;
    width: 100%;
    height: 2.35rem;
  }
  select {
    cursor: pointer;
  }
  select:focus-visible,
  .num-in:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 40%, transparent);
  }
  .disc-val {
    height: 2.35rem;
    display: flex;
    align-items: center;
    font-size: 0.95rem;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }

  .targets {
    display: grid;
    gap: 1.15rem;
  }
  .target-head {
    display: flex;
    align-items: baseline;
    font-size: 0.8125rem;
    margin-bottom: 0.45rem;
  }
  .target-head .name {
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
  }
  .target-head .top {
    margin-left: auto;
    font-variant-numeric: tabular-nums;
    color: var(--muted-foreground);
  }
  .target .sub {
    margin-top: 0.4rem;
    font-size: 0.75rem;
    color: var(--muted-foreground);
    font-variant-numeric: tabular-nums;
  }
  .target .sub b {
    color: var(--foreground);
    font-weight: 650;
  }

  .stats3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    padding-bottom: 1.1rem;
    border-bottom: 1px solid var(--border);
    margin-bottom: 0.85rem;
  }
  .stat3 {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .stat3 .k {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted-foreground);
  }
  .stat3 .v {
    font-size: 1.7rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    line-height: 1.05;
  }
  .eq {
    font-size: 0.8125rem;
    color: var(--muted-foreground);
    font-variant-numeric: tabular-nums;
    margin: 0 0 1.1rem;
  }
  .eq.zero {
    color: var(--stat-atk);
  }
  .chart-cap {
    font-size: 0.875rem;
    color: var(--muted-foreground);
    margin: 0.5rem 0 0;
    text-wrap: pretty;
  }
  :global(#c-chart svg) {
    width: 100%;
    height: auto;
    display: block;
  }
  :global(#c-chart svg text) {
    fill: var(--muted-foreground);
    font-size: 12px;
  }
  :global(#c-chart .axis) {
    stroke: var(--border);
  }
  :global(#c-chart .curve) {
    fill: none;
    stroke: var(--stat-atk);
    stroke-width: 2;
  }
  :global(#c-chart .ref) {
    fill: var(--muted-foreground);
  }
  :global(#c-chart .now) {
    fill: var(--foreground);
  }
  :global(#c-chart .nowline) {
    stroke: var(--foreground);
    stroke-dasharray: 3 3;
    opacity: 0.45;
  }

  @media (max-width: 640px) {
    .wrap {
      padding: 1rem 1rem 4rem;
    }
    .topbar {
      align-items: flex-start;
    }
    .field-grid,
    .stats3 {
      grid-template-columns: 1fr;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    * {
      transition: none !important;
    }
  }
</style>
