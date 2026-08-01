<script lang="ts" module>
  export interface MasteryCurveSeries {
    id: string;
    label: string;
    chanceAt: (skillPercent: number) => number;
    isEffortlessAt?: (skillPercent: number) => boolean;
  }

  export interface NoGainBand {
    from: number;
    label: string;
  }

  interface Props {
    series: MasteryCurveSeries[];
    skillLevel: number;
    ariaLabel: string;
    skillLabel: string;
    floor?: number;
    floorLabel?: string;
    unavailableLabel?: string;
    noGainBands?: NoGainBand[];
    yMax?: number;
    yTicks?: number[];
  }
</script>

<script lang="ts">
  let {
    series,
    skillLevel,
    ariaLabel,
    skillLabel,
    floor = 0,
    floorLabel = "unavailable below here",
    unavailableLabel = "unavailable",
    noGainBands = [],
    yMax = 1,
    yTicks = [0, 0.25, 0.5, 0.75, 1],
  }: Props = $props();

  const PLOT = { w: 720, h: 260, left: 46, right: 14, top: 16, bottom: 34 };
  const plotWidth = PLOT.w - PLOT.left - PLOT.right;
  const plotHeight = PLOT.h - PLOT.top - PLOT.bottom;
  const xPosition = (fraction: number) => PLOT.left + fraction * plotWidth;
  const yPosition = (chance: number) =>
    PLOT.top + (1 - Math.min(yMax, Math.max(0, chance)) / yMax) * plotHeight;

  const STROKES = [
    "var(--stat-hp)",
    "var(--stat-mana)",
    "var(--chart-3)",
    "var(--stat-spell)",
    "var(--chart-5)",
  ];

  const curves = $derived(
    series.map((entry, index) => {
      const unavailable: string[] = [];
      const available: string[] = [];
      for (let step = 0; step <= 100; step++) {
        const chance = entry.chanceAt(step);
        const point = `${xPosition(step / 100)},${yPosition(chance)}`;
        if (chance < floor) unavailable.push(point);
        else available.push(point);
      }
      if (unavailable.length > 0 && available.length > 0) {
        unavailable.push(available[0]);
      }
      const chance = entry.chanceAt(skillLevel);
      return {
        ...entry,
        stroke: STROKES[index % STROKES.length],
        unavailablePath:
          unavailable.length > 1 ? `M${unavailable.join("L")}` : null,
        availablePath: available.length > 1 ? `M${available.join("L")}` : null,
        chance,
        available: chance >= floor,
        effortless: entry.isEffortlessAt?.(skillLevel) ?? false,
      };
    }),
  );
</script>

<svg
  viewBox="0 0 {PLOT.w} {PLOT.h}"
  class="w-full"
  role="img"
  aria-label={ariaLabel}
>
  {#each noGainBands as band, index (band.from)}
    <rect
      x={xPosition(band.from)}
      y={PLOT.top}
      width={plotWidth * (1 - band.from)}
      height={plotHeight}
      fill="var(--destructive)"
      opacity={0.05 + index * 0.02}
    />
    <line
      x1={xPosition(band.from)}
      y1={PLOT.top}
      x2={xPosition(band.from)}
      y2={PLOT.top + plotHeight}
      stroke="var(--destructive)"
      stroke-opacity="0.45"
      stroke-dasharray="3 3"
    />
    <text
      x={xPosition(band.from) + 6}
      y={PLOT.top + plotHeight - 7}
      class="fill-muted-foreground text-[9.5px]"
      >no skill from {band.label}</text
    >
  {/each}

  {#each yTicks as tick (tick)}
    <line
      x1={PLOT.left}
      y1={yPosition(tick)}
      x2={PLOT.w - PLOT.right}
      y2={yPosition(tick)}
      stroke="currentColor"
      stroke-opacity="0.08"
    />
    <text
      x={PLOT.left - 7}
      y={yPosition(tick) + 3.5}
      text-anchor="end"
      class="fill-muted-foreground text-[10px]">{Math.round(tick * 100)}%</text
    >
  {/each}

  {#each [0, 25, 50, 75, 100] as tick (tick)}
    <text
      x={xPosition(tick / 100)}
      y={PLOT.h - 12}
      text-anchor="middle"
      class="fill-muted-foreground text-[10px]">{tick}</text
    >
  {/each}
  <text
    x={PLOT.left + plotWidth / 2}
    y={PLOT.h - 1}
    text-anchor="middle"
    class="fill-muted-foreground text-[9.5px]">{skillLabel}</text
  >

  {#if floor > 0}
    <rect
      x={PLOT.left}
      y={yPosition(floor)}
      width={plotWidth}
      height={(plotHeight * floor) / yMax}
      fill="currentColor"
      opacity="0.05"
    />
    <line
      x1={PLOT.left}
      y1={yPosition(floor)}
      x2={PLOT.w - PLOT.right}
      y2={yPosition(floor)}
      stroke="currentColor"
      stroke-opacity="0.35"
      stroke-dasharray="4 3"
    />
    <text
      x={PLOT.w - PLOT.right - 4}
      y={yPosition(floor) - 5}
      text-anchor="end"
      class="fill-muted-foreground text-[9.5px]">{floorLabel}</text
    >
  {/if}

  {#each curves as curve (curve.id)}
    {#if curve.unavailablePath}
      <path
        d={curve.unavailablePath}
        fill="none"
        stroke={curve.stroke}
        stroke-width="2"
        stroke-dasharray="3 4"
        stroke-opacity="0.4"
      />
    {/if}
    {#if curve.availablePath}
      <path
        d={curve.availablePath}
        fill="none"
        stroke={curve.stroke}
        stroke-width="2"
        stroke-linecap="round"
      />
    {/if}
  {/each}

  <line
    x1={xPosition(skillLevel / 100)}
    y1={PLOT.top}
    x2={xPosition(skillLevel / 100)}
    y2={PLOT.top + plotHeight}
    stroke="currentColor"
    stroke-opacity="0.5"
  />
  {#each curves as curve (curve.id)}
    <circle
      cx={xPosition(skillLevel / 100)}
      cy={yPosition(curve.chance)}
      r={curve.effortless || !curve.available ? 2.5 : 4}
      fill={curve.effortless || !curve.available
        ? "var(--background)"
        : curve.stroke}
      stroke={curve.stroke}
      stroke-width="1.6"
      stroke-opacity={curve.available ? 1 : 0.45}
    />
  {/each}
</svg>

<div class="flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
  {#each curves as curve (curve.id)}
    <span
      class="flex items-center gap-1.5"
      class:opacity-50={curve.effortless || !curve.available}
    >
      <span
        class="inline-block h-2 w-2 rounded-[2px]"
        style="background:{curve.stroke}"
      ></span>
      {curve.label}{!curve.available
        ? ` · ${unavailableLabel}`
        : curve.effortless
          ? " · no skill gain"
          : ""}
    </span>
  {/each}
</div>
