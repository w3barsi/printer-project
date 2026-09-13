import type { PaletteEntry } from "./quantize";

export const DEFAULT_LAYER_THICKNESS = 1.2;

export type PaletteSwatch = PaletteEntry & {
  id: string;
  thickness: number;
};
