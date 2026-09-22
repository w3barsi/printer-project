import { toHex, type RgbColor } from "./color";
import { TRANSPARENT_INDEX } from "./quantize";

export type ModelWarning = {
  id: string;
  message: string;
};

/**
 * Conservative estimate of a colour region's minimum width: 2 × area / perimeter.
 * Flags colours with any component narrower than minWidthMm.
 */
export function detectThinColors(
  indices: Uint8Array,
  width: number,
  height: number,
  mmPerPixel: number,
  minWidthMm = 0.8,
): number[] {
  const minWidthPx = minWidthMm / mmPerPixel;
  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  const stack: number[] = [];
  const component: number[] = [];
  const thin = new Set<number>();

  for (let start = 0; start < pixelCount; start += 1) {
    if (visited[start] || indices[start] === TRANSPARENT_INDEX) continue;

    const colorIndex = indices[start];
    component.length = 0;
    stack.length = 0;
    stack.push(start);
    visited[start] = 1;
    let boundaryEdges = 0;

    while (stack.length > 0) {
      const pixel = stack.pop();
      if (pixel === undefined) break;
      component.push(pixel);
      const x = pixel % width;
      const y = (pixel - x) / width;

      if (x === 0) boundaryEdges += 1;
      else if (indices[pixel - 1] !== colorIndex) boundaryEdges += 1;
      else if (!visited[pixel - 1]) {
        visited[pixel - 1] = 1;
        stack.push(pixel - 1);
      }

      if (x === width - 1) boundaryEdges += 1;
      else if (indices[pixel + 1] !== colorIndex) boundaryEdges += 1;
      else if (!visited[pixel + 1]) {
        visited[pixel + 1] = 1;
        stack.push(pixel + 1);
      }

      if (y === 0) boundaryEdges += 1;
      else if (indices[pixel - width] !== colorIndex) boundaryEdges += 1;
      else if (!visited[pixel - width]) {
        visited[pixel - width] = 1;
        stack.push(pixel - width);
      }

      if (y === height - 1) boundaryEdges += 1;
      else if (indices[pixel + width] !== colorIndex) boundaryEdges += 1;
      else if (!visited[pixel + width]) {
        visited[pixel + width] = 1;
        stack.push(pixel + width);
      }
    }

    if (component.length === 0 || boundaryEdges === 0) continue;
    const estimatedWidthPx = (2 * component.length) / boundaryEdges;
    if (estimatedWidthPx < minWidthPx) thin.add(colorIndex);
  }

  return [...thin];
}

export function buildWarnings(input: {
  hasTransparency: boolean;
  thinColorIndexes: number[];
  palette: RgbColor[];
  specksMerged: number;
  filamentCount: number;
  slots: number;
}): ModelWarning[] {
  const warnings: ModelWarning[] = [];

  if (!input.hasTransparency) {
    warnings.push({
      id: "opaque-background",
      message: "This image has no transparency, so its background becomes a color layer.",
    });
  }

  for (const index of input.thinColorIndexes) {
    const color = input.palette[index];
    if (!color) continue;
    warnings.push({
      id: `thin-${index}`,
      message: `Color ${index + 1} (${toHex(color)}) has details thinner than 0.8 mm.`,
    });
  }

  if (input.specksMerged > 0) {
    warnings.push({
      id: "specks",
      message: `Cleaned up ${input.specksMerged} speck${input.specksMerged === 1 ? "" : "s"} smaller than 1 mm².`,
    });
  }

  if (input.filamentCount > input.slots) {
    warnings.push({
      id: "slots",
      message: `This design uses ${input.filamentCount} filaments but only ${input.slots} AMS slots are set.`,
    });
  }

  return warnings;
}
