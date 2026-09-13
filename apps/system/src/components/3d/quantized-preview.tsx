import { useEffect, useRef } from "react";

import { TRANSPARENT_INDEX, type QuantizedImage } from "@/lib/3d/quantize";

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

type QuantizedPreviewProps = {
  quantized: QuantizedImage;
  colors: RgbColor[];
  className?: string;
};

export function QuantizedPreview({
  quantized,
  colors,
  className,
}: QuantizedPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width, height, indices } = quantized;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return;

    const imageData = context.createImageData(width, height);
    const pixels = imageData.data;

    for (let index = 0; index < indices.length; index += 1) {
      const paletteIndex = indices[index];
      const offset = index * 4;
      const color = colors[paletteIndex];

      if (paletteIndex === TRANSPARENT_INDEX || !color) {
        pixels[offset + 3] = 0;
        continue;
      }

      pixels[offset] = color.r;
      pixels[offset + 1] = color.g;
      pixels[offset + 2] = color.b;
      pixels[offset + 3] = 255;
    }

    context.putImageData(imageData, 0, 0);
  }, [quantized, colors]);

  return <canvas ref={canvasRef} className={className} />;
}
