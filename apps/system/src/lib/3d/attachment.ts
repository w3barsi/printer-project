import { diff, union, type Geometry } from "martinez-polygon-clipping";

import type { Point2, Polygon } from "./contours";

export const ATTACHMENT_WALL_MM = 1.6;
export const DEFAULT_ATTACHMENT_SIZE_MM = 4.2;

export const ATTACHMENT_LIMITS = {
  sizeMm: { min: 2.5, max: 8, step: 0.1 },
} as const;

export type AttachmentType = "hook" | "hole" | "bookmark";

export type Attachment = {
  type: AttachmentType;
  /** Opening diameter in millimetres. */
  sizeMm: number;
  /** Millimetre position for hole/bookmark; null keeps the type default. */
  position: Point2 | null;
  /** Perimeter parameter (0..1) for the hook; null keeps the top-centre default. */
  perimeterT: number | null;
};

export const DEFAULT_ATTACHMENT: Attachment = {
  type: "hook",
  sizeMm: DEFAULT_ATTACHMENT_SIZE_MM,
  position: null,
  perimeterT: null,
};

export type ResolvedAttachment =
  | {
      kind: "hook";
      point: Point2;
      innerRadiusMm: number;
      outerRadiusMm: number;
      perimeterT: number;
    }
  | {
      kind: "hole";
      center: Point2;
      radiusMm: number;
    };

export function resolveAttachment(
  polygons: Polygon[],
  attachment: Attachment,
): ResolvedAttachment | null {
  const primary = primaryPolygon(polygons);
  if (!primary) return null;

  const bounds = polygonBounds(polygons);

  if (attachment.type === "hook") {
    const t =
      attachment.perimeterT ??
      nearestOutlineT(primary.outer, [(bounds.minX + bounds.maxX) / 2, bounds.maxY]).t;
    const { point } = pointAtT(primary.outer, t);
    const innerRadiusMm = attachment.sizeMm / 2;
    return {
      kind: "hook",
      point,
      innerRadiusMm,
      outerRadiusMm: innerRadiusMm + ATTACHMENT_WALL_MM,
      perimeterT: t,
    };
  }

  const radiusMm = attachment.sizeMm / 2;
  const defaultY =
    attachment.type === "bookmark"
      ? bounds.minY + ATTACHMENT_WALL_MM + radiusMm
      : bounds.maxY - ATTACHMENT_WALL_MM - radiusMm;

  const candidate = attachment.position ?? [0, defaultY];
  if (isPlacementValid(polygons, candidate, radiusMm)) {
    return { kind: "hole", center: candidate, radiusMm };
  }

  const fallback: Point2 = [0, defaultY];
  if (isPlacementValid(polygons, fallback, radiusMm)) {
    return { kind: "hole", center: fallback, radiusMm };
  }

  return null;
}

export function isPlacementValid(
  polygons: Polygon[],
  center: Point2,
  radiusMm: number,
): boolean {
  const required = radiusMm + ATTACHMENT_WALL_MM - 1e-6;
  return (
    isInsidePolygons(polygons, center) && distanceToPolygons(polygons, center) >= required
  );
}

export function circleRing(center: Point2, radius: number, segments = 48): Point2[] {
  const ring: Point2[] = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    ring.push([
      center[0] + Math.cos(angle) * radius,
      center[1] + Math.sin(angle) * radius,
    ]);
  }
  ring.push(ring[0]);
  return ring;
}

export function applyAttachmentToPolygons(
  polygons: Polygon[],
  attachment: ResolvedAttachment,
): Polygon[] {
  if (polygons.length === 0) return polygons;

  try {
    const subject = polygonsToGeometry(polygons);

    if (attachment.kind === "hook") {
      const merged = toMultiPolygon(
        union(subject, [[circleRing(attachment.point, attachment.outerRadiusMm)]]),
      );
      const holed = toMultiPolygon(
        diff(merged, [[circleRing(attachment.point, attachment.innerRadiusMm)]]),
      );
      const result = toPolygons(holed);
      if (result.length > 0) return result;
    } else {
      const holed = toMultiPolygon(
        diff(subject, [[circleRing(attachment.center, attachment.radiusMm)]]),
      );
      const result = toPolygons(holed);
      if (result.length > 0) return result;
    }
  } catch {
    // Fall through to the untouched polygons.
  }

  return polygons;
}

export function subtractAttachmentFromPolygon(
  polygon: Polygon,
  attachment: ResolvedAttachment,
): Polygon[] {
  const circle = circleRing(
    attachment.kind === "hook" ? attachment.point : attachment.center,
    attachment.kind === "hook" ? attachment.innerRadiusMm : attachment.radiusMm,
  );

  try {
    const subject = [[closeRing(polygon.outer), ...polygon.holes.map(closeRing)]];
    const result = toMultiPolygon(diff(subject, [[circle]]));
    return toPolygons(result);
  } catch {
    return [polygon];
  }
}

/** Subtracts whole polygons (e.g. colour regions) from the base. */
export function subtractPolygons(base: Polygon[], clippers: Polygon[]): Polygon[] {
  if (clippers.length === 0) return base;

  try {
    const result = toMultiPolygon(
      diff(polygonsToGeometry(base), polygonsToGeometry(clippers)),
    );
    return toPolygons(result);
  } catch {
    return base;
  }
}

function polygonsToGeometry(polygons: Polygon[]): Geometry {
  return polygons.map((polygon) => [
    closeRing(polygon.outer),
    ...polygon.holes.map(closeRing),
  ]) as unknown as Geometry;
}

export function polygonBounds(polygons: Polygon[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const polygon of polygons) {
    for (const [x, y] of polygon.outer) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  return { minX, minY, maxX, maxY };
}

function primaryPolygon(polygons: Polygon[]): Polygon | null {
  let best: Polygon | null = null;
  let bestArea = 0;

  for (const polygon of polygons) {
    const bounds = polygonBounds([polygon]);
    const area = (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
    if (area > bestArea) {
      best = polygon;
      bestArea = area;
    }
  }

  return best;
}

function isInsidePolygons(polygons: Polygon[], point: Point2): boolean {
  for (const polygon of polygons) {
    if (!isInsideOutline(polygon.outer, point)) continue;
    if (polygon.holes.some((hole) => isInsideOutline(hole, point))) continue;
    return true;
  }
  return false;
}

function distanceToPolygons(polygons: Polygon[], point: Point2): number {
  let best = Number.POSITIVE_INFINITY;
  for (const polygon of polygons) {
    best = Math.min(best, distanceToOutline(polygon.outer, point));
    for (const hole of polygon.holes) {
      best = Math.min(best, distanceToOutline(hole, point));
    }
  }
  return best;
}

function closeRing(points: Point2[]): Point2[] {
  if (points.length === 0) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return points;
  return [...points, first];
}

function openRing(points: Point2[]): Point2[] {
  if (points.length < 2) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return points.slice(0, -1);
  return points;
}

function toMultiPolygon(geometry: Geometry | null): Geometry {
  if (!geometry) return [];
  const value = geometry as unknown as unknown[];
  if (value.length === 0) return [];
  const first = value[0];
  if (!Array.isArray(first) || first.length === 0) return [];
  const firstFirst = first[0];
  if (!Array.isArray(firstFirst) || firstFirst.length === 0) return [];
  if (typeof firstFirst[0] === "number") {
    return [first] as unknown as Geometry;
  }
  return geometry;
}

function toPolygons(geometry: Geometry): Polygon[] {
  const polygons: Polygon[] = [];
  for (const rings of geometry as unknown as Point2[][][]) {
    const [outerRing, ...holeRings] = rings;
    if (!outerRing) continue;
    const outer = openRing(outerRing);
    if (outer.length < 3) continue;
    const holes = holeRings.map(openRing).filter((hole) => hole.length >= 3);
    polygons.push({ outer, holes });
  }
  return polygons;
}

export function pointAtT(
  outline: Point2[],
  t: number,
): { point: Point2; normal: Point2 } {
  const cumulative = segmentCumulative(outline);
  const total = cumulative[cumulative.length - 1];
  const clamped = ((t % 1) + 1) % 1;
  const distance = clamped * total;

  for (let index = 0; index < outline.length; index += 1) {
    const start = cumulative[index];
    const end = cumulative[index + 1];
    if (distance <= end || index === outline.length - 1) {
      const a = outline[index];
      const b = outline[(index + 1) % outline.length];
      const length = Math.max(end - start, 1e-9);
      const local = Math.min(Math.max((distance - start) / length, 0), 1);
      return {
        point: [a[0] + (b[0] - a[0]) * local, a[1] + (b[1] - a[1]) * local],
        normal: [(b[1] - a[1]) / length, -(b[0] - a[0]) / length],
      };
    }
  }

  return { point: outline[0], normal: [0, 1] };
}

export function nearestOutlineT(
  outline: Point2[],
  target: Point2,
): { t: number; point: Point2; normal: Point2 } {
  const cumulative = segmentCumulative(outline);
  const total = cumulative[cumulative.length - 1];
  let best = { t: 0, point: outline[0], normal: [0, 1] as Point2 };
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < outline.length; index += 1) {
    const a = outline[index];
    const b = outline[(index + 1) % outline.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lengthSq = dx * dx + dy * dy;
    const length = Math.sqrt(lengthSq);
    if (length < 1e-9) continue;

    const local = Math.min(
      Math.max(((target[0] - a[0]) * dx + (target[1] - a[1]) * dy) / lengthSq, 0),
      1,
    );
    const point: Point2 = [a[0] + dx * local, a[1] + dy * local];
    const distance = Math.hypot(target[0] - point[0], target[1] - point[1]);

    if (distance < bestDistance) {
      bestDistance = distance;
      best = {
        t: (cumulative[index] + length * local) / total,
        point,
        normal: [dy / length, -dx / length],
      };
    }
  }

  return best;
}

export function isInsideOutline(outline: Point2[], point: Point2): boolean {
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i, i += 1) {
    const [xi, yi] = outline[i];
    const [xj, yj] = outline[j];
    const intersects =
      yi > point[1] !== yj > point[1] &&
      point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function distanceToOutline(outline: Point2[], point: Point2): number {
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < outline.length; index += 1) {
    const a = outline[index];
    const b = outline[(index + 1) % outline.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lengthSq = dx * dx + dy * dy;
    const local =
      lengthSq < 1e-12
        ? 0
        : Math.min(
            Math.max(((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSq, 0),
            1,
          );
    best = Math.min(
      best,
      Math.hypot(point[0] - (a[0] + dx * local), point[1] - (a[1] + dy * local)),
    );
  }
  return best;
}

function segmentCumulative(outline: Point2[]): number[] {
  const cumulative: number[] = [0];
  for (let index = 0; index < outline.length; index += 1) {
    const a = outline[index];
    const b = outline[(index + 1) % outline.length];
    cumulative.push(cumulative[index] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return cumulative;
}
