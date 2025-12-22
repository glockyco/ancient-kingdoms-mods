<script lang="ts">
  import { Slider } from "$lib/components/ui/slider";

  interface Props {
    label: string;
    min: number;
    max: number;
    value: [number, number];
    onchange: (value: [number, number]) => void;
  }

  let { label, min, max, value, onchange }: Props = $props();

  // Local state for the slider (supports binding)
  let sliderValue = $state<number[]>([value[0], value[1]]);

  // Sync external value changes
  $effect(() => {
    if (sliderValue[0] !== value[0] || sliderValue[1] !== value[1]) {
      sliderValue = [value[0], value[1]];
    }
  });

  // Notify parent of changes
  function handleChange(newValue: number[] | undefined) {
    if (newValue && newValue.length === 2) {
      onchange([newValue[0], newValue[1]]);
    }
  }
</script>

<div class="space-y-2">
  <div class="flex items-center justify-between text-xs">
    <span class="text-muted-foreground">{label}</span>
    <span class="font-mono text-muted-foreground">
      {value[0]} - {value[1]}
    </span>
  </div>
  <Slider
    type="multiple"
    {min}
    {max}
    step={1}
    bind:value={sliderValue}
    onValueChange={handleChange}
    class="w-full"
  />
</div>
