import { BufferGeometry } from "three";

import {
  applyAttachmentToPolygons,
  circleRing,
  polygonBounds,
  resolveAttachment,
  subtractAttachmentFromPolygon,
  subtractPolygons,
  type Attachment,
  type ResolvedAttachment,
} from "./attachment";
import { distanceField, mergeSpecks } from "./cleanup";
import {
  scaleRegions,
  traceField,
  traceRegions,
  type Point2,
  type Polygon,
} from "./contours";
import {
  DEFAULT_LAYER_THICKNESS,
  LAYER_EMBED_MM,
  MIN_REGION_AREA_MM2,
  type BaseSettings,
} from "./design";
import { emptyGeometry, extrudePolygons, triangleCount, weld } from "./extrude";
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
  /** All base polygons (outer rings and holes) in millimetres. */
  baseOutlines: Polygon[];
  /** Largest outline ring, used for hook placement. */
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

const CORNER_SEGMENTS = 8;
const CIRCLE_SEGMENTS = 128;

export function buildKeychain(
  quantized: QuantizedImage,
  base: BaseSettings,
  thicknesses: number[],
  attachment: Attachment | null,
  speckThresholdMm2 = MIN_REGION_AREA_MM2,
): KeychainGeometry | null {
  const bounds = contentBounds(quantized);
  if (!bounds) return null;

  const contentWidthPx = Math.max(bounds.maxX - bounds.minX, 1);
  const contentHeightPx = Math.max(bounds.maxY - bounds.minY, 1);
  const marginMm = base.marginMm;
  const targetContentMm = Math.max(base.longestSideMm - marginMm * 2, 1);
  // A round base is sized by its diameter, so the artwork has to fit by its
  // diagonal; the other shapes are sized by their longest side.
  const spanPx =
    base.style === "circle"
      ? Math.hypot(contentWidthPx, contentHeightPx)
      : Math.max(contentWidthPx, contentHeightPx);
  const mmPerPixel = targetContentMm / spanPx;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  const { indices, mergedCount } = mergeSpecks(quantized, mmPerPixel, speckThresholdMm2);
  const regions = traceRegions(indices, quantized.width, quantized.height);
  const mmRegions = scaleRegions(regions, mmPerPixel, centerX, centerY);

  const width =
    base.style === "circle"
      ? base.longestSideMm
      : contentWidthPx * mmPerPixel + marginMm * 2;
  const height =
    base.style === "circle"
      ? base.longestSideMm
      : contentHeightPx * mmPerPixel + marginMm * 2;
  const radius = base.cornerRadiusMm ?? autoCornerRadius(width, height);

  const visibleRegions: {
    colorIndex: number;
    polygons: Polygon[];
    thickness: number;
  }[] = [];
  for (const [colorIndex, polygons] of mmRegions) {
    const thickness = thicknesses[colorIndex] ?? DEFAULT_LAYER_THICKNESS;
    if (thickness <= 0) continue;
    visibleRegions.push({ colorIndex, polygons, thickness });
  }

  let initialOutlines: Polygon[];
  if (base.style === "outline") {
    const visibleColors = new Set(visibleRegions.map((region) => region.colorIndex));
    const outlinePolygons = outlineBasePolygons(
      indices,
      quantized.width,
      quantized.height,
      visibleColors,
      marginMm,
      mmPerPixel,
      centerX,
      centerY,
    );
    initialOutlines =
      outlinePolygons.length > 0
        ? outlinePolygons
        : [{ outer: roundedRectPolygon(width, height, radius), holes: [] }];
  } else if (base.style === "circle") {
    initialOutlines = [
      { outer: circleRing([0, 0], base.longestSideMm / 2, CIRCLE_SEGMENTS), holes: [] },
    ];
  } else {
    initialOutlines = [{ outer: roundedRectPolygon(width, height, radius), holes: [] }];
  }

  const resolvedAttachment = attachment
    ? resolveAttachment(initialOutlines, attachment)
    : null;

  const colorLayers = visibleRegions
    .map((region) => ({
      ...region,
      polygons: resolvedAttachment
        ? region.polygons.flatMap((polygon) =>
            subtractAttachmentFromPolygon(polygon, resolvedAttachment),
          )
        : region.polygons,
    }))
    .filter((layer) => layer.polygons.length > 0);

  let basePolygons = resolvedAttachment
    ? applyAttachmentToPolygons(initialOutlines, resolvedAttachment)
    : initialOutlines;
  if (base.faceDown) {
    // Colour layers run the full base height, so base material only remains
    // where the artwork has none.
    basePolygons = subtractPolygons(
      basePolygons,
      colorLayers.flatMap((layer) => layer.polygons),
    );
  }

  const baseGeometry =
    basePolygons.length > 0
      ? weld(extrudePolygons(basePolygons, base.thicknessMm, 0))
      : emptyGeometry();

  const parts: KeychainPart[] = [];
  for (const layer of colorLayers) {
    const thickness = base.faceDown ? base.thicknessMm : layer.thickness;
    const zOffset = base.faceDown ? 0 : base.thicknessMm - LAYER_EMBED_MM;

    const geometry = extrudePolygons(layer.polygons, thickness, zOffset);
    parts.push({
      colorIndex: layer.colorIndex,
      geometry: weld(geometry),
      thickness,
    });
  }

  const footprint = polygonBounds(initialOutlines);

  const meshes = [baseGeometry, ...parts.map((part) => part.geometry)];
  const triangles = meshes.reduce(
    (total, geometry) => total + triangleCount(geometry),
    0,
  );

  return {
    base: baseGeometry,
    parts,
    width: footprint.maxX - footprint.minX,
    height: footprint.maxY - footprint.minY,
    baseThickness: base.thicknessMm,
    baseOutlines: initialOutlines,
    baseOutline: primaryOutline(initialOutlines),
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

function outlineBasePolygons(
  indices: Uint8Array,
  width: number,
  height: number,
  visibleColors: Set<number>,
  marginMm: number,
  mmPerPixel: number,
  centerX: number,
  centerY: number,
): Polygon[] {
  // Pad the raster so the margin can grow outside the image bounds; without
  // this, artwork that touches the border gets a clipped outline there.
  const radiusPx = marginMm / mmPerPixel;
  const pad = Math.max(2, Math.ceil(radiusPx) + 2);
  const paddedWidth = width + pad * 2;
  const paddedHeight = height + pad * 2;
  const mask = new Uint8Array(paddedWidth * paddedHeight);
  let hasContent = false;

  for (let index = 0; index < indices.length; index += 1) {
    const colorIndex = indices[index];
    if (colorIndex === TRANSPARENT_INDEX || !visibleColors.has(colorIndex)) {
      continue;
    }
    const x = index % width;
    const y = (index - x) / width;
    mask[(y + pad) * paddedWidth + (x + pad)] = 1;
    hasContent = true;
  }
  if (!hasContent) return [];

  const distances = distanceField(mask, paddedWidth, paddedHeight);
  const values = new Float64Array(distances.length);
  for (let index = 0; index < values.length; index += 1) {
    values[index] = radiusPx + 0.5 - distances[index];
  }
  const polygons = traceField(values, paddedWidth, paddedHeight, 0);
  if (polygons.length === 0) return [];

  const scaled = scaleRegions(
    new Map([[1, polygons]]),
    mmPerPixel,
    centerX + pad,
    centerY + pad,
  );
  return scaled.get(1) ?? [];
}

function primaryOutline(polygons: Polygon[]): Point2[] {
  let best: Point2[] = [];
  let bestArea = 0;

  for (const polygon of polygons) {
    const bounds = polygonBounds([polygon]);
    const area = (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
    if (area > bestArea) {
      best = polygon.outer;
      bestArea = area;
    }
  }

  return best;
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
