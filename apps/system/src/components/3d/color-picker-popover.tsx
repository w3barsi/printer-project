import { Button } from "@dg/ui-coss/components/button";
import {
  ColorPicker,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from "@dg/ui-coss/components/legacy/color-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@dg/ui-coss/components/popover";
import { cn } from "@dg/ui-coss/lib/utils";
import { useCallback } from "react";

import { toHex, type RgbColor } from "@/lib/3d/color";

type ColorPickerPreset = {
  label: string;
  color: RgbColor;
};

type ColorPickerPopoverProps = {
  label: string;
  value: RgbColor;
  usedColors: RgbColor[];
  presets?: ColorPickerPreset[];
  onChange: (color: RgbColor) => void;
  disabled?: boolean;
};

export function ColorPickerPopover({
  label,
  value,
  usedColors,
  presets,
  onChange,
  disabled,
}: ColorPickerPopoverProps) {
  const hex = toHex(value);

  // Stable identity keeps the picker's change effect from re-firing every render.
  const handleChange = useCallback(
    ([red, green, blue]: [number, number, number, number]) => {
      onChange({
        r: Math.round(red),
        g: Math.round(green),
        b: Math.round(blue),
      });
    },
    [onChange],
  );

  const seen = new Set<string>();
  const uniqueUsedColors = usedColors.filter((color) => {
    const colorHex = toHex(color);
    if (seen.has(colorHex)) return false;
    seen.add(colorHex);
    return true;
  });

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={disabled}
            title={label}
            aria-label={label}
            className="size-7 p-1"
          />
        }
      >
        <span
          className="size-full rounded-xs border border-black/10"
          style={{ backgroundColor: hex }}
        />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        {presets && presets.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">Recommended</span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <ColorSwatch
                  key={preset.label}
                  color={preset.color}
                  label={preset.label}
                  selected={toHex(preset.color) === hex}
                  onSelect={onChange}
                />
              ))}
            </div>
          </div>
        ) : null}
        {uniqueUsedColors.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">Used in this project</span>
            <div className="flex flex-wrap gap-1.5">
              {uniqueUsedColors.map((color) => {
                const swatchHex = toHex(color);
                return (
                  <ColorSwatch
                    key={swatchHex}
                    color={color}
                    label={`Use ${swatchHex}`}
                    selected={swatchHex === hex}
                    onSelect={onChange}
                  />
                );
              })}
            </div>
          </div>
        ) : null}
        <ColorPicker className="gap-3" value={hex} onChange={handleChange}>
          <ColorPickerSelection className="h-36 rounded-md" />
          <ColorPickerHue />
          <div className="flex items-center gap-2">
            <ColorPickerEyeDropper size="icon-sm" />
            <ColorPickerOutput />
            <ColorPickerFormat />
          </div>
        </ColorPicker>
      </PopoverContent>
    </Popover>
  );
}

function ColorSwatch({
  color,
  label,
  selected,
  onSelect,
}: {
  color: RgbColor;
  label: string;
  selected: boolean;
  onSelect: (color: RgbColor) => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        "size-6 cursor-pointer rounded border",
        selected && "ring-2 ring-ring ring-offset-1 ring-offset-popover",
      )}
      style={{ backgroundColor: toHex(color) }}
      onClick={() => onSelect(color)}
    />
  );
}
