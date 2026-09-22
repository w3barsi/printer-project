import type { RgbColor } from "./color";
import type { DecodedImage } from "./decode";
import { DEFAULT_ALPHA_THRESHOLD } from "./design";

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
  decoded: DecodedImage,
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

/**
 * Assigns every opaque pixel to the nearest of the given colors, skipping
 * median cut. Keeps the MAX_PALETTE_COLORS most-used colors.
 */
export function assignToPalette(
  decoded: DecodedImage,
  colors: RgbColor[],
  alphaThreshold = DEFAULT_ALPHA_THRESHOLD,
): QuantizedImage {
  if (colors.length === 0) {
    throw new Error("assignToPalette requires at least one color.");
  }

  const { width, height, data } = decoded;
  const pixelCount = width * height;
  const indices = new Uint8Array(pixelCount);
  const counts = new Uint32Array(colors.length);
  let transparentPixels = 0;

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    if (data[offset + 3] < alphaThreshold) {
      indices[pixel] = TRANSPARENT_INDEX;
      transparentPixels += 1;
      continue;
    }

    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < colors.length; index += 1) {
      const dr = r - colors[index].r;
      const dg = g - colors[index].g;
      const db = b - colors[index].b;
      const distance = dr * dr + dg * dg + db * db;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    }

    indices[pixel] = best;
    counts[best] += 1;
  }

  const kept = Array.from(colors.keys())
    .filter((index) => counts[index] > 0)
    .sort((a, b) => counts[b] - counts[a] || a - b)
    .slice(0, MAX_PALETTE_COLORS);

  const palette: PaletteEntry[] = kept.map((index) => ({
    ...colors[index],
    pixelCount: counts[index],
  }));

  if (kept.length !== colors.length) {
    const keptSet = new Set(kept);
    const remap = new Uint8Array(colors.length);
    kept.forEach((index, newIndex) => {
      remap[index] = newIndex;
    });

    for (let index = 0; index < colors.length; index += 1) {
      if (keptSet.has(index) || counts[index] === 0) continue;
      let best = kept[0];
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const candidate of kept) {
        const dr = colors[index].r - colors[candidate].r;
        const dg = colors[index].g - colors[candidate].g;
        const db = colors[index].b - colors[candidate].b;
        const distance = dr * dr + dg * dg + db * db;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = candidate;
        }
      }
      remap[index] = remap[best];
    }

    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      if (indices[pixel] !== TRANSPARENT_INDEX) {
        indices[pixel] = remap[indices[pixel]];
      }
    }
  }

  return { width, height, indices, palette, transparentPixels };
}
