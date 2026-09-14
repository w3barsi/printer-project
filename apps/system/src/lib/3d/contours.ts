import { contours, type ContourMultiPolygon } from "d3-contour";
import simplify from "simplify-js";

import { TRANSPARENT_INDEX } from "./quantize";

export type Point2 = [number, number];

export type Polygon = {
  outer: Point2[];
  holes: Point2[][];
};

const CONTOUR_THRESHOLD = 0.5;
const SIMPLIFY_TOLERANCE = 0.5;

type SimplifyPoint = { x: number; y: number };

function simplifyRing(ring: number[][]): Point2[] {
  const points: SimplifyPoint[] = [];
  for (const [x, y] of ring) points.push({ x, y });

  const first = points[0];
  const last = points[points.length - 1];
  if (points.length > 1 && first.x === last.x && first.y === last.y) {
    points.pop();
  }

  const simplified = simplify(points, SIMPLIFY_TOLERANCE, true);
  return simplified.map(({ x, y }): Point2 => [x, y]);
}

function multiPolygonToPolygons(multiPolygon: ContourMultiPolygon): Polygon[] {
  const polygons: Polygon[] = [];
  for (const rings of multiPolygon.coordinates) {
    const simplified = rings.map(simplifyRing).filter((ring) => ring.length >= 3);
    const [outer, ...holes] = simplified;
    if (!outer) continue;
    polygons.push({ outer, holes });
  }
  return polygons;
}

/**
 * Traces a single numeric field into polygons in grid space; the region inside
 * is where value >= threshold.
 */
export function traceField(
  values: ArrayLike<number>,
  width: number,
  height: number,
  threshold: number,
): Polygon[] {
  const multiPolygon = contours()
    .size([width, height])
    .contour(values as unknown as number[], threshold);
  return multiPolygonToPolygons(multiPolygon);
}

/**
 * Traces each palette colour from the index grid into polygons in grid space
 * (x right, y down, range 0..width / 0..height, aligned with pixel cells).
 */
export function traceRegions(
  indices: Uint8Array,
  width: number,
  height: number,
): Map<number, Polygon[]> {
  const colors = new Set<number>();
  for (const index of indices) {
    if (index !== TRANSPARENT_INDEX) colors.add(index);
  }

  const regions = new Map<number, Polygon[]>();
  const values = new Float64Array(width * height);

  for (const colorIndex of colors) {
    for (let index = 0; index < values.length; index += 1) {
      values[index] = indices[index] === colorIndex ? 1 : 0;
    }

    const polygons = traceField(values, width, height, CONTOUR_THRESHOLD);
    if (polygons.length > 0) regions.set(colorIndex, polygons);
  }

  return regions;
}

function signedArea(points: Point2[]): number {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[(index + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function orient(points: Point2[], asHole: boolean): Point2[] {
  const area = signedArea(points);
  const shouldReverse = asHole ? area > 0 : area < 0;
  return shouldReverse ? points.slice().reverse() : points;
}

/**
 * Converts grid-space polygons to millimetres, flips Y (grid is top-down, the
 * model is Z-up), centres on the content bounds, and normalises winding.
 */
export function scaleRegions(
  regions: Map<number, Polygon[]>,
  mmPerPixel: number,
  centerX: number,
  centerY: number,
): Map<number, Polygon[]> {
  const toModel = ([x, y]: Point2): Point2 => [
    (x - centerX) * mmPerPixel,
    -(y - centerY) * mmPerPixel,
  ];

  const scaled = new Map<number, Polygon[]>();

  for (const [colorIndex, polygons] of regions) {
    scaled.set(
      colorIndex,
      polygons.map((polygon) => ({
        outer: orient(polygon.outer.map(toModel), false),
        holes: polygon.holes.map((hole) => orient(hole.map(toModel), true)),
      })),
    );
  }

  return scaled;
}
