import { MIN_REGION_AREA_MM2 } from "./design";
import { TRANSPARENT_INDEX, type QuantizedImage } from "./quantize";

export type CleanupResult = {
  indices: Uint8Array;
  mergedCount: number;
};

/**
 * Reassigns colour islands smaller than MIN_REGION_AREA_MM2 to their dominant
 * neighbouring colour, or removes them when they only touch transparency.
 */
export function mergeSpecks(
  quantized: QuantizedImage,
  mmPerPixel: number,
  minAreaMm2 = MIN_REGION_AREA_MM2,
): CleanupResult {
  const { width, height } = quantized;
  const indices = new Uint8Array(quantized.indices);
  const minAreaPixels = minAreaMm2 / (mmPerPixel * mmPerPixel);
  if (minAreaPixels <= 1) {
    return { indices, mergedCount: 0 };
  }

  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  const stack: number[] = [];
  const component: number[] = [];
  let mergedCount = 0;

  for (let start = 0; start < pixelCount; start += 1) {
    if (visited[start] || indices[start] === TRANSPARENT_INDEX) continue;

    const colorIndex = indices[start];
    component.length = 0;
    stack.length = 0;
    stack.push(start);
    visited[start] = 1;

    while (stack.length > 0) {
      const pixel = stack.pop();
      if (pixel === undefined) break;
      component.push(pixel);

      const x = pixel % width;
      const y = (pixel - x) / width;

      if (x > 0 && !visited[pixel - 1] && indices[pixel - 1] === colorIndex) {
        visited[pixel - 1] = 1;
        stack.push(pixel - 1);
      }
      if (x < width - 1 && !visited[pixel + 1] && indices[pixel + 1] === colorIndex) {
        visited[pixel + 1] = 1;
        stack.push(pixel + 1);
      }
      if (y > 0 && !visited[pixel - width] && indices[pixel - width] === colorIndex) {
        visited[pixel - width] = 1;
        stack.push(pixel - width);
      }
      if (
        y < height - 1 &&
        !visited[pixel + width] &&
        indices[pixel + width] === colorIndex
      ) {
        visited[pixel + width] = 1;
        stack.push(pixel + width);
      }
    }

    if (component.length >= minAreaPixels) continue;

    const neighborCounts = new Map<number, number>();
    for (const pixel of component) {
      const x = pixel % width;
      const y = (pixel - x) / width;
      const neighbors = [
        x > 0 ? pixel - 1 : -1,
        x < width - 1 ? pixel + 1 : -1,
        y > 0 ? pixel - width : -1,
        y < height - 1 ? pixel + width : -1,
      ];

      for (const neighbor of neighbors) {
        if (neighbor < 0) continue;
        const neighborColor = indices[neighbor];
        if (neighborColor === TRANSPARENT_INDEX || neighborColor === colorIndex) {
          continue;
        }
        neighborCounts.set(neighborColor, (neighborCounts.get(neighborColor) ?? 0) + 1);
      }
    }

    let replacement = TRANSPARENT_INDEX;
    let bestCount = 0;
    for (const [neighborColor, count] of neighborCounts) {
      if (count > bestCount) {
        bestCount = count;
        replacement = neighborColor;
      }
    }

    for (const pixel of component) indices[pixel] = replacement;
    mergedCount += 1;
  }

  return { indices, mergedCount };
}

/**
 * Exact Euclidean distance (in pixels) from each pixel to the nearest mask
 * pixel, using the Felzenszwalb two-pass distance transform.
 */
export function distanceField(
  mask: Uint8Array,
  width: number,
  height: number,
): Float64Array {
  const infinity = 1e20;
  const size = Math.max(width, height);
  const f = new Float64Array(size);
  const d = new Float64Array(size);
  const v = new Int32Array(size);
  const z = new Float64Array(size + 1);
  const output = new Float64Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      f[x] = mask[y * width + x] ? 0 : infinity;
    }
    edt1d(f, d, v, z, width);
    for (let x = 0; x < width; x += 1) output[y * width + x] = d[x];
  }

  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) f[y] = output[y * width + x];
    edt1d(f, d, v, z, height);
    for (let y = 0; y < height; y += 1) output[y * width + x] = Math.sqrt(d[y]);
  }

  return output;
}

function edt1d(
  f: Float64Array,
  d: Float64Array,
  v: Int32Array,
  z: Float64Array,
  n: number,
): void {
  let k = 0;
  v[0] = 0;
  z[0] = Number.NEGATIVE_INFINITY;
  z[1] = Number.POSITIVE_INFINITY;

  for (let q = 1; q < n; q += 1) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k -= 1;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k += 1;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Number.POSITIVE_INFINITY;
  }

  k = 0;
  for (let q = 0; q < n; q += 1) {
    while (z[k + 1] < q) k += 1;
    const distance = q - v[k];
    d[q] = distance * distance + f[v[k]];
  }
}
