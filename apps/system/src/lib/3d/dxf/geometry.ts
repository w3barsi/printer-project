import type { BufferGeometry } from "three";

import { polygonBounds } from "../attachment";
import type { Point2, Polygon } from "../contours";
import { extrudePolygons, triangleCount, weld } from "../extrude";
import type { OffsetLayer } from "./design";
import { bandPolygons } from "./offset";

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
 * Extrudes the profile into the base and lays every offset band beside it on
 * the same bed plane: each band is a stroke of its own width around the object
 * grown by the offsets before it, with its own thickness.
 */
export function buildMedal(
  profile: Polygon[],
  baseThicknessMm: number,
  offsets: OffsetLayer[],
): MedalGeometry | null {
  if (profile.length === 0) return null;

  const base = weld(extrudePolygons(profile, baseThicknessMm, 0));

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

  const triangles = [base, ...parts.map((part) => part.geometry)].reduce(
    (total, geometry) => total + triangleCount(geometry),
    0,
  );

  return {
    base,
    parts,
    width: footprint.maxX - footprint.minX,
    height: footprint.maxY - footprint.minY,
    triangles,
  };
}
