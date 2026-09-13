import { ExtrudeGeometry, Path, Shape, type BufferGeometry } from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

import { mergeSpecks } from "./cleanup";
import { scaleRegions, traceRegions, type Polygon } from "./contours";
import {
  BASE_MARGIN_MM,
  BASE_THICKNESS_MM,
  DEFAULT_LAYER_THICKNESS,
  LAYER_EMBED_MM,
  TARGET_LONGEST_SIDE_MM,
} from "./design";
import { TRANSPARENT_INDEX, type QuantizedImage } from "./quantize";

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
  layerThickness: number;
  specksMerged: number;
  triangles: number;
};

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

const WELD_TOLERANCE = 1e-4;

export function buildKeychain(quantized: QuantizedImage): KeychainGeometry | null {
  const bounds = contentBounds(quantized);
  if (!bounds) return null;

  const contentWidthPx = Math.max(bounds.maxX - bounds.minX, 1);
  const contentHeightPx = Math.max(bounds.maxY - bounds.minY, 1);
  const targetContentMm = TARGET_LONGEST_SIDE_MM - BASE_MARGIN_MM * 2;
  const mmPerPixel = targetContentMm / Math.max(contentWidthPx, contentHeightPx);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  const { indices, mergedCount } = mergeSpecks(quantized, mmPerPixel);
  const regions = traceRegions(indices, quantized.width, quantized.height);
  const mmRegions = scaleRegions(regions, mmPerPixel, centerX, centerY);

  const contentWidth = contentWidthPx * mmPerPixel;
  const contentHeight = contentHeightPx * mmPerPixel;
  const width = contentWidth + BASE_MARGIN_MM * 2;
  const height = contentHeight + BASE_MARGIN_MM * 2;

  const base = weld(
    new ExtrudeGeometry(roundedRectShape(width, height, cornerRadius(width, height)), {
      depth: BASE_THICKNESS_MM,
      bevelEnabled: false,
    }),
  );

  const parts: KeychainPart[] = [];
  for (const [colorIndex, polygons] of mmRegions) {
    const shapes = polygons.map(polygonToShape);
    if (shapes.length === 0) continue;

    const geometry = new ExtrudeGeometry(shapes, {
      depth: DEFAULT_LAYER_THICKNESS,
      bevelEnabled: false,
    });
    geometry.translate(0, 0, BASE_THICKNESS_MM - LAYER_EMBED_MM);

    parts.push({
      colorIndex,
      geometry: weld(geometry),
      thickness: DEFAULT_LAYER_THICKNESS,
    });
  }

  const meshes = [base, ...parts.map((part) => part.geometry)];
  const triangles = meshes.reduce(
    (total, geometry) => total + triangleCount(geometry),
    0,
  );

  return {
    base,
    parts,
    width,
    height,
    baseThickness: BASE_THICKNESS_MM,
    layerThickness: DEFAULT_LAYER_THICKNESS,
    specksMerged: mergedCount,
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

function cornerRadius(width: number, height: number): number {
  return Math.min(3, width / 4, height / 4);
}

function roundedRectShape(width: number, height: number, radius: number): Shape {
  const shape = new Shape();
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));

  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);

  return shape;
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
