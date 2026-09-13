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
): CleanupResult {
  const { width, height } = quantized;
  const indices = new Uint8Array(quantized.indices);
  const minAreaPixels = MIN_REGION_AREA_MM2 / (mmPerPixel * mmPerPixel);
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
