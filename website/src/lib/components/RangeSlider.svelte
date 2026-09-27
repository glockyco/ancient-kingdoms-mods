<script lang="ts">
  let {
    value,
    min,
    max,
    step = 1,
    label,
    onchange,
  }: {
    value: number;
    min: number;
    max: number;
    step?: number;
    label: string;
    onchange: (value: number) => void;
  } = $props();

  const pct = $derived(((value - min) / (max - min)) * 100);
</script>

<input
  type="range"
  {min}
  {max}
  {step}
  {value}
  aria-label={label}
  style={`--pct:${pct}%`}
  oninput={(e) => onchange(e.currentTarget.valueAsNumber)}
/>

<style>
  input {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 1.25rem;
    margin: 0.7rem 0 0;
    background: transparent;
    cursor: pointer;
  }
  input::-webkit-slider-runnable-track {
    height: 6px;
    border-radius: 999px;
    background: linear-gradient(
      to right,
      var(--primary) var(--pct, 0%),
      var(--muted) var(--pct, 0%)
    );
  }
  input::-moz-range-track {
    height: 6px;
    border-radius: 999px;
    background: var(--muted);
  }
  input::-moz-range-progress {
    height: 6px;
    border-radius: 999px;
    background: var(--primary);
  }
  input::-webkit-slider-thumb {
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
  input::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--background);
    border: 2px solid var(--primary);
    box-shadow: 0 1px 2px oklch(0 0 0 / 0.25);
  }
  input:active::-webkit-slider-thumb {
    transform: scale(1.15);
  }
  input:focus-visible::-webkit-slider-thumb {
    box-shadow: 0 0 0 4px color-mix(in oklab, var(--ring) 40%, transparent);
  }
</style>
