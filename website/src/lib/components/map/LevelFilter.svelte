<script lang="ts">
  import { Slider } from "$lib/components/ui/slider";
  import { toRomanNumeral } from "$lib/utils/format";

  interface Props {
    label: string;
    min: number;
    max: number;
    value: [number, number];
    onchange: (value: [number, number]) => void;
    useRomanNumerals?: boolean;
  }

  let {
    label,
    min,
    max,
    value,
    onchange,
    useRomanNumerals = false,
  }: Props = $props();

  function handleChange(newValue: number[] | undefined) {
    if (newValue && newValue.length === 2) {
      onchange([newValue[0], newValue[1]]);
    }
  }

  function formatValue(val: number): string {
    return useRomanNumerals ? toRomanNumeral(val) : String(val);
  }
</script>

<div class="space-y-1 mb-2">
  <div class="flex items-center justify-between text-xs">
    <span class="text-muted-foreground">{label}</span>
    <span class="font-mono text-muted-foreground">
      {formatValue(value[0])} – {formatValue(value[1])}
    </span>
  </div>
  {#key `${min}-${max}`}
    <Slider
      type="multiple"
      {min}
      {max}
      step={1}
      value={[...value]}
      onValueChange={handleChange}
      class="w-full"
    />
  {/key}
</div>
