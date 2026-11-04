import { openFocused } from "$lib/components/ui/command/open-focused";

/** Whether the site search palette is open. */
export const searchPalette = $state({ open: false });

let paletteInput: HTMLInputElement | null = null;

/** Called by the palette with its query field, or null when it unmounts. */
export function setSearchPaletteInput(input: HTMLInputElement | null) {
  paletteInput = input;
}

/** Opens the palette with its query field focused. Every trigger uses this. */
export function openSearchPalette() {
  openFocused(
    () => (searchPalette.open = true),
    () => paletteInput,
  );
}
