import ClipperLib, { type PolyNode, type PolyTree } from "clipper-lib";

import { orient, type Point2, type Polygon } from "../contours";

/** Integer precision Clipper works in: 1e4 per millimetre (0.1 µm). */
export const CLIPPER_SCALE = 10_000;
/** Round joins that stay within the shared 0.05 mm sagitta. */
const ARC_TOLERANCE_MM = 0.05;

type IntPoint = { X: number; Y: number };

function toPath(ring: Point2[]): IntPoint[] {
  return ring.map(([x, y]) => ({
    X: Math.round(x * CLIPPER_SCALE),
    Y: Math.round(y * CLIPPER_SCALE),
  }));
}

function toPaths(rings: Point2[][]): IntPoint[][] {
  const paths: IntPoint[][] = [];
  for (const ring of rings) {
    if (ring.length >= 3) paths.push(toPath(ring));
  }
  return paths;
}

function pathToRing(path: IntPoint[]): Point2[] {
  const ring: Point2[] = path.map(({ X, Y }) => [X / CLIPPER_SCALE, Y / CLIPPER_SCALE]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && first[0] === last[0] && first[1] === last[1]) ring.pop();
  return ring;
}

function polyTreeToPolygons(tree: PolyTree): Polygon[] {
  const polygons: Polygon[] = [];
  for (const node of tree.Childs()) collectNode(node, polygons);
  return polygons;
}

function collectNode(node: PolyNode, out: Polygon[]): void {
  // Depth is even here: the node itself is an outer polygon.
  const outer = pathToRing(node.Contour());
  const holes: Point2[][] = [];

  for (const child of node.Childs()) {
    const hole = pathToRing(child.Contour());
    if (hole.length >= 3) holes.push(orient(hole, true));
    // A child of a hole is an island: a new outer polygon of its own.
    for (const island of child.Childs()) collectNode(island, out);
  }

  if (outer.length >= 3) {
    out.push({ outer: orient(outer, false), holes });
  }
}

/**
 * Resolves any set of rings into clean polygons: even-odd filling decides
 * nesting (holes), and overlaps and self-intersections are dissolved.
 * Winding is normalised (outers counter-clockwise, holes clockwise).
 */
export function assemblePolygons(rings: Point2[][]): Polygon[] {
  const paths = toPaths(rings);
  if (paths.length === 0) return [];

  const clipper = new ClipperLib.Clipper();
  clipper.AddPaths(paths, ClipperLib.PolyType.ptSubject, true);
  const tree = new ClipperLib.PolyTree();
  clipper.Execute(
    ClipperLib.ClipType.ctUnion,
    tree,
    ClipperLib.PolyFillType.pftEvenOdd,
    ClipperLib.PolyFillType.pftEvenOdd,
  );

  return polyTreeToPolygons(tree);
}

/** Dissolves overlaps and fixes winding without moving any edge. */
export function cleanPolygons(polygons: Polygon[]): Polygon[] {
  return assemblePolygons(ringsOf(polygons));
}

/** True union of two normalised polygon sets (overlaps stay filled). */
export function unionPolygons(a: Polygon[], b: Polygon[]): Polygon[] {
  if (a.length === 0) return b;
  if (b.length === 0) return a;

  const clipper = new ClipperLib.Clipper();
  clipper.AddPaths(toPaths(ringsOf(a)), ClipperLib.PolyType.ptSubject, true);
  clipper.AddPaths(toPaths(ringsOf(b)), ClipperLib.PolyType.ptClip, true);

  const tree = new ClipperLib.PolyTree();
  clipper.Execute(
    ClipperLib.ClipType.ctUnion,
    tree,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero,
  );

  return polyTreeToPolygons(tree);
}

/**
 * Subtracts the cutter polygons from the subject polygons. Inputs are expected
 * to be normalised Polygons (outers counter-clockwise, holes clockwise).
 */
export function differencePolygons(subject: Polygon[], cutters: Polygon[]): Polygon[] {
  if (subject.length === 0) return [];
  if (cutters.length === 0) return subject;

  const clipper = new ClipperLib.Clipper();
  clipper.AddPaths(toPaths(ringsOf(subject)), ClipperLib.PolyType.ptSubject, true);
  clipper.AddPaths(toPaths(ringsOf(cutters)), ClipperLib.PolyType.ptClip, true);

  const tree = new ClipperLib.PolyTree();
  clipper.Execute(
    ClipperLib.ClipType.ctDifference,
    tree,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero,
  );

  return polyTreeToPolygons(tree);
}

/**
 * The band worked by offsetting from `innerMm` to `outerMm`: a stroke of
 * `outerMm - innerMm` around every outline. Both passes share the sign so the
 * band follows the object outwards (or inwards, when both are positive but
 * shrinking).
 */
export function bandPolygons(
  polygons: Polygon[],
  innerMm: number,
  outerMm: number,
): Polygon[] {
  return differencePolygons(
    offsetPolygons(polygons, outerMm),
    offsetPolygons(polygons, innerMm),
  );
}

function ringsOf(polygons: Polygon[]): Point2[][] {
  const rings: Point2[][] = [];
  for (const polygon of polygons) {
    rings.push(polygon.outer, ...polygon.holes);
  }
  return rings;
}

/**
 * Offsets every outline by a signed distance: positive grows outward,
 * negative insets. Holes offset in the opposite direction, as they should.
 * An inset that removes all material returns an empty list.
 */
export function offsetPolygons(polygons: Polygon[], deltaMm: number): Polygon[] {
  if (polygons.length === 0) return [];
  if (deltaMm === 0) return cleanPolygons(polygons);

  const rings = ringsOf(polygons);

  // ClipperOffset needs consistent orientations before it can tell outers
  // from holes; the simplify pass fixes both orientation and overlaps.
  const normalized = ClipperLib.Clipper.SimplifyPolygons(
    toPaths(rings),
    ClipperLib.PolyFillType.pftEvenOdd,
  );
  if (normalized.length === 0) return [];

  const offset = new ClipperLib.ClipperOffset();
  offset.ArcTolerance = ARC_TOLERANCE_MM * CLIPPER_SCALE;
  offset.AddPaths(
    normalized,
    ClipperLib.JoinType.jtRound,
    ClipperLib.EndType.etClosedPolygon,
  );

  const solution: IntPoint[][] = [];
  offset.Execute(solution, deltaMm * CLIPPER_SCALE);
  if (solution.length === 0) return [];

  return assemblePolygons(solution.map(pathToRing));
}
