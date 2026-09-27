<script lang="ts">
  import RangeSlider from "$lib/components/RangeSlider.svelte";

  let {
    label,
    hint = "",
    value,
    min,
    max,
    onchange,
    compact = false,
  }: {
    label: string;
    hint?: string;
    value: number;
    min: number;
    max: number;
    onchange: (value: number) => void;
    /** Smaller number text for dense layouts. */
    compact?: boolean;
  } = $props();
</script>

<div>
  <div class="field-label">
    <span>{label}</span>{#if hint}<span class="field-hint">{hint}</span>{/if}
  </div>
  <div class="stepper">
    <button
      type="button"
      class="stepbtn"
      aria-label={`Decrease ${label.toLowerCase()}`}
      onclick={() => onchange(value - 1)}>−</button
    >
    <input
      class="bignum"
      class:compact
      type="number"
      {min}
      {max}
      {value}
      inputmode="numeric"
      aria-label={label}
      oninput={(e) => onchange(e.currentTarget.valueAsNumber)}
    />
    <button
      type="button"
      class="stepbtn"
      aria-label={`Increase ${label.toLowerCase()}`}
      onclick={() => onchange(value + 1)}>+</button
    >
  </div>
  <RangeSlider {value} {min} {max} {label} {onchange} />
  <div class="ticks"><span>{min}</span><span>{max}</span></div>
</div>

<style>
  .field-label {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
    font-size: 0.75rem;
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
  .bignum.compact {
    width: 4rem;
    font-size: 1.5rem;
  }
  .bignum::-webkit-outer-spin-button,
  .bignum::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .bignum:focus-visible {
    outline: none;
  }
  .ticks {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--muted-foreground);
    margin-top: 0.25rem;
  }
</style>
