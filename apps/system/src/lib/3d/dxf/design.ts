import type { RgbColor } from "../color";

export const MEDAL_THICKNESS_LIMITS = { min: 0.6, max: 5, step: 0.2 } as const;
export const OFFSET_WIDTH_LIMITS = { min: 0.5, max: 20, step: 0.1 } as const;
export const FIT_LIMITS = { min: 20, max: 150, step: 1 } as const;

export const DEFAULT_MEDAL_THICKNESS_MM = 2;
export const DEFAULT_OFFSET_WIDTH_MM = 2;
export const DEFAULT_OFFSET_THICKNESS_MM = 1;
export const DEFAULT_FIT_MM = 60;

export type OffsetLayer = {
  id: string;
  /** Stroke width: the band grows the object by this much, measured outward. */
  widthMm: number;
  thicknessMm: number;
  color: RgbColor;
};

/** Cycles across new offsets, medal-ish metals first. */
export const OFFSET_COLOR_PRESETS: RgbColor[] = [
  { r: 192, g: 192, b: 192 },
  { r: 201, g: 162, b: 39 },
  { r: 184, g: 115, b: 51 },
  { r: 140, g: 120, b: 83 },
  { r: 63, g: 63, b: 70 },
  { r: 244, g: 244, b: 245 },
];

export type MedalModelInfo = {
  width: number;
  height: number;
  triangles: number;
};
