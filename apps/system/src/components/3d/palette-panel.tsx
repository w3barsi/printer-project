import { Button } from "@dg/ui/components/button";

import type { PaletteSwatch } from "@/lib/3d/design";
import { MAX_PALETTE_COLORS } from "@/lib/3d/quantize";

const COLOR_COUNTS = Array.from({ length: MAX_PALETTE_COLORS }, (_, index) => index + 1);

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

type PalettePanelProps = {
  colorCount: number;
  palette: PaletteSwatch[];
  hasImage: boolean;
  onColorCountChange: (count: number) => void;
  onColorChange: (index: number, color: RgbColor) => void;
  disabled?: boolean;
};

function toHex({ r, g, b }: RgbColor): string {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function fromHex(hex: string): RgbColor {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

export function PalettePanel({
  colorCount,
  palette,
  hasImage,
  onColorCountChange,
  onColorChange,
  disabled,
}: PalettePanelProps) {
  const totalPixels = palette.reduce((total, swatch) => total + swatch.pixelCount, 0);

  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">Palette</h2>
        <p className="text-xs text-muted-foreground">
          Up to five colors. Changing the count re-quantizes the image.
        </p>
      </div>

      <div className="flex gap-1" role="group" aria-label="Number of colors">
        {COLOR_COUNTS.map((count) => (
          <Button
            key={count}
            type="button"
            size="sm"
            variant={count === colorCount ? "default" : "outline"}
            className="flex-1"
            disabled={disabled}
            onClick={() => onColorCountChange(count)}
          >
            {count}
          </Button>
        ))}
      </div>

      {palette.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {hasImage
            ? "This image has no opaque pixels."
            : "Upload a PNG to generate a palette."}
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {palette.map((swatch, index) => (
              <li key={swatch.id} className="flex items-center gap-3">
                <input
                  type="color"
                  value={toHex(swatch)}
                  onChange={(event) => onColorChange(index, fromHex(event.target.value))}
                  aria-label={`Color ${index + 1}`}
                  className="size-7 shrink-0 cursor-pointer rounded border bg-transparent p-0.5"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-mono text-xs uppercase">{toHex(swatch)}</span>
                  <span className="text-xs text-muted-foreground">
                    {totalPixels > 0
                      ? Math.round((swatch.pixelCount / totalPixels) * 100)
                      : 0}
                    % of image
                  </span>
                </div>
              </li>
            ))}
          </ul>
          {palette.length < colorCount ? (
            <p className="text-xs text-muted-foreground">
              The image only has {palette.length} distinct{" "}
              {palette.length === 1 ? "color" : "colors"}.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
