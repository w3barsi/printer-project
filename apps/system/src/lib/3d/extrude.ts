import { BufferGeometry, ExtrudeGeometry, Path, Shape } from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

import type { Polygon } from "./contours";

const WELD_TOLERANCE = 1e-4;

/** Extrudes closed polygons (with holes) along +Z. */
export function extrudePolygons(
  polygons: Polygon[],
  depth: number,
  zOffset: number,
): BufferGeometry {
  const shapes = polygons.map(polygonToShape);
  const geometry = new ExtrudeGeometry(shapes, { depth, bevelEnabled: false });
  if (zOffset !== 0) geometry.translate(0, 0, zOffset);
  return geometry;
}

export function weld(geometry: BufferGeometry): BufferGeometry {
  const welded = mergeVertices(geometry, WELD_TOLERANCE);
  welded.computeBoundingBox();
  return welded;
}

export function emptyGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.computeBoundingBox();
  return geometry;
}

export function triangleCount(geometry: BufferGeometry): number {
  const index = geometry.getIndex();
  if (index) return index.count / 3;
  return (geometry.getAttribute("position")?.count ?? 0) / 3;
}

function polygonToShape(polygon: Polygon): Shape {
  const shape = new Shape();
  const [first, ...rest] = polygon.outer;
  shape.moveTo(first[0], first[1]);
  for (const [x, y] of rest) shape.lineTo(x, y);
  shape.closePath();

  for (const hole of polygon.holes) {
    const path = new Path();
    const [holeFirst, ...holeRest] = hole;
    path.moveTo(holeFirst[0], holeFirst[1]);
    for (const [x, y] of holeRest) path.lineTo(x, y);
    path.closePath();
    shape.holes.push(path);
  }

  return shape;
}
