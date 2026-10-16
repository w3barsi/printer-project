import { isInsideOutline, nearestOutlineT, pointAtT, polygonBounds } from "../attachment";
import type { Point2, Polygon } from "../contours";
import { DEFAULT_LANYARD_SPAN_MM, type Lanyard, type LanyardCorner } from "./design";
import { differencePolygons, offsetPolygons, unionPolygons } from "./offset";

/**
 * How far the tab reaches into the object, so the two solids overlap instead
 * of only touching along coincident walls.
 */
const BOND_MM = 0.4;
const ARC_SEGMENTS = 8;
/** Feet closer than this would make the aim direction unstable — and a level
 * pair must keep a chord that still fits a tab. */
const MIN_CONTACT_SEPARATION_MM = 2;
const MIN_CHORD_MM = 0.5;
/** Gaps smaller than this are rounding noise, not worth bridging. */
const MIN_FILL_AREA_MM2 = 0.5;
const SOLVE_SAMPLES = 512;

export type ContactSides = {
  leftT: number;
  rightT: number;
};

export type LanyardFrame = {
  /** Origin: the left contact foot on the outline. */
  point: Point2;
  /** Unit axis from the left foot to the right foot. */
  tangent: Point2;
  /** Unit axis pointing away from the object. */
  normal: Point2;
  /** Distance between the two feet. */
  widthMm: number;
  leftT: number;
  rightT: number;
};

/**
 * The two contact feet as perimeter parameters. Until they are dragged, they
 * sit symmetrically around the outline's top centre, `DEFAULT_LANYARD_SPAN_MM`
 * apart along the outline.
 */
export function resolveContacts(outline: Point2[], lanyard: Lanyard): ContactSides {
  if (lanyard.leftContact !== null && lanyard.rightContact !== null) {
    return { leftT: lanyard.leftContact, rightT: lanyard.rightContact };
  }
  if (outline.length < 3) return { leftT: 0, rightT: 0 };

  const topT = defaultPerimeterT(outline);
  const total = perimeterLength(outline);
  const halfT = total > 0 ? Math.min(0.25, DEFAULT_LANYARD_SPAN_MM / 2 / total) : 0.02;
  return { leftT: wrap01(topT - halfT), rightT: wrap01(topT + halfT) };
}

/** Keeps a dragged foot at least `MIN_CONTACT_SEPARATION_MM` from the other. */
export function clampContact(t: number, otherT: number, outline: Point2[]): number {
  const total = perimeterLength(outline);
  const minDelta = total > 0 ? MIN_CONTACT_SEPARATION_MM / total : 0.01;
  let delta = wrapSigned(t - otherT);
  if (Math.abs(delta) < minDelta) {
    delta = delta < 0 ? -minDelta : minDelta;
  }
  return wrap01(otherT + delta);
}

export function perimeterLength(outline: Point2[]): number {
  let total = 0;
  for (let index = 0; index < outline.length; index += 1) {
    const a = outline[index];
    const b = outline[(index + 1) % outline.length];
    total += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return total;
}

/**
 * The tab's frame: the bottom edge runs from the left foot to the right foot,
 * and the tab extends outward from that chord. The outward side is the chord
 * perpendicular that agrees with the outline normals at both feet.
 */
export function lanyardFrame(outline: Point2[], lanyard: Lanyard): LanyardFrame {
  const { leftT, rightT } = resolveContacts(outline, lanyard);
  const left = pointAtT(outline, leftT).point;
  const right = pointAtT(outline, rightT).point;
  const leftNormal = outwardNormalAt(outline, leftT);
  const rightNormal = outwardNormalAt(outline, rightT);

  const dx = right[0] - left[0];
  const dy = right[1] - left[1];
  const widthMm = Math.hypot(dx, dy);

  const tangent: Point2 =
    widthMm >= MIN_CHORD_MM
      ? [dx / widthMm, dy / widthMm]
      : [leftNormal[1], -leftNormal[0]];

  let normal: Point2 = [-tangent[1], tangent[0]];
  const refX = leftNormal[0] + rightNormal[0];
  const refY = leftNormal[1] + rightNormal[1];
  if (normal[0] * refX + normal[1] * refY < 0) {
    normal = [-normal[0], -normal[1]];
  }

  return { point: left, tangent, normal, widthMm, leftT, rightT };
}

/** Random-access walk over the outline: parameter t (0..1) to point. */
function perimeterWalker(outline: Point2[]): { pointAt: (t: number) => Point2 } | null {
  const count = outline.length;
  if (count < 3) return null;

  const cumulative = new Array<number>(count + 1);
  cumulative[0] = 0;
  for (let index = 0; index < count; index += 1) {
    const a = outline[index];
    const b = outline[(index + 1) % count];
    cumulative[index + 1] = cumulative[index] + Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  const total = cumulative[count];
  if (total <= 0) return null;

  return {
    pointAt: (t: number): Point2 => {
      const distance = (((t % 1) + 1) % 1) * total;

      let low = 0;
      let high = count - 1;
      while (low < high) {
        const mid = (low + high) >> 1;
        if (cumulative[mid + 1] < distance) low = mid + 1;
        else high = mid;
      }

      const segment = cumulative[low + 1] - cumulative[low];
      const local = segment > 0 ? (distance - cumulative[low]) / segment : 0;
      const a = outline[low];
      const b = outline[(low + 1) % count];
      return [a[0] + (b[0] - a[0]) * local, a[1] + (b[1] - a[1]) * local];
    },
  };
}

/** Every parameter where `errorAt` crosses zero, in perimeter order. */
function rootsOf(errorAt: (t: number) => number): number[] {
  const roots: number[] = [];
  let previousT = 0;
  let previousError = errorAt(0);

  for (let index = 1; index <= SOLVE_SAMPLES; index += 1) {
    const t = index / SOLVE_SAMPLES;
    const error = errorAt(t);
    if (error < 0 !== previousError < 0) {
      let low = previousT;
      let high = t;
      for (let step = 0; step < 30; step += 1) {
        const mid = (low + high) / 2;
        if (errorAt(mid) < 0 !== previousError < 0) high = mid;
        else low = mid;
      }
      roots.push((low + high) / 2);
    }
    previousT = t;
    previousError = error;
  }

  return roots;
}

/** The candidate with the smallest perimeter offset from `fromT`. */
function nearestTo(fromT: number, candidates: number[]): number | null {
  let best: number | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const delta = Math.abs(wrapSigned(candidate - fromT));
    if (delta < bestDelta) {
      best = candidate;
      bestDelta = delta;
    }
  }
  return best;
}

/**
 * Finds the perimeter parameter nearest `fromT` whose point sits `widthMm`
 * away from `anchor`. Powers the width lock: when a foot moves, the other is
 * re-solved against this so the chord length stays put. Returns null when no
 * solution exists.
 */
export function solveContactForWidth(
  outline: Point2[],
  fromT: number,
  anchor: Point2,
  widthMm: number,
): number | null {
  if (widthMm <= 0) return null;
  const walker = perimeterWalker(outline);
  if (!walker) return null;

  const roots = rootsOf((t) => {
    const point = walker.pointAt(t);
    return Math.hypot(point[0] - anchor[0], point[1] - anchor[1]) - widthMm;
  });
  return nearestTo(fromT, roots);
}

/** A horizontal line within this of a flat run counts as level along it. */
const LEVEL_EPSILON_MM = 1e-9;

/**
 * Parameters where the outline meets the horizontal line `targetY`:
 * transversal crossings (bisected) and grid samples on flat runs, in perimeter
 * order.
 */
function levelCandidates(pointAt: (t: number) => Point2, targetY: number): number[] {
  const candidates: number[] = [];
  const add = (t: number): void => {
    for (let index = candidates.length - 1; index >= 0; index -= 1) {
      if (Math.abs(wrapSigned(t - candidates[index])) < 0.25 / SOLVE_SAMPLES) return;
    }
    candidates.push(t);
  };

  let previousT = 0;
  let previousError = pointAt(0)[1] - targetY;
  if (Math.abs(previousError) <= LEVEL_EPSILON_MM) add(0);

  for (let index = 1; index <= SOLVE_SAMPLES; index += 1) {
    const t = index / SOLVE_SAMPLES;
    const error = pointAt(t)[1] - targetY;
    if (Math.abs(error) <= LEVEL_EPSILON_MM) add(t);
    if (error < 0 !== previousError < 0) {
      let low = previousT;
      let high = t;
      for (let step = 0; step < 30; step += 1) {
        const mid = (low + high) / 2;
        if (pointAt(mid)[1] - targetY < 0 !== previousError < 0) high = mid;
        else low = mid;
      }
      add((low + high) / 2);
    }
    previousT = t;
    previousError = error;
  }

  return candidates;
}

/**
 * Solves a level contact pair: both feet end up at the same height, so the
 * chord is flat and aligned with the X axis. The requested height is tried
 * first, then each foot's own height — at worst the other foot moves. Returns
 * null when no level pair exists; the caller holds the placement instead of
 * tilting the chord.
 */
export function solveLevelContacts(
  outline: Point2[],
  leftT: number,
  rightT: number,
  targetY: number,
): ContactSides | null {
  const walker = perimeterWalker(outline);
  if (!walker) return null;
  const { pointAt } = walker;

  const pairAtHeight = (height: number): ContactSides | null => {
    const candidates = levelCandidates(pointAt, height);
    if (candidates.length < 2) return null;

    const nextLeftT = nearestTo(leftT, candidates) ?? leftT;
    const nextRightT =
      nearestTo(
        rightT,
        candidates.filter((candidate) => candidate !== nextLeftT),
      ) ?? rightT;
    const left = pointAt(nextLeftT);
    const right = pointAt(nextRightT);
    if (Math.hypot(right[0] - left[0], right[1] - left[1]) < MIN_CONTACT_SEPARATION_MM) {
      return null;
    }

    return { leftT: nextLeftT, rightT: nextRightT };
  };

  return (
    pairAtHeight(targetY) ??
    pairAtHeight(pointAt(leftT)[1]) ??
    pairAtHeight(pointAt(rightT)[1])
  );
}

/**
 * The companion solve for an X-axis locked drag: the dragged foot stays where
 * the pointer put it and the companion takes the nearest level spot —
 * preferring the position a rigid slide of the pair would land on, so along a
 * flat run the holder slides as one piece instead of pinning to a corner.
 * Returns null when the outline offers no level spot clear of the dragged
 * foot; the drag then holds.
 */
export function solveLevelCompanion(
  outline: Point2[],
  draggedT: number,
  companionT: number,
  target: Point2,
): number | null {
  const walker = perimeterWalker(outline);
  if (!walker) return null;
  const { pointAt } = walker;
  const dragged = pointAt(draggedT);

  let best: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const candidate of levelCandidates(pointAt, dragged[1])) {
    const point = pointAt(candidate);
    if (
      Math.hypot(point[0] - dragged[0], point[1] - dragged[1]) < MIN_CONTACT_SEPARATION_MM
    ) {
      continue;
    }
    const distance = Math.hypot(point[0] - target[0], point[1] - target[1]);
    const delta = Math.abs(wrapSigned(candidate - companionT));
    if (
      distance < bestDistance - 1e-9 ||
      (distance <= bestDistance + 1e-9 && delta < bestDelta)
    ) {
      best = candidate;
      bestDistance = distance;
      bestDelta = delta;
    }
  }
  if (best === null) return null;

  // A grid hit on a flat run sits up to one step from the best spot; walk the
  // run locally so the slide stays smooth.
  const step = 1 / SOLVE_SAMPLES;
  const levelAt = (t: number): boolean =>
    Math.abs(pointAt(t)[1] - dragged[1]) <= LEVEL_EPSILON_MM;
  const distanceAt = (t: number): number => {
    const point = pointAt(t);
    return Math.hypot(point[0] - target[0], point[1] - target[1]);
  };

  let low = levelAt(best - step) ? best - step : best;
  let high = levelAt(best + step) ? best + step : best;
  for (let index = 0; index < 24 && high - low > 1e-7; index += 1) {
    const a = low + (high - low) / 3;
    const b = high - (high - low) / 3;
    if (distanceAt(a) <= distanceAt(b)) high = b;
    else low = a;
  }

  return (low + high) / 2;
}

/**
 * The pocket between the chord and the object outline, bonded into the
 * object. Both outline arcs between the feet are tried and the smaller
 * remainder wins, so a bridging tab never swallows the body on the far side.
 */
function gapFillPolygons(outline: Point2[], frame: LanyardFrame): Polygon[] {
  if (outline.length < 3) return [];

  const object = [{ outer: outline, holes: [] }];
  const objectWithBond = offsetPolygons(object, -BOND_MM);

  const fillFor = (ring: Point2[]): Polygon[] =>
    differencePolygons([{ outer: ring, holes: [] }], objectWithBond);

  const fillA = fillFor(arcRing(outline, frame.leftT, frame.rightT));
  const fillB = fillFor(arcRing(outline, frame.rightT, frame.leftT));

  const chosen = polygonArea(fillA) <= polygonArea(fillB) ? fillA : fillB;
  return polygonArea(chosen) > MIN_FILL_AREA_MM2 ? chosen : [];
}

/** The outline walked forward from `fromT` to `toT`; the chord closes it. */
function arcRing(outline: Point2[], fromT: number, toT: number): Point2[] {
  const count = outline.length;
  if (count < 3) return [];

  const total = perimeterLength(outline);
  if (total <= 0) return [];

  const cumulative = new Array<number>(count + 1);
  cumulative[0] = 0;
  for (let index = 0; index < count; index += 1) {
    const a = outline[index];
    const b = outline[(index + 1) % count];
    cumulative[index + 1] = cumulative[index] + Math.hypot(b[0] - a[0], b[1] - a[1]);
  }

  const fromD = wrap01(fromT) * total;
  const endD = fromD + wrap01(toT - fromT) * total;

  const ring: Point2[] = [pointAtT(outline, fromT).point];
  let index = 0;
  while (index < count && cumulative[index] <= fromD) index += 1;
  for (let step = index; ; step += 1) {
    const vertexIndex = step % count;
    const distance = Math.floor(step / count) * total + cumulative[vertexIndex];
    if (distance >= endD) break;
    ring.push(outline[vertexIndex]);
  }
  ring.push(pointAtT(outline, toT).point);

  return ring;
}

function polygonArea(polygons: Polygon[]): number {
  let total = 0;
  for (const polygon of polygons) {
    total += ringArea(polygon.outer);
    for (const hole of polygon.holes) total += ringArea(hole);
  }
  return total;
}

function ringArea(ring: Point2[]): number {
  let area = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const a = ring[index];
    const b = ring[(index + 1) % ring.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area / 2;
}

/**
 * The tab as polygons: a filleted rectangle spanning the two contacts, with
 * the elongated lanyard hole cut out and, when enabled, the pocket between
 * the chord and the object bridged. Overlapping the object (and its offsets)
 * fuses the solids.
 */
export function lanyardPolygons(outline: Point2[], lanyard: Lanyard): Polygon[] {
  if (outline.length < 3) return [];

  const frame = lanyardFrame(outline, lanyard);
  const tab = buildTabRing(lanyard, frame);
  const hole = buildHoleRing(lanyard, frame);

  let result = differencePolygons(
    [{ outer: tab, holes: [] }],
    [{ outer: hole, holes: [] }],
  );

  if (lanyard.fillGaps) {
    const fill = gapFillPolygons(outline, frame);
    if (fill.length > 0) result = unionPolygons(result, fill);
  }

  return result;
}

function defaultPerimeterT(outline: Point2[]): number {
  const bounds = polygonBounds([{ outer: outline, holes: [] }]);
  const target: Point2 = [(bounds.minX + bounds.maxX) / 2, bounds.maxY];
  return nearestOutlineT(outline, target).t;
}

function outwardNormalAt(outline: Point2[], t: number): Point2 {
  const { point, normal } = pointAtT(outline, t);
  const probe: Point2 = [point[0] + normal[0] * 0.02, point[1] + normal[1] * 0.02];
  const sign = isInsideOutline(outline, probe) ? -1 : 1;
  return [normal[0] * sign, normal[1] * sign];
}

function toWorld(frame: LanyardFrame, u: number, v: number): Point2 {
  return [
    frame.point[0] + frame.tangent[0] * u + frame.normal[0] * v,
    frame.point[1] + frame.tangent[1] * u + frame.normal[1] * v,
  ];
}

function buildTabRing(lanyard: Lanyard, frame: LanyardFrame): Point2[] {
  const width = frame.widthMm;
  const inner = -BOND_MM;
  const outer = lanyard.heightMm;
  // Keeping each fillet within half of the shorter adjacent edge prevents
  // neighbouring arcs from crossing each other.
  const limit = Math.min(width / 2, (outer - inner) / 2);
  const fillet = (corner: LanyardCorner) =>
    Math.min(limit, Math.max(0, lanyard.corners[corner].filletMm));

  const innerLeft = fillet("innerLeft");
  const innerRight = fillet("innerRight");
  const outerRight = fillet("outerRight");
  const outerLeft = fillet("outerLeft");

  // Counter-clockwise from the bottom edge: each entry is an arc centre plus
  // its start angle; arcs sweep 90°.
  const points: Point2[] = [];
  cornerArc(points, frame, innerLeft, inner + innerLeft, innerLeft, 180);
  cornerArc(points, frame, width - innerRight, inner + innerRight, innerRight, 270);
  cornerArc(points, frame, width - outerRight, outer - outerRight, outerRight, 0);
  cornerArc(points, frame, outerLeft, outer - outerLeft, outerLeft, 90);

  return points;
}

function cornerArc(
  points: Point2[],
  frame: LanyardFrame,
  centerU: number,
  centerV: number,
  radius: number,
  startDegrees: number,
): void {
  if (radius <= 1e-6) {
    points.push(toWorld(frame, centerU, centerV));
    return;
  }

  for (let index = 0; index <= ARC_SEGMENTS; index += 1) {
    const angle = ((startDegrees + (90 * index) / ARC_SEGMENTS) * Math.PI) / 180;
    points.push(
      toWorld(
        frame,
        centerU + Math.cos(angle) * radius,
        centerV + Math.sin(angle) * radius,
      ),
    );
  }
}

/** A stadium-shaped slot centred in the tab's outward extent. */
function buildHoleRing(lanyard: Lanyard, frame: LanyardFrame): Point2[] {
  const halfWidth = lanyard.holeWidthMm / 2;
  const halfHeight = lanyard.holeHeightMm / 2;
  const radius = Math.min(halfWidth, halfHeight);
  const a = halfWidth - radius;
  const b = halfHeight - radius;
  const centerU = frame.widthMm / 2;
  const centerV = lanyard.heightMm / 2;

  const points: Point2[] = [];
  const arc = (cu: number, cv: number, start: number) => {
    for (let index = 0; index < ARC_SEGMENTS; index += 1) {
      const angle = start + (Math.PI / 2) * (index / ARC_SEGMENTS);
      points.push(
        toWorld(
          frame,
          centerU + cu + Math.cos(angle) * radius,
          centerV + cv + Math.sin(angle) * radius,
        ),
      );
    }
  };

  // Counter-clockwise quarter arcs: bottom-right, top-right, top-left, bottom-left.
  arc(a, -b, -Math.PI / 2);
  arc(a, b, 0);
  arc(-a, b, Math.PI / 2);
  arc(-a, -b, Math.PI);

  return points;
}

function wrap01(value: number): number {
  return ((value % 1) + 1) % 1;
}

function wrapSigned(value: number): number {
  return wrap01(value + 0.5) - 0.5;
}
