import type { PaletteEntry } from "./quantize";

export const DEFAULT_LAYER_THICKNESS = 1.2;
export const MIN_REGION_AREA_MM2 = 1;
export const LAYER_EMBED_MM = 0.1;

export type ImageQuality = "standard" | "high";
export const DEFAULT_IMAGE_QUALITY: ImageQuality = "standard";

export const DEFAULT_ALPHA_THRESHOLD = 128;
export const ALPHA_LIMITS = { min: 1, max: 254, step: 1 } as const;

export const DEFAULT_SPECK_MM2 = MIN_REGION_AREA_MM2;
export const SPECK_LIMITS = { min: 0, max: 3, step: 0.1 } as const;

export const DEFAULT_BASE_COLOR = { r: 244, g: 244, b: 245 };

export type BaseStyle = "rect" | "outline";

export type BaseSettings = {
  longestSideMm: number;
  marginMm: number;
  thicknessMm: number;
  /** null = auto: min(3, quarter of the short edge). */
  cornerRadiusMm: number | null;
  /** Flattens every colour layer to the base height for a flush, flat top. */
  faceDown: boolean;
  /** "rect" = auto-fitted rounded box; "outline" = follows the artwork contour. */
  style: BaseStyle;
};

export const DEFAULT_BASE_SETTINGS: BaseSettings = {
  longestSideMm: 60,
  marginMm: 2,
  thicknessMm: 2,
  cornerRadiusMm: null,
  faceDown: false,
  style: "rect",
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
