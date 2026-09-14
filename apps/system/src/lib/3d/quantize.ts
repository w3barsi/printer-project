import { DEFAULT_ALPHA_THRESHOLD } from "./design";
import type { DecodedPng } from "./png";

export const MAX_PALETTE_COLORS = 5;
export const TRANSPARENT_INDEX = 255;

const BITS = 5;
const LEVELS = 1 << BITS;
const BIN_COUNT = LEVELS * LEVELS * LEVELS;

export type PaletteEntry = {
  r: number;
  g: number;
  b: number;
  pixelCount: number;
};

export type QuantizedImage = {
  width: number;
  height: number;
  /** Palette index per pixel, or TRANSPARENT_INDEX for transparent pixels. */
  indices: Uint8Array;
  palette: PaletteEntry[];
  transparentPixels: number;
};

type Channel = 0 | 1 | 2;

function binIndex(r: number, g: number, b: number): number {
  return (
    ((r >> (8 - BITS)) << (BITS * 2)) | ((g >> (8 - BITS)) << BITS) | (b >> (8 - BITS))
  );
}

function channelValue(bin: number, channel: Channel): number {
  if (channel === 0) return (bin >> (BITS * 2)) & (LEVELS - 1);
  if (channel === 1) return (bin >> BITS) & (LEVELS - 1);
  return bin & (LEVELS - 1);
}

function boxPixelCount(box: number[], counts: Uint32Array): number {
  let total = 0;
  for (const bin of box) total += counts[bin];
  return total;
}

function widestChannel(box: number[]): Channel {
  const mins = [LEVELS, LEVELS, LEVELS];
  const maxes = [0, 0, 0];

  for (const bin of box) {
    for (let channel = 0; channel < 3; channel += 1) {
      const value = channelValue(bin, channel as Channel);
      if (value < mins[channel]) mins[channel] = value;
      if (value > maxes[channel]) maxes[channel] = value;
    }
  }

  const ranges = [maxes[0] - mins[0], maxes[1] - mins[1], maxes[2] - mins[2]];
  if (ranges[0] >= ranges[1] && ranges[0] >= ranges[2]) return 0;
  if (ranges[1] >= ranges[2]) return 1;
  return 2;
}

function medianCut(
  bins: number[],
  counts: Uint32Array,
  targetColors: number,
): number[][] {
  const boxes: number[][] = [bins.slice()];

  while (boxes.length < targetColors) {
    let candidate = -1;
    let candidateCount = 0;

    for (let index = 0; index < boxes.length; index += 1) {
      if (boxes[index].length < 2) continue;
      const count = boxPixelCount(boxes[index], counts);
      if (count > candidateCount) {
        candidate = index;
        candidateCount = count;
      }
    }

    if (candidate === -1) break;

    const box = boxes[candidate];
    const channel = widestChannel(box);
    box.sort((a, b) => channelValue(a, channel) - channelValue(b, channel) || a - b);

    const total = boxPixelCount(box, counts);
    let accumulated = 0;
    let splitAt = box.length - 1;
    for (let index = 0; index < box.length - 1; index += 1) {
      accumulated += counts[box[index]];
      if (accumulated * 2 >= total) {
        splitAt = index + 1;
        break;
      }
    }

    boxes.splice(candidate, 1, box.slice(0, splitAt), box.slice(splitAt));
  }

  return boxes;
}

function clampColorCount(value: number): number {
  return Math.min(MAX_PALETTE_COLORS, Math.max(1, Math.round(value)));
}

export function quantize(
  decoded: DecodedPng,
  requestedColorCount: number,
  alphaThreshold = DEFAULT_ALPHA_THRESHOLD,
): QuantizedImage {
  const colorCount = clampColorCount(requestedColorCount);
  const { width, height, data } = decoded;
  const pixelCount = width * height;

  const counts = new Uint32Array(BIN_COUNT);
  const sumR = new Float64Array(BIN_COUNT);
  const sumG = new Float64Array(BIN_COUNT);
  const sumB = new Float64Array(BIN_COUNT);
  let transparentPixels = 0;

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    if (data[offset + 3] < alphaThreshold) {
      transparentPixels += 1;
      continue;
    }
    const bin = binIndex(data[offset], data[offset + 1], data[offset + 2]);
    counts[bin] += 1;
    sumR[bin] += data[offset];
    sumG[bin] += data[offset + 1];
    sumB[bin] += data[offset + 2];
  }

  const bins: number[] = [];
  for (let bin = 0; bin < BIN_COUNT; bin += 1) {
    if (counts[bin] > 0) bins.push(bin);
  }

  const indices = new Uint8Array(pixelCount);
  if (bins.length === 0) {
    indices.fill(TRANSPARENT_INDEX);
    return { width, height, indices, palette: [], transparentPixels };
  }

  const boxes = medianCut(bins, counts, colorCount);
  const palette: PaletteEntry[] = boxes.map((box) => {
    let pixelTotal = 0;
    let r = 0;
    let g = 0;
    let b = 0;

    for (const bin of box) {
      pixelTotal += counts[bin];
      r += sumR[bin];
      g += sumG[bin];
      b += sumB[bin];
    }

    return {
      r: Math.round(r / pixelTotal),
      g: Math.round(g / pixelTotal),
      b: Math.round(b / pixelTotal),
      pixelCount: pixelTotal,
    };
  });

  const binToPalette = new Uint8Array(BIN_COUNT);
  for (const bin of bins) {
    const pixelTotal = counts[bin];
    const r = sumR[bin] / pixelTotal;
    const g = sumG[bin] / pixelTotal;
    const b = sumB[bin] / pixelTotal;
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < palette.length; index += 1) {
      const dr = r - palette[index].r;
      const dg = g - palette[index].g;
      const db = b - palette[index].b;
      const distance = dr * dr + dg * dg + db * db;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    }

    binToPalette[bin] = best;
  }

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    if (data[offset + 3] < alphaThreshold) {
      indices[pixel] = TRANSPARENT_INDEX;
      continue;
    }
    indices[pixel] =
      binToPalette[binIndex(data[offset], data[offset + 1], data[offset + 2])];
  }

  return { width, height, indices, palette, transparentPixels };
}
