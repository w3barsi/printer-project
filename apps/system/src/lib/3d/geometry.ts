import { ExtrudeGeometry, Path, Shape, type BufferGeometry } from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

import {
  applyAttachmentToOutline,
  resolveAttachment,
  subtractAttachmentFromPolygon,
  type Attachment,
  type ResolvedAttachment,
} from "./attachment";
import { mergeSpecks } from "./cleanup";
import { scaleRegions, traceRegions, type Point2, type Polygon } from "./contours";
import { DEFAULT_LAYER_THICKNESS, LAYER_EMBED_MM, type BaseSettings } from "./design";
import { TRANSPARENT_INDEX, type QuantizedImage } from "./quantize";
import { detectThinColors } from "./warnings";

export type KeychainPart = {
  colorIndex: number;
  geometry: BufferGeometry;
  thickness: number;
};

export type KeychainGeometry = {
  base: BufferGeometry;
  parts: KeychainPart[];
  width: number;
  height: number;
  baseThickness: number;
  baseOutline: Point2[];
  attachment: ResolvedAttachment | null;
  specksMerged: number;
  thinColorIndexes: number[];
  triangles: number;
};

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

const WELD_TOLERANCE = 1e-4;
const CORNER_SEGMENTS = 8;

export function buildKeychain(
  quantized: QuantizedImage,
  base: BaseSettings,
  thicknesses: number[],
  attachment: Attachment | null,
): KeychainGeometry | null {
  const bounds = contentBounds(quantized);
  if (!bounds) return null;

  const contentWidthPx = Math.max(bounds.maxX - bounds.minX, 1);
  const contentHeightPx = Math.max(bounds.maxY - bounds.minY, 1);
  const targetContentMm = Math.max(base.longestSideMm - base.marginMm * 2, 1);
  const mmPerPixel = targetContentMm / Math.max(contentWidthPx, contentHeightPx);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  const { indices, mergedCount } = mergeSpecks(quantized, mmPerPixel);
  const regions = traceRegions(indices, quantized.width, quantized.height);
  const mmRegions = scaleRegions(regions, mmPerPixel, centerX, centerY);

  const width = contentWidthPx * mmPerPixel + base.marginMm * 2;
  const height = contentHeightPx * mmPerPixel + base.marginMm * 2;
  const radius = base.cornerRadiusMm ?? autoCornerRadius(width, height);

  const outline = roundedRectPolygon(width, height, radius);
  const resolvedAttachment = attachment
    ? resolveAttachment(outline, height, attachment)
    : null;
  const basePolygons = resolvedAttachment
    ? applyAttachmentToOutline(outline, resolvedAttachment)
    : [{ outer: outline, holes: [] }];
  const baseGeometry = weld(extrudePolygons(basePolygons, base.thicknessMm, 0));

  const parts: KeychainPart[] = [];
  for (const [colorIndex, polygons] of mmRegions) {
    const thickness = thicknesses[colorIndex] ?? DEFAULT_LAYER_THICKNESS;
    if (thickness <= 0) continue;

    const finalPolygons = resolvedAttachment
      ? polygons.flatMap((polygon) =>
          subtractAttachmentFromPolygon(polygon, resolvedAttachment),
        )
      : polygons;
    if (finalPolygons.length === 0) continue;

    const geometry = extrudePolygons(
      finalPolygons,
      thickness,
      base.thicknessMm - LAYER_EMBED_MM,
    );

    parts.push({ colorIndex, geometry: weld(geometry), thickness });
  }

  const meshes = [baseGeometry, ...parts.map((part) => part.geometry)];
  const triangles = meshes.reduce(
    (total, geometry) => total + triangleCount(geometry),
    0,
  );

  return {
    base: baseGeometry,
    parts,
    width,
    height,
    baseThickness: base.thicknessMm,
    baseOutline: outline,
    attachment: resolvedAttachment,
    specksMerged: mergedCount,
    thinColorIndexes: detectThinColors(
      indices,
      quantized.width,
      quantized.height,
      mmPerPixel,
    ),
    triangles,
  };
}

function contentBounds(quantized: QuantizedImage): Bounds | null {
  const { width, indices } = quantized;
  let minX = width;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = -1;
  let maxY = -1;

  for (let pixel = 0; pixel < indices.length; pixel += 1) {
    if (indices[pixel] === TRANSPARENT_INDEX) continue;
    const x = pixel % width;
    const y = (pixel - x) / width;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  if (maxX < 0 || maxY < 0) return null;
  return { minX, minY, maxX: maxX + 1, maxY: maxY + 1 };
}

function autoCornerRadius(width: number, height: number): number {
  return Math.min(3, width / 4, height / 4);
}

function roundedRectPolygon(width: number, height: number, radius: number): Point2[] {
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));

  if (r < 0.01) {
    return [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height],
    ];
  }

  const points: Point2[] = [];
  const corner = (start: Point2, control: Point2, end: Point2, includeEnd = true) => {
    const last = includeEnd ? CORNER_SEGMENTS : CORNER_SEGMENTS - 1;
    for (let index = 1; index <= last; index += 1) {
      const t = index / CORNER_SEGMENTS;
      const mt = 1 - t;
      points.push([
        mt * mt * start[0] + 2 * mt * t * control[0] + t * t * end[0],
        mt * mt * start[1] + 2 * mt * t * control[1] + t * t * end[1],
      ]);
    }
  };

  points.push([x + r, y]);
  points.push([x + width - r, y]);
  corner([x + width - r, y], [x + width, y], [x + width, y + r]);
  points.push([x + width, y + height - r]);
  corner(
    [x + width, y + height - r],
    [x + width, y + height],
    [x + width - r, y + height],
  );
  points.push([x + r, y + height]);
  corner([x + r, y + height], [x, y + height], [x, y + height - r]);
  points.push([x, y + r]);
  corner([x, y + r], [x, y], [x + r, y], false);

  return points;
}

function extrudePolygons(
  polygons: Polygon[],
  depth: number,
  zOffset: number,
): BufferGeometry {
  const shapes = polygons.map(polygonToShape);
  const geometry = new ExtrudeGeometry(shapes, { depth, bevelEnabled: false });
  if (zOffset !== 0) geometry.translate(0, 0, zOffset);
  return geometry;
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

function weld(geometry: BufferGeometry): BufferGeometry {
  const welded = mergeVertices(geometry, WELD_TOLERANCE);
  welded.computeBoundingBox();
  return welded;
}

function triangleCount(geometry: BufferGeometry): number {
  const index = geometry.getIndex();
  if (index) return index.count / 3;
  return (geometry.getAttribute("position")?.count ?? 0) / 3;
}
