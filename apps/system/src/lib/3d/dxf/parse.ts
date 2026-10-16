import DxfParser, {
  type IArcEntity,
  type ICircleEntity,
  type IDxf,
  type IEllipseEntity,
  type ILineEntity,
  type ILwpolylineEntity,
  type IPolylineEntity,
  type ISplineEntity,
} from "dxf-parser";

import { polygonBounds } from "../attachment";
import type { Point2, Polygon } from "../contours";
import {
  sampleArc,
  sampleCircle,
  sampleEllipse,
  samplePolyline,
  sampleSpline,
} from "./curves";
import { assemblePolygons } from "./offset";

export type DxfUnits = {
  /** Multiplier from drawing coordinates to millimetres. */
  scaleToMm: number;
  label: string;
  assumed: boolean;
};

export type DxfResults = {
  /** Closed outlines in millimetres, centred on the origin. */
  profile: Polygon[];
  units: DxfUnits;
  /** Entity types that were ignored, counted per type. */
  unsupported: Map<string, number>;
  /** Open segments that could not be chained into a closed outline. */
  openContours: number;
  /** Splines skipped because their control data was unusable. */
  splinesSkipped: number;
};

const BINARY_SENTINEL = "AutoCAD Binary DXF";

const UNIT_SCALES: Record<number, { scaleToMm: number; label: string }> = {
  1: { scaleToMm: 25.4, label: "inches" },
  4: { scaleToMm: 1, label: "millimetres" },
  5: { scaleToMm: 10, label: "centimetres" },
  6: { scaleToMm: 1000, label: "metres" },
};

export function parseDxf(text: string): DxfResults {
  if (text.startsWith(BINARY_SENTINEL)) {
    throw new Error("Binary DXF files are not supported — export an ASCII DXF.");
  }

  let dxf: IDxf | null;
  try {
    dxf = new DxfParser().parseSync(text);
  } catch {
    throw new Error("This file could not be read as a DXF.");
  }
  if (!dxf || !Array.isArray(dxf.entities) || dxf.entities.length === 0) {
    throw new Error("This file contains no DXF entities.");
  }

  const units = readUnits(dxf.header ?? {});
  const rings: Point2[][] = [];
  const fragments: Point2[][] = [];
  const unsupported = new Map<string, number>();
  let splinesSkipped = 0;

  const skip = (type: string) => {
    unsupported.set(type, (unsupported.get(type) ?? 0) + 1);
  };

  for (const entity of dxf.entities) {
    switch (entity.type) {
      case "LINE": {
        const line = entity as ILineEntity;
        const [start, end] = line.vertices;
        if (!start || !end) break;
        fragments.push([
          [start.x, start.y],
          [end.x, end.y],
        ]);
        break;
      }
      case "LWPOLYLINE": {
        const poly = entity as ILwpolylineEntity;
        if (isMirrored(poly.extrusionDirectionZ)) {
          skip("LWPOLYLINE in a mirrored plane");
          break;
        }
        collectPolyline(rings, fragments, poly.vertices, poly.shape === true);
        break;
      }
      case "POLYLINE": {
        const poly = entity as IPolylineEntity;
        if (poly.is3dPolyline || poly.is3dPolygonMesh || poly.isPolyfaceMesh) {
          skip("3D POLYLINE");
          break;
        }
        if (isMirrored(poly.extrusionDirection?.z)) {
          skip("POLYLINE in a mirrored plane");
          break;
        }
        collectPolyline(rings, fragments, poly.vertices, poly.shape === true);
        break;
      }
      case "CIRCLE": {
        const circle = entity as ICircleEntity;
        rings.push(sampleCircle([circle.center.x, circle.center.y], circle.radius));
        break;
      }
      case "ARC": {
        const arc = entity as IArcEntity;
        if (isMirrored(arc.extrusionDirectionZ)) {
          skip("ARC in a mirrored plane");
          break;
        }
        fragments.push(
          sampleArc(
            [arc.center.x, arc.center.y],
            arc.radius,
            arc.startAngle,
            arc.endAngle,
          ),
        );
        break;
      }
      case "ELLIPSE": {
        const ellipse = entity as IEllipseEntity;
        const sampled = sampleEllipse(
          [ellipse.center.x, ellipse.center.y],
          [ellipse.majorAxisEndPoint.x, ellipse.majorAxisEndPoint.y],
          ellipse.axisRatio,
          ellipse.startAngle,
          ellipse.endAngle,
        );
        if (sampled.points.length >= 3) {
          (sampled.closed ? rings : fragments).push(sampled.points);
        }
        break;
      }
      case "SPLINE": {
        const spline = entity as ISplineEntity;
        const points = sampleSpline({
          controlPoints: spline.controlPoints,
          knots: spline.knotValues ?? [],
          degree: spline.degreeOfSplineCurve,
        });
        if (!points || points.length < 2) {
          splinesSkipped += 1;
          break;
        }
        (spline.closed ? rings : fragments).push(points);
        break;
      }
      default:
        skip(entity.type);
        break;
    }
  }

  const toMm = ([x, y]: Point2): Point2 => [x * units.scaleToMm, y * units.scaleToMm];
  const mmRings = rings.map((ring) => ring.map(toMm));
  const mmFragments = fragments.map((fragment) => fragment.map(toMm));

  // Endpoint tolerance follows the drawing size so loose vertices from CAD
  // exports still chain; clamped to sane millimetre bounds.
  const diagonal = drawingDiagonal([...mmRings, ...mmFragments]);
  const tolerance = Math.min(0.05, Math.max(0.002, diagonal * 0.001));

  const closedFragments: Point2[][] = [];
  const openFragments: Point2[][] = [];
  for (const fragment of mmFragments) {
    if (
      fragment.length >= 3 &&
      pointDistance(fragment[0], fragment[fragment.length - 1]) <= tolerance
    ) {
      fragment.pop();
      closedFragments.push(fragment);
    } else {
      openFragments.push(fragment);
    }
  }

  const chained = chainSegments(openFragments, tolerance);
  const assembled = assemblePolygons([...mmRings, ...closedFragments, ...chained.rings]);

  return {
    profile: centreProfile(assembled),
    units,
    unsupported,
    openContours: chained.open,
    splinesSkipped,
  };
}

function collectPolyline(
  rings: Point2[][],
  fragments: Point2[][],
  vertices: Array<{ x: number; y: number; bulge?: number }>,
  closed: boolean,
): void {
  const points = samplePolyline(vertices, closed);
  if (points.length < 2) return;
  if (closed) {
    if (points.length >= 3) rings.push(points);
  } else {
    fragments.push(points);
  }
}

function readUnits(header: Record<string, unknown>): DxfUnits {
  const raw = header["$INSUNITS"];
  const insunits = typeof raw === "number" ? raw : 0;
  const unit = UNIT_SCALES[insunits];
  if (!unit) return { scaleToMm: 1, label: "millimetres", assumed: true };
  return { ...unit, assumed: false };
}

/** OCS with a negative Z mirrors the entity; v1 skips those. */
function isMirrored(z: number | undefined): boolean {
  return typeof z === "number" && Number.isFinite(z) && z < 0;
}

function drawingDiagonal(rings: Point2[][]): number {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const ring of rings) {
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (!Number.isFinite(minX)) return 0;
  return Math.hypot(maxX - minX, maxY - minY);
}

function pointDistance(a: Point2, b: Point2): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/**
 * Greedy walk that joins open segments (LINE/ARC chains) end to end within
 * tolerance. Closed results become rings; dead ends count as open contours.
 */
function chainSegments(
  segments: Point2[][],
  tolerance: number,
): { rings: Point2[][]; open: number } {
  const remaining = segments.filter((segment) => segment.length >= 2);
  const rings: Point2[][] = [];
  let open = 0;

  while (remaining.length > 0) {
    const chain = remaining.pop() as Point2[];
    let grown = true;

    while (grown) {
      grown = false;
      const head = chain[0];
      const tail = chain[chain.length - 1];

      let bestIndex = -1;
      let bestDistance = tolerance;
      let bestReverse = false;
      let bestAtTail = true;

      for (let index = 0; index < remaining.length; index += 1) {
        const segment = remaining[index];
        const start = segment[0];
        const end = segment[segment.length - 1];
        const options = [
          { anchor: tail, connect: start, reverse: false, atTail: true },
          { anchor: tail, connect: end, reverse: true, atTail: true },
          { anchor: head, connect: end, reverse: false, atTail: false },
          { anchor: head, connect: start, reverse: true, atTail: false },
        ];

        for (const option of options) {
          const distance = pointDistance(option.anchor, option.connect);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
            bestReverse = option.reverse;
            bestAtTail = option.atTail;
          }
        }
      }

      if (bestIndex < 0) break;

      const [segment] = remaining.splice(bestIndex, 1);
      const oriented = bestReverse ? segment.slice().reverse() : segment;
      if (bestAtTail) {
        chain.push(...oriented.slice(1));
      } else {
        chain.unshift(...oriented.slice(0, -1));
      }
      grown = true;
    }

    if (
      chain.length >= 3 &&
      pointDistance(chain[0], chain[chain.length - 1]) <= tolerance
    ) {
      chain.pop();
      if (chain.length >= 3) {
        rings.push(chain);
        continue;
      }
    }
    open += 1;
  }

  return { rings, open };
}

function centreProfile(polygons: Polygon[]): Polygon[] {
  if (polygons.length === 0) return polygons;

  const bounds = polygonBounds(polygons);
  const dx = -(bounds.minX + bounds.maxX) / 2;
  const dy = -(bounds.minY + bounds.maxY) / 2;
  const move = ([x, y]: Point2): Point2 => [x + dx, y + dy];

  return polygons.map((polygon) => ({
    outer: polygon.outer.map(move),
    holes: polygon.holes.map((hole) => hole.map(move)),
  }));
}
