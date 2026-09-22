import type { ImageQuality } from "./design";

export const IMAGE_DIMENSIONS: Record<ImageQuality, number> = {
  standard: 1024,
  high: 2048,
};

export type DecodedImage = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export function drawToGrid(
  drawable: CanvasImageSource,
  width: number,
  height: number,
): DecodedImage {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D is not available.");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(drawable, 0, 0, width, height);

  const { data } = context.getImageData(0, 0, width, height);
  return { width, height, data };
}

export async function decodePng(file: File, maxDimension: number): Promise<DecodedImage> {
  if (file.type && file.type !== "image/png") {
    throw new Error("Only PNG files are supported.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    return drawToGrid(bitmap, width, height);
  } finally {
    bitmap.close();
  }
}
