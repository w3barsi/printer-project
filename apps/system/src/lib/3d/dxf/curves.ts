import type { Point2 } from "../contours";

/** Maximum distance between a sampled curve and the true curve, in millimetres. */
export const SAGITTA_MM = 0.05;

const SPLINE_SAMPLE_MAX = 1024;
const SPLINE_SAMPLE_MIN = 32;

type PolylineVertex = { x: number; y: number; bulge?: number };

function sampleCount(radiusMm: number, sweepRad: number, minSegments = 1): number {
  const radius = Math.abs(radiusMm);
  const ratio = radius > 0 ? Math.min(1, SAGITTA_MM / radius) : 1;
  const step = ratio >= 1 ? Math.PI : 2 * Math.acos(1 - ratio);
  return Math.max(minSegments, Math.ceil(sweepRad / step));
}

function pointsEqual(a: Point2, b: Point2): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/** Samples a DXF arc, angles in degrees, counter-clockwise from start to end. */
export function sampleArc(
  center: Point2,
  radius: number,
  startDegrees: number,
  endDegrees: number,
): Point2[] {
  let sweepDegrees = (((endDegrees - startDegrees) % 360) + 360) % 360;
  if (sweepDegrees === 0) sweepDegrees = 360;

  const start = (startDegrees * Math.PI) / 180;
  const sweep = (sweepDegrees * Math.PI) / 180;
  const count = sampleCount(radius, sweep);

  const points: Point2[] = [];
  for (let index = 0; index <= count; index += 1) {
    const angle = start + (sweep * index) / count;
    points.push([
      center[0] + Math.cos(angle) * radius,
      center[1] + Math.sin(angle) * radius,
    ]);
  }
  return points;
}

export function sampleCircle(center: Point2, radius: number): Point2[] {
  const count = sampleCount(radius, Math.PI * 2, 12);
  const points: Point2[] = [];
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    points.push([
      center[0] + Math.cos(angle) * radius,
      center[1] + Math.sin(angle) * radius,
    ]);
  }
  return points;
}

/**
 * Samples a DXF ellipse: `majorAxisEnd` is the major axis endpoint relative to
 * the centre, and the start/end are the parametric angles in radians. Equal
 * start/end means the full ellipse.
 */
export function sampleEllipse(
  center: Point2,
  majorAxisEnd: Point2,
  axisRatio: number,
  startParam: number,
  endParam: number,
): { points: Point2[]; closed: boolean } {
  const ux = majorAxisEnd[0] - center[0];
  const uy = majorAxisEnd[1] - center[1];
  const ratio = Math.max(axisRatio, 1e-6);
  const major = Math.hypot(ux, uy);
  const minor = major * ratio;

  let sweep = endParam - startParam;
  const full = Math.abs(sweep) < 1e-6 || Math.abs(Math.abs(sweep) - Math.PI * 2) < 1e-6;
  if (full) {
    sweep = Math.PI * 2;
  } else if (sweep < 0) {
    sweep += Math.PI * 2;
  }

  const count = sampleCount(Math.min(major, minor), sweep, full ? 12 : 1);
  const startAngle = full ? 0 : startParam;
  const points: Point2[] = [];

  for (let index = 0; index <= count; index += 1) {
    const angle = startAngle + (sweep * index) / count;
    points.push([
      center[0] + Math.cos(angle) * ux - Math.sin(angle) * uy * ratio,
      center[1] + Math.cos(angle) * uy + Math.sin(angle) * ux * ratio,
    ]);
  }
  if (full) points.pop();

  return { points, closed: full };
}

/**
 * Flattens an arc segment defined by its DXF bulge: tan(one fourth of the
 * included angle), positive for a counter-clockwise sweep. Returns the points
 * from after `start` through `end`.
 */
export function bulgeArc(start: Point2, end: Point2, bulge: number): Point2[] {
  const chord = Math.hypot(end[0] - start[0], end[1] - start[1]);
  if (chord < 1e-9) return [end];

  const theta = 4 * Math.atan(bulge);
  const radius = chord / (2 * Math.sin(Math.abs(theta) / 2));
  // Signed distance from the chord midpoint to the centre, positive to the left.
  const height = chord / (2 * Math.tan(theta / 2));
  const dx = (end[0] - start[0]) / chord;
  const dy = (end[1] - start[1]) / chord;
  const centerX = (start[0] + end[0]) / 2 - dy * height;
  const centerY = (start[1] + end[1]) / 2 + dx * height;
  const startAngle = Math.atan2(start[1] - centerY, start[0] - centerX);

  const count = sampleCount(radius, Math.abs(theta));
  const points: Point2[] = [];
  for (let index = 1; index < count; index += 1) {
    const angle = startAngle + (theta * index) / count;
    points.push([centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius]);
  }
  points.push(end);
  return points;
}

/**
 * Flattens a LWPOLYLINE/POLYLINE vertex list (bulges included) into a ring
 * without a duplicated closing point.
 */
export function samplePolyline(vertices: PolylineVertex[], closed: boolean): Point2[] {
  const count = vertices.length;
  if (count < 2) return [];

  const points: Point2[] = [];
  const segments = closed ? count : count - 1;

  for (let index = 0; index < segments; index += 1) {
    const from = vertices[index];
    const to = vertices[(index + 1) % count];
    const start: Point2 = [from.x, from.y];
    const end: Point2 = [to.x, to.y];
    if (index === 0) points.push(start);

    const bulge =
      typeof from.bulge === "number" && Number.isFinite(from.bulge) ? from.bulge : 0;
    if (Math.abs(bulge) < 1e-9 || pointsEqual(start, end)) {
      points.push(end);
    } else {
      points.push(...bulgeArc(start, end, bulge));
    }
  }

  if (closed && points.length > 1 && pointsEqual(points[0], points[points.length - 1])) {
    points.pop();
  }

  return points;
}

/**
 * Flattens a non-rational de Boor spline. dxf-parser does not surface DXF
 * weights, so rational splines are evaluated by their control points.
 * Returns null when the control data is unusable.
 */
export function sampleSpline(input: {
  controlPoints?: Array<{ x: number; y: number }>;
  knots: number[];
  degree: number;
}): Point2[] | null {
  const { controlPoints, knots, degree } = input;
  if (!controlPoints || controlPoints.length === 0) return null;

  const points: Point2[] = controlPoints.map(({ x, y }) => [x, y]);
  const p = degree;
  const n = points.length - 1;

  if (!Number.isInteger(p) || p < 1 || p > 8 || n < p) return null;
  if (knots.length !== n + p + 2) return null;

  const uStart = knots[p];
  const uEnd = knots[n + 1];
  if (!(uEnd > uStart)) return null;

  const samples = splineSampleCount(points);
  const result: Point2[] = [];
  for (let index = 0; index <= samples; index += 1) {
    const u = index === samples ? uEnd : uStart + ((uEnd - uStart) * index) / samples;
    const span = findSpan(u, p, knots, n);
    result.push(deBoor(span, p, u, knots, points));
  }
  return result;
}

function splineSampleCount(points: Point2[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(
      points[index][0] - points[index - 1][0],
      points[index][1] - points[index - 1][1],
    );
  }
  return Math.min(
    SPLINE_SAMPLE_MAX,
    Math.max(SPLINE_SAMPLE_MIN, Math.ceil(length / SAGITTA_MM)),
  );
}

function findSpan(u: number, p: number, knots: number[], n: number): number {
  if (u >= knots[n + 1]) return n;
  if (u <= knots[p]) return p;

  let low = p;
  let high = n + 1;
  let mid = (low + high) >> 1;
  while (u < knots[mid] || u >= knots[mid + 1]) {
    if (u < knots[mid]) {
      high = mid;
    } else {
      low = mid;
    }
    mid = (low + high) >> 1;
  }
  return mid;
}

function deBoor(
  k: number,
  p: number,
  u: number,
  knots: number[],
  points: Point2[],
): Point2 {
  const d: Point2[] = [];
  for (let j = 0; j <= p; j += 1) {
    const source = points[j + k - p];
    d[j] = [source[0], source[1]];
  }

  for (let r = 1; r <= p; r += 1) {
    for (let j = p; j >= r; j -= 1) {
      const i = j + k - p;
      const denominator = knots[i + p - r + 1] - knots[i];
      const alpha = denominator === 0 ? 0 : (u - knots[i]) / denominator;
      const previous = d[j - 1];
      const current = d[j];
      d[j] = [
        previous[0] + (current[0] - previous[0]) * alpha,
        previous[1] + (current[1] - previous[1]) * alpha,
      ];
    }
  }

  return d[p];
}
