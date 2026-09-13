export const MAX_IMAGE_DIMENSION = 1024;
export const ALPHA_THRESHOLD = 128;

export type DecodedPng = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  transparentPixels: number;
};

export async function decodePng(file: File): Promise<DecodedPng> {
  if (file.type && file.type !== "image/png") {
    throw new Error("Only PNG files are supported.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Canvas 2D is not available.");

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);

    const { data } = context.getImageData(0, 0, width, height);
    let transparentPixels = 0;
    for (let offset = 3; offset < data.length; offset += 4) {
      if (data[offset] < ALPHA_THRESHOLD) transparentPixels += 1;
    }

    return { width, height, data, transparentPixels };
  } finally {
    bitmap.close();
  }
}
