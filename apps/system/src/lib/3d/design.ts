import type { PaletteEntry } from "./quantize";

export const DEFAULT_LAYER_THICKNESS = 1.2;
export const MIN_REGION_AREA_MM2 = 1;
export const LAYER_EMBED_MM = 0.1;

export const DEFAULT_BASE_COLOR = { r: 244, g: 244, b: 245 };

export type BaseSettings = {
  longestSideMm: number;
  marginMm: number;
  thicknessMm: number;
  /** null = auto: min(3, quarter of the short edge). */
  cornerRadiusMm: number | null;
};

export const DEFAULT_BASE_SETTINGS: BaseSettings = {
  longestSideMm: 60,
  marginMm: 2,
  thicknessMm: 2,
  cornerRadiusMm: null,
};

export const BASE_LIMITS = {
  longestSideMm: { min: 20, max: 150, step: 1 },
  marginMm: { min: 0, max: 5, step: 0.5 },
  thicknessMm: { min: 0.6, max: 5, step: 0.2 },
  cornerRadiusMm: { min: 0, max: 20, step: 0.5 },
  layerThicknessMm: { min: 0, max: 5, step: 0.2 },
} as const;

export type KeychainModelInfo = {
  width: number;
  height: number;
  triangles: number;
  specksMerged: number;
  thinColorIndexes: number[];
};

export type PaletteSwatch = PaletteEntry & {
  id: string;
  thickness: number;
};
