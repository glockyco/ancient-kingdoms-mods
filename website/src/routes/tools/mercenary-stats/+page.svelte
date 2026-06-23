<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import {
    CLASSES,
    RACE_ORDER,
    ZONE_RACES,
    charismaDiscount,
    computeAll,
    hirePrice,
    pAtLeast,
    pHealthAtLeast,
    pManaAtLeast,
    pRaceInZone,
    raceHomeZone,
    type ClassResult,
    type MercRow,
  } from "$lib/utils/merc-stats";
  import { SvelteSet } from "svelte/reactivity";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  type StatKey = "hp" | "mana" | "atk" | "spell";
  type TargetKey = "hp" | "mana" | "atk";

  const CLASS_NAMES = Object.keys(CLASSES);
  const ATTRS = ["STR", "CON", "DEX", "INT", "WIS", "CHA"];
  const STAT_HUE: Record<StatKey, string> = {
    hp: "var(--stat-hp)",
    mana: "var(--stat-mana)",
    atk: "var(--stat-atk)",
    spell: "var(--stat-spell)",
  };
  const LABELS: Record<StatKey, string> = {
    hp: "Health",
    mana: "Mana",
    atk: "Attack Power",
    spell: "Spell Power",
  };
  const TITLES: Record<StatKey, string> = {
    hp: "Total Health at this level: base-health curve + Constitution, scaled by the hidden Health multiplier rolled at hire, including veteran points.",
    mana: "Total Mana at this level: base-mana curve + Intelligence, scaled by the hidden Mana multiplier rolled at hire, including veteran points.",
    atk: "Strength bonus at this level + the base-combat value rolled at hire.",
    spell:
      "round(INT×1.5) at this level + the base-combat value rolled at hire.",
  };
  const TARGET_LABELS: Record<TargetKey, string> = {
    hp: "Health",
    mana: "Mana",
    atk: "Attack Power / Spell Power",
  };

  const fmt = (n: number) => n.toLocaleString("en-US");
  const pct = (p: number) =>
    p >= 0.0995
      ? Math.round(p * 100) + "%"
      : p >= 0.00995
        ? (p * 100).toFixed(1) + "%"
        : p > 0
          ? (p * 100).toFixed(2) + "%"
          : "0%";
  const goldFmt = (n: number) =>
    n >= 1e6
      ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M"
      : n >= 1e4
        ? Math.round(n / 1e3) + "k"
        : n >= 1e3
          ? (n / 1e3).toFixed(1).replace(/\.0$/, "") + "k"
          : fmt(Math.round(n));

  let level = $state(50);
  let veteran = $state(200);
  let active = new SvelteSet(CLASS_NAMES);
  let cCls = $state("Wizard");
  let cRace = $state<string>(CLASSES["Wizard"].pool[0]);
  let cTavernZone = $state<number | null>(
    raceHomeZone(CLASSES["Wizard"].pool[0]),
  );
  let cCharisma = $state(0);
  let frac = $state<Record<TargetKey, number>>({ hp: 0, mana: 0, atk: 0 });

  const results = $derived(computeAll(level, veteran, data.curves));
  const shown = $derived(results.filter((c) => active.has(c.cls)));
  const cd = $derived(results.find((c) => c.cls === cCls)!);
  const row = $derived(cd.rows.find((r) => r.race === cRace)!);
  const meaningful = $derived<TargetKey[]>(
    cd.hasMana ? ["hp", "mana", "atk"] : ["hp", "atk"],
  );
  const classRaceOptions = $derived(
    RACE_ORDER.filter((r) => CLASSES[cCls].pool.includes(r)),
  );
  const discount = $derived(charismaDiscount(cCharisma));
  const price = $derived(hirePrice(level, veteran, discount));
  const pRace = $derived(pRaceInZone(cCls, cRace, cTavernZone));
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

  function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, Math.round(v || 0)));
  }

  function setLevel(v: number) {
    level = clamp(v, 1, 50);
  }

  function setVeteran(v: number) {
    veteran = clamp(v, 0, 200);
  }

  function setCharisma(v: number) {
    cCharisma = clamp(v, 0, 200);
  }

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

  function fixTavern() {
    if (cTavernZone == null || pRaceInZone(cCls, cRace, cTavernZone) === 0) {
      cTavernZone = raceHomeZone(cRace);
    }
  }

  function onClassChange(v: string) {
    cCls = v;
    if (!CLASSES[v].pool.includes(cRace))
      cRace = RACE_ORDER.find((r) => CLASSES[v].pool.includes(r))!;
    fixTavern();
  }

  function onRaceChange(v: string) {
    cRace = v;
    fixTavern();
  }

  function onTavernChange(v: string) {
    cTavernZone = Number(v);
  }

  function tavernSpecialty(zoneNum: number) {
    return ZONE_RACES[zoneNum]?.join(" / ") ?? "any race";
  }

  function zoneName(zoneNum: number | null) {
    return (
      data.taverns.find((t) => t.zone_num === zoneNum)?.zone_name ??
      "This tavern"
    );
  }

  function impossibleMessage() {
    if (cTavernZone == null || pRace !== 0) return "";
    const pinned = (ZONE_RACES[cTavernZone] ?? []).filter((r) =>
      CLASSES[cCls].pool.includes(r),
    );
    if (pinned.length === 0) return "";
    return `${zoneName(cTavernZone)} only recruits ${pinned.join(" or ")} — you can't roll a ${cRace} here.`;
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
      xt += `<text x="${xOf(t).toFixed(1)}" y="${B + 16}" text-anchor="middle">${Math.round(t * 100)}%</text>`;
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
      <text x="${(L + R) / 2}" y="${H - 2}" text-anchor="middle">demanded quality — top X% on each roll →</text>
    </svg>`;
  }
</script>

<Seo
  title="Mercenary Stat Ranges - Ancient Kingdoms"
  description="Possible Health, Mana, Attack Power, and Spell Power rolls for every mercenary race and class, at any level and veteran rank, plus the gold and hires needed to roll a great one."
  path="/tools/mercenary-stats"
/>

<div class="wrap">
  <div class="topbar">
    <Breadcrumb
      items={[
        { label: "Home", href: "/" },
        { label: "Tools" },
        { label: "Mercenary Stats" },
      ]}
    />
  </div>

  <h1>Mercenary Stat Ranges</h1>
  <p class="lead">
    Compare the stat ranges every mercenary class and race can roll, at any
    level and veteran-point total. Hiring rolls a random race and hidden
    modifiers, so two mercenaries of the same class and level can still differ —
    the tables show every roll you might get.
  </p>

  <details class="howto">
    <summary>How to read these ranges</summary>
    <div class="howto-body">
      <p>
        Hiring rolls a random race from the class pool plus three values saved
        to that mercenary: a Health multiplier, a resource multiplier, and a
        base-combat value. Warriors and Rogues roll a resource multiplier too,
        but their Rage ignores it — only casters' Mana uses it. You never see
        these numbers. They set where in each range your mercenary lands.
      </p>
      <ul>
        <li>
          <b>Health &amp; Mana</b> re-derive from the mercenary's current level
          and your total veteran points, so an existing mercenary's totals match
          the row at its <i>current</i> level.
        </li>
        <li>
          <b>Attack Power and Spell Power</b> are the current attribute bonus, Strength
          for Attack Power and round(INT×1.5) for Spell Power, plus the base-combat
          roll, which both share. The attribute part grows with level, but the base-combat
          roll is locked at hire and never re-rolls, except for veteran bonuses, so
          these columns are exact for a mercenary hired at the shown level.
        </li>
        <li>
          <b>Every class lists all six races.</b> A "–" marks a race that class can't
          be.
        </li>
      </ul>
      <p>
        Warriors and Rogues use Rage, which is race-independent, so they have no
        Mana column.
      </p>
    </div>
  </details>

  <section class="controls" aria-label="Query controls">
    <div class="controls-grid">
      {@render numField(
        "Level",
        "mercs unlock at level 10",
        level,
        setLevel,
        1,
        50,
      )}
      {@render numField(
        "Veteran points",
        "Health & Mana · +0.25% each",
        veteran,
        setVeteran,
        0,
        200,
      )}
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
              >{c.resource}</span
            >
          </div>
          <div class="class-meta">
            <span class="basehp"
              >Base Health <b class="tnum">{fmt(c.hpCurve)}</b></span
            >
            <span class="attrs">
              {#each ATTRS as a (a)}<span class="attr"
                  >{a}<b>{c.attrs[a]}</b></span
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
                  <th title={TITLES[k]}
                    ><span class="colmark" style={`background:${STAT_HUE[k]}`}
                    ></span>{LABELS[k]}</th
                  >
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each RACE_ORDER as race (race)}
                {@const r = c.rows.find((x) => x.race === race)!}
                <tr class:ineligible={!r.eligible}>
                  <td class="race">{race}</td>
                  {#if r.eligible}
                    {#each cols as k (k)}
                      {@const cell = statRange(r, k)}
                      <td class="cell">
                        <div class="cell-val">
                          <span class="lo">{fmt(cell[0])}</span><span
                            class="dash">–</span
                          >{fmt(cell[1])}
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
      Every hire re-rolls the race and the hidden modifiers, so chasing a great
      mercenary means re-hiring. Set the minimums you'd accept and see the odds
      per hire and the gold it takes on average — at the Level and Veteran
      points chosen above.
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
            ><span>Tavern</span>
            <select
              value={String(cTavernZone)}
              onchange={(e) => onTavernChange(e.currentTarget.value)}
            >
              {#each data.taverns as tavern (tavern.zone_num)}
                <option value={String(tavern.zone_num)}
                  >{tavern.zone_name} · {tavern.npc_name} — {tavernSpecialty(
                    tavern.zone_num,
                  )}</option
                >
              {/each}
            </select>
          </label>
          <label class="field"
            ><span>Your Charisma</span>
            <input
              class="num-in"
              type="number"
              min="0"
              max="200"
              value={cCharisma}
              inputmode="numeric"
              oninput={(e) => setCharisma(e.currentTarget.valueAsNumber)}
            />
          </label>
          <div class="field">
            <span>Hire discount</span><span class="disc-val"
              >−{Math.round(discount * 100)}%</span
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
                <span class="top">top {pct(read.p)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1000"
                value={Math.round((frac[k] ?? 0) * 1000)}
                style={`--pct:${(frac[k] ?? 0) * 100}%`}
                oninput={(e) =>
                  setFrac(k, e.currentTarget.valueAsNumber / 1000)}
              />
              <div class="sub">
                {#if k === "atk"}
                  Attack Power ≥ <b>{fmt(read.value)}</b> · Spell Power ≥
                  <b>{fmt(read.spellValue ?? 0)}</b>
                {:else}
                  ≥ <b>{fmt(read.value)}</b>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
      <div class="cost-outputs">
        <div class="stats3">
          <div class="stat3">
            <span class="k">Chance / hire</span><span class="v"
              >{pTotal > 0 ? pct(pTotal) : "0%"}</span
            >
          </div>
          <div class="stat3">
            <span class="k">Avg hires</span><span class="v"
              >{Number.isFinite(avgHires)
                ? `~${fmt(Math.round(avgHires))}`
                : "∞"}</span
            >
          </div>
          <div class="stat3">
            <span class="k">Avg gold</span><span class="v"
              >{Number.isFinite(avgGold)
                ? `~${goldFmt(Math.round(avgGold))}`
                : "∞"}</span
            >
          </div>
        </div>
        {#if pRace === 0 && impossibleText}
          <p class="eq zero">{impossibleText}</p>
        {:else}
          <p class="eq">
            per hire = race <b>{pct(pRace)}</b> × rolls <b>{pct(pRolls)}</b> · {fmt(
              price,
            )} gp each
          </p>
          <!-- eslint-disable-next-line svelte/no-at-html-tags — drawChart returns static SVG assembled from numeric inputs and fixed labels. -->
          <div id="c-chart">{@html chartSvg}</div>
          <p class="chart-cap">
            Expected gold to roll a mercenary this good, demanding the same
            top-X% on each of its {meaningful.length} meaningful rolls, race chance
            included. The dot marks your current targets.
          </p>
        {/if}
      </div>
    </div>
  </section>
</div>

{#snippet numField(
  label: string,
  hint: string,
  value: number,
  setter: (v: number) => void,
  min: number,
  max: number,
)}
  <div>
    <div class="field-label">
      <span>{label}</span><span class="field-hint">{hint}</span>
    </div>
    <div class="stepper">
      <button
        type="button"
        class="stepbtn"
        aria-label={`Decrease ${label.toLowerCase()}`}
        onclick={() => setter(value - 1)}>−</button
      >
      <input
        class="bignum tnum"
        type="number"
        {min}
        {max}
        {value}
        inputmode="numeric"
        oninput={(e) => setter(e.currentTarget.valueAsNumber)}
      />
      <button
        type="button"
        class="stepbtn"
        aria-label={`Increase ${label.toLowerCase()}`}
        onclick={() => setter(value + 1)}>+</button
      >
    </div>
    <input
      type="range"
      {min}
      {max}
      {value}
      style={`--pct:${((value - min) / (max - min)) * 100}%`}
      oninput={(e) => setter(e.currentTarget.valueAsNumber)}
    />
    <div class="ticks"><span>{min}</span><span>{max}</span></div>
  </div>
{/snippet}

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
  .lead {
    color: var(--muted-foreground);
    max-width: 65ch;
    margin: 0 0 2rem;
    text-wrap: pretty;
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

  .field-label {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted-foreground);
    margin-bottom: 0.5rem;
  }
  .field-hint {
    font-weight: 500;
    letter-spacing: 0;
    text-transform: none;
    opacity: 0.85;
  }
  .stepper {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .stepbtn {
    width: 2rem;
    height: 2rem;
    flex: none;
    border-radius: calc(var(--radius) - 3px);
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--foreground);
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      transform 0.06s ease;
  }
  .stepbtn:hover {
    background: var(--muted);
    border-color: var(--ring);
  }
  .stepbtn:active {
    transform: scale(0.94);
  }
  .stepbtn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 45%, transparent);
  }
  .bignum {
    width: 5.2rem;
    border: none;
    background: transparent;
    color: var(--foreground);
    font-size: 2rem;
    font-weight: 700;
    line-height: 1;
    text-align: center;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    padding: 0;
    appearance: textfield;
    -moz-appearance: textfield;
  }
  .bignum::-webkit-outer-spin-button,
  .bignum::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .bignum:focus-visible {
    outline: none;
  }

  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 1.25rem;
    margin: 0.7rem 0 0;
    background: transparent;
    cursor: pointer;
  }
  input[type="range"]::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 999px;
    background: linear-gradient(
      to right,
      var(--primary) var(--pct, 0%),
      var(--muted) var(--pct, 0%)
    );
  }
  input[type="range"]::-moz-range-track {
    height: 6px;
    border-radius: 999px;
    background: var(--muted);
  }
  input[type="range"]::-moz-range-progress {
    height: 6px;
    border-radius: 999px;
    background: var(--primary);
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    margin-top: -5px;
    border-radius: 50%;
    background: var(--background);
    border: 2px solid var(--primary);
    box-shadow: 0 1px 2px oklch(0 0 0 / 0.25);
    transition: transform 0.1s ease;
  }
  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--background);
    border: 2px solid var(--primary);
    box-shadow: 0 1px 2px oklch(0 0 0 / 0.25);
  }
  input[type="range"]:active::-webkit-slider-thumb {
    transform: scale(1.15);
  }
  input[type="range"]:focus-visible::-webkit-slider-thumb {
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--ring) 40%, transparent);
  }
  .ticks {
    display: flex;
    justify-content: space-between;
    font-size: 0.7rem;
    color: var(--muted-foreground);
    margin-top: 0.25rem;
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
    font-size: 0.6875rem;
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
    font-size: 0.7rem;
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
    font-size: 0.7rem;
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
  .cell-val .dash {
    color: var(--muted-foreground);
    margin: 0 0.15rem;
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
    font-size: 0.8125rem;
    color: var(--muted-foreground);
  }
  .howto-body p {
    max-width: 75ch;
    margin: 0 0 0.6rem;
    text-wrap: pretty;
  }
  .howto-body ul {
    max-width: 75ch;
    margin: 0 0 0.6rem;
    padding-left: 1.25rem;
    list-style: disc outside;
  }
  .howto-body li {
    margin: 0 0 0.4rem;
    text-wrap: pretty;
  }
  .howto-body b {
    color: var(--foreground);
    font-weight: 600;
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
    font-size: 0.65rem;
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
    font-size: 0.65rem;
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
  .eq b {
    color: var(--foreground);
  }
  .eq.zero {
    color: var(--stat-atk);
  }
  .chart-cap {
    font-size: 0.75rem;
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
    font-size: 10px;
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
