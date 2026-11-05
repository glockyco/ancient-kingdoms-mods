<script lang="ts">
  import {
    SACRIFICE_GOLD_PER_POINT,
    sacrificeItemPoints,
  } from "$lib/calculation/virtues";
  import type { OfferableItem } from "$lib/queries/virtues.server";
  import { formatNumber, getQualityTextColorClass } from "$lib/utils/format";

  let { items }: { items: OfferableItem[] } = $props();

  // Source: server-scripts/PlayerNpcTrading.cs:CalculateSellItemPrice — a vendor pays up to 25% more with Charisma.
  const MAX_CHARISMA_SALE = 1.25;

  const points = $derived(
    items.map((item) => ({
      ...item,
      offered: sacrificeItemPoints(item.item_level),
      sold: (item.sell_price * MAX_CHARISMA_SALE) / SACRIFICE_GOLD_PER_POINT,
    })),
  );
  const offerWins = $derived(points.filter((p) => p.offered > p.sold).length);
  const median = $derived.by(() => {
    const ratios = points.map((p) => p.offered / p.sold).sort((a, b) => a - b);
    return ratios[Math.floor(ratios.length / 2)];
  });

  const W = 680;
  const H = 320;
  const pad = { l: 50, r: 10, t: 10, b: 46 };
  const lo = Math.log10(0.02);
  const hiX = Math.log10(8);
  const hiY = Math.log10(40);
  const x = (v: number) =>
    pad.l +
    ((Math.log10(Math.max(v, 0.02)) - lo) / (hiX - lo)) * (W - pad.l - pad.r);
  const y = (v: number) =>
    H -
    pad.b -
    ((Math.log10(Math.max(v, 0.02)) - lo) / (hiY - lo)) * (H - pad.t - pad.b);
</script>

<div class="grid gap-6 lg:grid-cols-[1fr_15rem] lg:items-center">
  <figure>
    <svg
      viewBox="0 0 {W} {H}"
      class="w-full"
      role="img"
      aria-label="Points each item gives offered, against points from selling it and offering the gold"
    >
      {#each [0.1, 1, 10] as t (t)}
        <line
          display={t > 8 ? "none" : undefined}
          x1={x(t)}
          x2={x(t)}
          y1={pad.t}
          y2={H - pad.b}
          class="stroke-border"
        />
        <text
          x={x(t)}
          y={H - pad.b + 19}
          display={t > 8 ? "none" : undefined}
          text-anchor="middle"
          class="fill-muted-foreground text-[16px]">{t}</text
        >
        <line
          y1={y(t)}
          y2={y(t)}
          x1={pad.l}
          x2={W - pad.r}
          class="stroke-border"
        />
        <text
          x={pad.l - 8}
          y={y(t) + 4}
          text-anchor="end"
          class="fill-muted-foreground text-[16px]">{t}</text
        >
      {/each}
      <line
        x1={x(0.02)}
        y1={y(0.02)}
        x2={x(8)}
        y2={y(8)}
        class="stroke-foreground"
        stroke-width="1.5"
        stroke-dasharray="6 5"
      />
      {#each points as p (p.id)}
        <circle
          cx={x(p.sold)}
          cy={y(p.offered)}
          r="2.6"
          fill="currentColor"
          fill-opacity="0.8"
          class={getQualityTextColorClass(p.quality)}
          ><title
            >{p.name}: {formatNumber(p.offered, { decimals: 2 })} offered, {formatNumber(
              p.sold,
              { decimals: 2 },
            )} sold</title
          ></circle
        >
      {/each}
      <text
        x={x(0.03)}
        y={y(25)}
        class="fill-pink-400 text-[17px] font-semibold">Offering Wins</text
      >
      <text
        x={x(7)}
        y={y(0.05)}
        text-anchor="end"
        class="fill-amber-400 text-[17px] font-semibold">Selling Wins</text
      >
      <text
        x={(pad.l + W - pad.r) / 2}
        y={H - 6}
        text-anchor="middle"
        class="fill-muted-foreground text-[16px]"
        >Points If You Sell It and Offer the Gold</text
      >
      <text
        transform="translate(12 {(pad.t + H - pad.b) / 2}) rotate(-90)"
        text-anchor="middle"
        class="fill-muted-foreground text-[16px]"
        >Points If You Offer the Item</text
      >
    </svg>
    <figcaption class="text-center text-sm text-muted-foreground">
      Selling assumes the full 25% Charisma bonus. Hover a dot for its item.
    </figcaption>
  </figure>
  <dl
    class="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 [&>div]:flex [&>div]:flex-col"
  >
    <div>
      <dt class="text-sm text-balance text-muted-foreground">
        Items Are Worth More Offered Than Sold
      </dt>
      <dd class="order-first text-2xl font-semibold">
        {formatNumber(offerWins)} of {formatNumber(points.length)}
      </dd>
    </div>
    <div>
      <dt class="text-sm text-balance text-muted-foreground">
        Median: How Much More an Item Is Worth Offered
      </dt>
      <dd class="order-first text-2xl font-semibold">
        {formatNumber(median, { decimals: 1 })}×
      </dd>
    </div>
    <div>
      <dt class="text-sm text-balance text-muted-foreground">
        Exceptions: Cheap Augments, Fishing Rods and a Few Others
      </dt>
      <dd class="order-first text-2xl font-semibold">
        {formatNumber(points.length - offerWins)}
      </dd>
    </div>
  </dl>
</div>
