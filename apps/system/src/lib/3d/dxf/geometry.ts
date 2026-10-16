import type { BufferGeometry } from "three";

import { polygonBounds } from "../attachment";
import type { Point2, Polygon } from "../contours";
import { extrudePolygons, triangleCount, weld } from "../extrude";
import type { Lanyard, OffsetLayer } from "./design";
import { lanyardFrame, lanyardPolygons } from "./lanyard";
import { bandPolygons, offsetPolygons } from "./offset";

/**
 * How far each band reaches into the layer it grows from, so the extruded
 * solids overlap instead of only touching along coincident walls.
 */
const OFFSET_BOND_MM = 0.4;

export type MedalPart = {
  offsetIndex: number;
  geometry: BufferGeometry;
  thicknessMm: number;
};

export type MedalGeometry = {
  base: BufferGeometry;
  parts: MedalPart[];
  lanyard: BufferGeometry | null;
  /** Boundary loops of the tab (outer + hole) for the edge overlay. */
  lanyardOutlines: Point2[][];
  /** Distance between the lanyard contact feet; null without a tab. */
  lanyardWidthMm: number | null;
  /** Outer ring of the object after offsets, for lanyard placement. */
  outline: Point2[];
  width: number;
  height: number;
  triangles: number;
};

/** Scales the profile about the origin so its longest side matches the target. */
export function fitProfile(profile: Polygon[], longestSideMm: number): Polygon[] {
  const bounds = polygonBounds(profile);
  const longest = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  if (!Number.isFinite(longest) || longest <= 0) return profile;

  const factor = longestSideMm / longest;
  if (Math.abs(factor - 1) < 1e-9) return profile;

  const scale = ([x, y]: Point2): Point2 => [x * factor, y * factor];
  return profile.map((polygon) => ({
    outer: polygon.outer.map(scale),
    holes: polygon.holes.map((hole) => hole.map(scale)),
  }));
}

/**
 * Extrudes the profile into the base, lays every offset band beside it on the
 * bed plane, and roots the lanyard tab on the object's outer edge. Bands and
 * tab are strokes around the object grown by the offsets before them, each
 * with its own thickness.
 */
export function buildMedal(
  profile: Polygon[],
  baseThicknessMm: number,
  offsets: OffsetLayer[],
  lanyard: Lanyard,
): MedalGeometry | null {
  if (profile.length === 0) return null;

  const base = weld(extrudePolygons(profile, baseThicknessMm, 0));
  const outline = medalOutline(profile, offsets);

  const parts: MedalPart[] = [];
  let footprint = polygonBounds(profile);
  let grownMm = 0;

  offsets.forEach((offset, index) => {
    const inner = grownMm - OFFSET_BOND_MM;
    const outer = grownMm + offset.widthMm;
    grownMm = outer;
    if (offset.thicknessMm <= 0) return;

    const band = bandPolygons(profile, inner, outer);
    if (band.length === 0) return;

    parts.push({
      offsetIndex: index,
      thicknessMm: offset.thicknessMm,
      geometry: weld(extrudePolygons(band, offset.thicknessMm, 0)),
    });

    // Each band's outer edge encloses the previous ones, so the newest
    // outline is the object's full footprint.
    footprint = polygonBounds(band);
  });

  let lanyardGeometry: BufferGeometry | null = null;
  let lanyardOutlines: Point2[][] = [];
  let lanyardWidthMm: number | null = null;
  const tab = lanyardPolygons(outline, lanyard);
  if (tab.length > 0) {
    lanyardWidthMm = lanyardFrame(outline, lanyard).widthMm;
    lanyardGeometry = weld(extrudePolygons(tab, lanyard.thicknessMm, 0));
    lanyardOutlines = tab.flatMap((polygon) => [polygon.outer, ...polygon.holes]);
    const tabBounds = polygonBounds(tab);
    footprint = {
      minX: Math.min(footprint.minX, tabBounds.minX),
      minY: Math.min(footprint.minY, tabBounds.minY),
      maxX: Math.max(footprint.maxX, tabBounds.maxX),
      maxY: Math.max(footprint.maxY, tabBounds.maxY),
    };
  }

  const meshes = [
    base,
    ...parts.map((part) => part.geometry),
    ...(lanyardGeometry ? [lanyardGeometry] : []),
  ];
  const triangles = meshes.reduce(
    (total, geometry) => total + triangleCount(geometry),
    0,
  );

  return {
    base,
    parts,
    lanyard: lanyardGeometry,
    lanyardOutlines,
    lanyardWidthMm,
    outline,
    width: footprint.maxX - footprint.minX,
    height: footprint.maxY - footprint.minY,
    triangles,
  };
}

/** The object's primary outer ring: the profile grown by every offset width. */
export function medalOutline(profile: Polygon[], offsets: OffsetLayer[]): Point2[] {
  let grownMm = 0;
  for (const offset of offsets) grownMm += offset.widthMm;
  return primaryOutline(grownMm > 0 ? offsetPolygons(profile, grownMm) : profile);
}

function primaryOutline(polygons: Polygon[]): Point2[] {
  let best: Point2[] = [];
  let bestArea = 0;

  for (const polygon of polygons) {
    const bounds = polygonBounds([polygon]);
    const area = (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
    if (area > bestArea) {
      best = polygon.outer;
      bestArea = area;
    }
  }

  return best;
}
