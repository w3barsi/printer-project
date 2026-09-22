import { Button } from "@dg/ui/components/button";
import { Input } from "@dg/ui/components/input";
import { Switch } from "@dg/ui/components/switch";

import { fromHex, toHex, type RgbColor } from "@/lib/3d/color";
import { BASE_LIMITS, type PaletteSwatch } from "@/lib/3d/design";
import { MAX_PALETTE_COLORS } from "@/lib/3d/quantize";

const COLOR_COUNTS = Array.from({ length: MAX_PALETTE_COLORS }, (_, index) => index + 1);

type PalettePanelProps = {
  colorCount: number;
  palette: PaletteSwatch[];
  hasImage: boolean;
  slots: number;
  flattenLayers?: boolean;
  uniformThickness: boolean;
  showColorCount?: boolean;
  emptyMessage?: string;
  onColorCountChange: (count: number) => void;
  onColorChange: (index: number, color: RgbColor) => void;
  onThicknessChange: (index: number, thickness: number) => void;
  onSlotsChange: (slots: number) => void;
  onUniformThicknessChange: (value: boolean) => void;
  disabled?: boolean;
};

export function PalettePanel({
  colorCount,
  palette,
  hasImage,
  slots,
  flattenLayers,
  uniformThickness,
  showColorCount = true,
  emptyMessage,
  onColorCountChange,
  onColorChange,
  onThicknessChange,
  onSlotsChange,
  onUniformThicknessChange,
  disabled,
}: PalettePanelProps) {
  const totalPixels = palette.reduce((total, swatch) => total + swatch.pixelCount, 0);

  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">Palette</h2>
        <p className="text-xs text-muted-foreground">
          Up to five colors. Thickness is the height of each color layer.
        </p>
      </div>

      {showColorCount ? (
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
      ) : null}

      {palette.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {emptyMessage ??
            (hasImage
              ? "This image has no opaque pixels."
              : "Upload a PNG or SVG to generate a palette.")}
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Uniform thickness</span>
            <Switch
              size="sm"
              checked={uniformThickness}
              disabled={disabled}
              onCheckedChange={onUniformThicknessChange}
            />
          </div>

          {uniformThickness ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Layer thickness</span>
              <label className="flex items-center gap-1">
                <Input
                  type="number"
                  value={palette[0]?.thickness ?? 0}
                  min={BASE_LIMITS.layerThicknessMm.min}
                  max={BASE_LIMITS.layerThicknessMm.max}
                  step={BASE_LIMITS.layerThicknessMm.step}
                  disabled={disabled || flattenLayers}
                  onChange={(event) => onThicknessChange(0, Number(event.target.value))}
                  aria-label="Layer thickness"
                  className="h-7 w-16 text-xs"
                />
                <span className="text-xs text-muted-foreground">mm</span>
              </label>
            </div>
          ) : null}

          <ul className="flex flex-col gap-2.5">
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
                {uniformThickness ? null : (
                  <label className="flex shrink-0 items-center gap-1">
                    <Input
                      type="number"
                      value={swatch.thickness}
                      min={BASE_LIMITS.layerThicknessMm.min}
                      max={BASE_LIMITS.layerThicknessMm.max}
                      step={BASE_LIMITS.layerThicknessMm.step}
                      disabled={disabled || flattenLayers}
                      onChange={(event) =>
                        onThicknessChange(index, Number(event.target.value))
                      }
                      aria-label={`Color ${index + 1} thickness`}
                      className="h-7 w-16 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">mm</span>
                  </label>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            {flattenLayers
              ? "Face-down mode flattens every layer to the base height."
              : "Set a layer to 0 mm to hide that color."}
          </p>
          {palette.length < colorCount ? (
            <p className="text-xs text-muted-foreground">
              The image only has {palette.length} distinct{" "}
              {palette.length === 1 ? "color" : "colors"}.
            </p>
          ) : null}
        </>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">AMS slots</span>
        <Input
          type="number"
          value={slots}
          min={1}
          max={8}
          onChange={(event) => onSlotsChange(Number(event.target.value))}
          aria-label="AMS slots"
          className="h-7 w-16 text-xs"
        />
      </div>
    </section>
  );
}
