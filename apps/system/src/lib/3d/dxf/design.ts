import type { RgbColor } from "../color";
import type { Point2 } from "../contours";

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

export type LanyardCorner = "outerLeft" | "outerRight" | "innerLeft" | "innerRight";

export const LANYARD_CORNERS: LanyardCorner[] = [
  "outerLeft",
  "outerRight",
  "innerLeft",
  "innerRight",
];

export type LanyardCornerSettings = {
  filletMm: number;
  /** Frozen until unlocked; richer lock semantics land later. */
  locked: boolean;
};

export type Lanyard = {
  /** The left contact foot in model space; null = default span. */
  leftPoint: Point2 | null;
  /** The right contact foot in model space; null = default span. */
  rightPoint: Point2 | null;
  /** The feet move as one piece: dragging translates the tab, span kept. */
  widthLocked: boolean;
  /** Keeps the contact chord level — flat and aligned with the X axis; needs `widthLocked`. */
  lockToXAxis: boolean;
  /** Bridges the pocket between the tab's chord and the object outline. */
  fillGaps: boolean;
  heightMm: number;
  holeWidthMm: number;
  holeHeightMm: number;
  thicknessMm: number;
  corners: Record<LanyardCorner, LanyardCornerSettings>;
};

export const LANYARD_LIMITS = {
  heightMm: { min: 4, max: 40, step: 0.5 },
  holeWidthMm: { min: 1, max: 40, step: 0.5 },
  holeHeightMm: { min: 1, max: 20, step: 0.5 },
  thicknessMm: { min: 0.6, max: 5, step: 0.2 },
  filletMm: { min: 0, max: 20, step: 0.5 },
} as const;

/** Default distance between the contact feet until they are dragged. */
export const DEFAULT_LANYARD_SPAN_MM = 14;

export const DEFAULT_LANYARD: Lanyard = {
  leftPoint: null,
  rightPoint: null,
  widthLocked: false,
  lockToXAxis: false,
  fillGaps: true,
  heightMm: 10,
  holeWidthMm: 8,
  holeHeightMm: 4,
  thicknessMm: DEFAULT_MEDAL_THICKNESS_MM,
  corners: {
    outerLeft: { filletMm: 2, locked: false },
    outerRight: { filletMm: 2, locked: false },
    innerLeft: { filletMm: 0, locked: false },
    innerRight: { filletMm: 0, locked: false },
  },
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
  /** Distance between the lanyard contact feet, null without a tab. */
  lanyardWidthMm: number | null;
};
