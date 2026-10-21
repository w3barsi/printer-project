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
/** Feet closer than this would make the aim direction unstable. */
const MIN_CONTACT_SEPARATION_MM = 2;
const MIN_CHORD_MM = 0.5;
/** Gaps smaller than this are rounding noise, not worth bridging. */
const MIN_FILL_AREA_MM2 = 0.5;

export type LanyardContacts = {
  left: Point2;
  right: Point2;
};

export type LanyardFrame = {
  /** Origin: the left contact foot. */
  point: Point2;
  /** Unit axis from the left foot to the right foot. */
  tangent: Point2;
  /** Unit axis pointing away from the object. */
  normal: Point2;
  /** Distance between the two feet. */
  widthMm: number;
};

/**
 * The two contact feet. Stored points win; until they are dragged they sit
 * symmetrically around the outline's top centre, `DEFAULT_LANYARD_SPAN_MM`
 * apart along the outline. With the width locked the feet are free to leave
 * the outline as the tab is moved — the gap fill bridges them back to the
 * object.
 */
export function resolveLanyardContacts(
  outline: Point2[],
  lanyard: Lanyard,
): LanyardContacts {
  if (lanyard.leftPoint !== null && lanyard.rightPoint !== null) {
    return { left: lanyard.leftPoint, right: lanyard.rightPoint };
  }
  if (outline.length < 3) return { left: [0, 0], right: [0, 0] };

  const topT = defaultPerimeterT(outline);
  const total = perimeterLength(outline);
  const halfT = total > 0 ? Math.min(0.25, DEFAULT_LANYARD_SPAN_MM / 2 / total) : 0.02;
  return {
    left: pointAtT(outline, wrap01(topT - halfT)).point,
    right: pointAtT(outline, wrap01(topT + halfT)).point,
  };
}

/** Keeps a dragged foot at least `MIN_CONTACT_SEPARATION_MM` from the other. */
export function clampContact(point: Point2, other: Point2): Point2 {
  const dx = point[0] - other[0];
  const dy = point[1] - other[1];
  const distance = Math.hypot(dx, dy);
  if (distance >= MIN_CONTACT_SEPARATION_MM) return point;
  if (distance < 1e-9) return [other[0] + MIN_CONTACT_SEPARATION_MM, other[1]];

  const scale = MIN_CONTACT_SEPARATION_MM / distance;
  return [other[0] + dx * scale, other[1] + dy * scale];
}

/**
 * Levels the pair — flat and aligned with the X axis — rotating about its
 * midpoint so the span is kept exact. Returns the same contacts when they are
 * already level.
 */
export function levelContacts(contacts: LanyardContacts): LanyardContacts {
  const [leftX, leftY] = contacts.left;
  const [rightX, rightY] = contacts.right;
  if (Math.abs(leftY - rightY) < 1e-6) return contacts;

  const midX = (leftX + rightX) / 2;
  const midY = (leftY + rightY) / 2;
  const half = Math.hypot(rightX - leftX, rightY - leftY) / 2;
  const direction = rightX >= leftX ? 1 : -1;
  return {
    left: [midX - half * direction, midY],
    right: [midX + half * direction, midY],
  };
}

/**
 * Swings one foot around the other, span kept: the dragged foot keeps its
 * distance from the pivot and follows the pointer's direction. The tab (and
 * its hole) rotate rigidly; the feet may leave the outline.
 */
export function rotateContactsAboutFoot(
  contacts: LanyardContacts,
  dragged: "left" | "right",
  pointer: Point2,
): LanyardContacts {
  const pivot = dragged === "left" ? contacts.right : contacts.left;
  const current = dragged === "left" ? contacts.left : contacts.right;
  const dx = current[0] - pivot[0];
  const dy = current[1] - pivot[1];
  const span = Math.hypot(dx, dy);
  if (span < 1e-6) return contacts;

  const px = pointer[0] - pivot[0];
  const py = pointer[1] - pivot[1];
  const distance = Math.hypot(px, py);
  const direction: Point2 =
    distance < 1e-6 ? [dx / span, dy / span] : [px / distance, py / distance];
  const next: Point2 = [pivot[0] + direction[0] * span, pivot[1] + direction[1] * span];

  return dragged === "left" ? { left: next, right: pivot } : { left: pivot, right: next };
}

/**
 * Widens or narrows the pair about its midpoint, keeping its direction, so a
 * typed width never moves the tab's centre.
 */
export function resizeContacts(
  contacts: LanyardContacts,
  widthMm: number,
): LanyardContacts {
  const [leftX, leftY] = contacts.left;
  const [rightX, rightY] = contacts.right;
  const midX = (leftX + rightX) / 2;
  const midY = (leftY + rightY) / 2;
  const length = Math.hypot(rightX - leftX, rightY - leftY);
  const directionX = length > 1e-9 ? (rightX - leftX) / length : 1;
  const directionY = length > 1e-9 ? (rightY - leftY) / length : 0;
  const half = widthMm / 2;
  return {
    left: [midX - directionX * half, midY - directionY * half],
    right: [midX + directionX * half, midY + directionY * half],
  };
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
 * perpendicular that agrees with the outline normals at the feet's nearest
 * outline points — the feet themselves may sit off the outline.
 */
export function lanyardFrame(outline: Point2[], lanyard: Lanyard): LanyardFrame {
  const { left, right } = resolveLanyardContacts(outline, lanyard);
  const leftNormal = outwardNormalAt(outline, nearestOutlineT(outline, left).t);
  const rightNormal = outwardNormalAt(outline, nearestOutlineT(outline, right).t);

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

  return { point: left, tangent, normal, widthMm };
}

/**
 * The region between the tab's chord and the object, bonded into the object,
 * that keeps the tab attached: each foot reaches toward the model at its
 * nearest outline point, and the pocket between those landings and the chord
 * is filled. A foot already on the outline contributes no segment — it is
 * simply connected. Both outline arcs between the landings are tried and the
 * smaller remainder wins, so a bridging tab never swallows the body on the
 * far side.
 */
function gapFillPolygons(outline: Point2[], contacts: LanyardContacts): Polygon[] {
  if (outline.length < 3) return [];
  // A tab whose feet are both inside the object is already fused by the
  // union; there is no pocket to bridge.
  if (
    isInsideOutline(outline, contacts.left) &&
    isInsideOutline(outline, contacts.right)
  ) {
    return [];
  }

  const object = [{ outer: outline, holes: [] }];
  const objectWithBond = offsetPolygons(object, -BOND_MM);
  const fillFor = (ring: Point2[]): Polygon[] =>
    differencePolygons([{ outer: ring, holes: [] }], objectWithBond);

  const leftLandingT = nearestOutlineT(outline, contacts.left).t;
  const rightLandingT = nearestOutlineT(outline, contacts.right).t;
  const fillA = fillFor(
    gapRing(outline, contacts.left, contacts.right, leftLandingT, rightLandingT),
  );
  const fillB = fillFor(
    gapRing(outline, contacts.right, contacts.left, rightLandingT, leftLandingT),
  );

  const chosen = polygonArea(fillA) <= polygonArea(fillB) ? fillA : fillB;
  return polygonArea(chosen) > MIN_FILL_AREA_MM2 ? chosen : [];
}

/**
 * The gap fill ring: from the foot, a segment toward its landing on the
 * outline, the outline walked from the first landing to the second, then the
 * mirror segment out to the other foot — closed by the chord.
 */
function gapRing(
  outline: Point2[],
  from: Point2,
  to: Point2,
  fromT: number,
  toT: number,
): Point2[] {
  const ring: Point2[] = [];
  const landingFrom = pointAtT(outline, fromT).point;
  const landingTo = pointAtT(outline, toT).point;

  if (Math.hypot(from[0] - landingFrom[0], from[1] - landingFrom[1]) > 1e-6) {
    ring.push(from);
  }
  ring.push(...arcRing(outline, fromT, toT));
  if (Math.hypot(to[0] - landingTo[0], to[1] - landingTo[1]) > 1e-6) {
    ring.push(to);
  }

  return ring;
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
 * the chord and the object bridged — including when the feet sit off the
 * outline. Overlapping the object (and its offsets) fuses the solids.
 */
export function lanyardPolygons(outline: Point2[], lanyard: Lanyard): Polygon[] {
  if (outline.length < 3) return [];

  const contacts = resolveLanyardContacts(outline, lanyard);
  const frame = lanyardFrame(outline, lanyard);
  const tab = buildTabRing(lanyard, frame);
  const hole = buildHoleRing(lanyard, frame);

  let result = differencePolygons(
    [{ outer: tab, holes: [] }],
    [{ outer: hole, holes: [] }],
  );

  if (lanyard.fillGaps) {
    const fill = gapFillPolygons(outline, contacts);
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

  const outerRight = fillet("outerRight");
  const outerLeft = fillet("outerLeft");

  // Counter-clockwise from the bottom edge: each entry is an arc centre plus
  // its start angle; arcs sweep 90°. The feet corners stay sharp — they sit
  // buried in the object.
  const points: Point2[] = [];
  cornerArc(points, frame, 0, inner, 0, 180);
  cornerArc(points, frame, width, inner, 0, 270);
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

/** A filleted rectangle centred in the tab's outward extent. */
function buildHoleRing(lanyard: Lanyard, frame: LanyardFrame): Point2[] {
  const halfWidth = lanyard.holeWidthMm / 2;
  const halfHeight = lanyard.holeHeightMm / 2;
  const centerU = frame.widthMm / 2;
  const centerV = lanyard.heightMm / 2;
  const minU = centerU - halfWidth;
  const maxU = centerU + halfWidth;
  const minV = centerV - halfHeight;
  const maxV = centerV + halfHeight;
  // Keeping each fillet within the hole's half-extents prevents neighbouring
  // arcs from crossing each other.
  const limit = Math.min(halfWidth, halfHeight);
  const fillet = (corner: LanyardCorner) =>
    Math.min(limit, Math.max(0, lanyard.corners[corner].filletMm));

  const bottomLeft = fillet("holeBottomLeft");
  const bottomRight = fillet("holeBottomRight");
  const topRight = fillet("holeTopRight");
  const topLeft = fillet("holeTopLeft");

  // Counter-clockwise quarter arcs: bottom-left, bottom-right, top-right,
  // top-left.
  const points: Point2[] = [];
  cornerArc(points, frame, minU + bottomLeft, minV + bottomLeft, bottomLeft, 180);
  cornerArc(points, frame, maxU - bottomRight, minV + bottomRight, bottomRight, 270);
  cornerArc(points, frame, maxU - topRight, maxV - topRight, topRight, 0);
  cornerArc(points, frame, minU + topLeft, maxV - topLeft, topLeft, 90);

  return points;
}

function wrap01(value: number): number {
  return ((value % 1) + 1) % 1;
}
