import type { PaletteEntry } from "./quantize";

export const DEFAULT_LAYER_THICKNESS = 1.2;
export const MIN_REGION_AREA_MM2 = 1;
export const BASE_THICKNESS_MM = 2;
export const BASE_MARGIN_MM = 2;
export const TARGET_LONGEST_SIDE_MM = 60;
export const LAYER_EMBED_MM = 0.1;

export const DEFAULT_BASE_COLOR = { r: 244, g: 244, b: 245 };

export type PaletteSwatch = PaletteEntry & {
  id: string;
  thickness: number;
};
